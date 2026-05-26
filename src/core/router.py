import asyncio, yaml

from os import getenv
from librouteros import connect
from librouteros.exceptions import LibRouterosError
from utils.snmp import *
from utils.database import Session, Router, Client

PROJECT_ROOT = getenv('PROJECT_ROOT')

with open(f'{PROJECT_ROOT}/config.yaml', 'r') as f:
    config = yaml.load(f, Loader=yaml.FullLoader)

class RouterManager:
    def __init__(self):
        self.connection = connect(
            host=config['router']['ip'],
            username='admin',
            password='admin',
            timeout=10
        )
        self.data = {}
        
        self._providers = {
            'arp': self._fetch_arp,
            'interfaces': self._fetch_interfaces,
            'network_info': self._fetch_network_info,
            'router_db': self._fetch_router_db,
            'dhcp': self._fetch_dhcp
        }
        
    def _get_connection(self):
        if self.connection is None:
            self.connection = connect(
                host=self.host,
                username=self.username,
                password=self.password,
                timeout=self.timeout
            )
        return self.connection

    def reset_connection(self):
        self.connection = None
        
    def _fetch_arp(self):
        self.data['arp'] = list(
            self.connection.path('ip', 'arp')
            .select('address', 'mac-address', 'interface', 'status')
        )
    
    def _fetch_dhcp(self):
        self.data['dhcp'] = list(
            self.connection.path('ip', 'dhcp-server', 'lease')
            .select('address', 'mac-address', 'host-name', 'status')
        )

    def _fetch_interfaces(self):
        self.data['interfaces'] = list(
            self.connection.path('interface')
            .select('name', 'type')
        )
        self.data.setdefault('prev_rx_bytes', 0)
        self.data.setdefault('prev_tx_bytes', 0)

    def _fetch_network_info(self):
        ethernet = self.connection.path('interface', 'ethernet')
        addresses = list(self.connection.path('ip', 'address').select('address'))
        
        self.data['wan_address'] = addresses[1]['address']
        self.data['lan_address'] = addresses[0]['address']
            
        ethernet_select = list(ethernet.select('mac-address'))
        if ethernet_select:
            self.data['mac_address'] = ethernet_select[0]['mac-address']

    def _fetch_router_db(self):
        if 'mac_address' not in self.data or 'lan_address' not in self.data:
            self._fetch_network_info()
            
        with Session() as session:
            router = session.query(Router).first()
            if not router:
                router = Router(
                    mac_address=self.data['mac_address'], 
                    ip_address=self.data['lan_address']
                )
                session.add(router)
            else:
                router.mac_address = self.data['mac_address']
                router.ip_address = self.data['lan_address']
            session.commit()

    def fetch_data(self, targets=None, exception=False):
        if targets is None or targets == 'all':
            targets = set(self._providers.keys())
        elif isinstance(targets, str):
            targets = {targets}
        else:
            targets = set(targets)

        try:
            strategies = self._providers.keys()
            
            if exception:
                targets = strategies - targets
            
            for target in targets:
                provider = self._providers.get(target)
                if provider:
                    provider()
                    
        except (LibRouterosError, Exception) as e:
            print(f'Error fetching data from router (providers_target={targets}, problematic provider={provider}) : {e}')
        

router_manager = RouterManager()
router_lock = asyncio.Lock()

import asyncio

async def check_active_clients(manager):
    while True:
        async with router_lock:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None, 
                lambda: router_manager.fetch_data({'arp', 'dhcp'}
                )
            )

        arp_entries = router_manager.data.get('arp', [])
        dhcp_clients = router_manager.data.get('dhcp', [])

        arp_map = {
            entry['mac-address']: 
                entry.get('status') for entry in arp_entries if 'mac-address' in entry}

        with Session() as session:
            db_clients = session.query(Client).all()
            clients_map = {c.mac: c for c in db_clients}

            for lease in dhcp_clients:
                mac = lease.get('mac-address')
                    
                dhcp_status = lease.get('status')
                arp_status = arp_map.get(mac)
                if dhcp_status == 'bound' and arp_status in ['reachable', 'delay', 'stale']:
                    status = 'active'
                else:
                    status = 'expired'

                client = clients_map.get(mac)
                if client:
                    if client.status != status or client.ip != lease.get('address'):
                        client.status = status
                        client.ip = lease.get('address')
                        client.hostname = lease.get('host-name')
                        await manager.broadcast({
                                "context": "dhcp", 
                                "client_id": client.id, 
                                "data": client.to_dict()
                            }
                        )
                else:
                    if dhcp_status == 'bound':
                        new_client = Client(
                        mac=mac, 
                        ip=lease.get('address'), 
                        hostname=lease.get('host-name'), 
                        status=status, 
                        router_id=1
                    )
                    session.add(new_client)
                    await manager.broadcast({
                        "context": "dhcp", 
                        "client_id": new_client.id, 
                        "data": new_client.to_dict()})
            session.commit()
        await asyncio.sleep(30)
    
async def init(manager):
    device_name = await snmp_get('.1.3.6.1.4.1.14988.1.1.7.8.0')
    
    router_manager.data['device_name'] = str(device_name)
    async with router_lock:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, lambda: router_manager.fetch_data({'arp', 'dhcp'}, exception=True
            )
        )
    
    asyncio.create_task(check_active_clients(manager))
    
    cpu_oids = []
    cpu_oid = '.1.3.6.1.2.1.25.3.3.1.2'
    current_index = 1
    while True:
        target_oid = f'{cpu_oid}.{current_index}'
        try:
            res = await snmp_get(target_oid)
            if res is not None and str(res).isdigit():
                cpu_oids.append(target_oid)
                current_index += 1
            else:
                break
        except Exception:
            break
    
    data_ = router_manager.data
    while True:
        uptime = int(await snmp_get('.1.3.6.1.2.1.1.3.0')) // 100
        hours, remainder = divmod(uptime, 3600)
        minutes, seconds = divmod(remainder, 60)
        data_['uptime'] = f'{hours:02}:{minutes:02}:{seconds:02}'
        
        tasks = [snmp_get(oid) for oid in cpu_oids]
        data_['cpu_load'] = await asyncio.gather(*tasks, return_exceptions=True)
        
        used_memory = int(await snmp_get('.1.3.6.1.2.1.25.2.3.1.6.65536')) // 1024
        total_memory = int(await snmp_get('.1.3.6.1.2.1.25.2.3.1.5.65536')) // 1024
        ram_percentage = int(used_memory / total_memory * 100) if total_memory > 0 else 0

        download_speed = '0.00 Mbps'
        upload_speed = '0.00 Mbps'
        
        all_interfaces = []
        try:
            async with router_lock:
                all_interfaces = await asyncio.to_thread(
                    lambda: list(
                        router_manager._get_connection().path('interface').select(
                            'name', 'type', 'rx-byte', 'tx-byte'
                        )
                    )
                )
        except Exception as e:
            print(f"Error fetching interface speeds: {e}")
            router_manager.reset_connection()
        
        stats = next((item for item in all_interfaces if item.get('type') == 'bridge'), None)
        if stats:
            curr_in = int(stats.get('rx-byte'))
            curr_out = int(stats.get('tx-byte'))
            
            prev_in = data_.get('prev_rx_bytes')
            prev_out = data_.get('prev_tx_bytes')
            
            download_speed = f'{((curr_out - prev_out) * 8) / 1_000_000:.3f} Mbps'
            upload_speed = f'{((curr_in - prev_in) * 8) / 1_000_000:.3f} Mbps'
                
            data_['prev_rx_bytes'] = curr_in
            data_['prev_tx_bytes'] = curr_out

        stats_payload = {
            'context': 'stats',
            'cpuUsage': data_['cpu_load'],
            'ramUsage': ram_percentage,
            'downloadSpeed': download_speed,
            'uploadSpeed': upload_speed,
            'uptime': data_['uptime']
        }
        
        await manager.broadcast(stats_payload)
        await asyncio.sleep(1)