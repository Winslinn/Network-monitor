import asyncio, yaml

from os import getenv
from pysnmp.hlapi.v3arch.asyncio import *

PROJECT_ROOT = getenv("PROJECT_ROOT")

with open(f'{PROJECT_ROOT}/config.yaml', 'r') as f:
    config = yaml.load(f, Loader=yaml.FullLoader)

snmpEngine = SnmpEngine()
host = config['router']['ip']

async def snmp_get(oid, community='NetWatch'):
    errorIndication, errorStatus, errorIndex, varBinds = await get_cmd(
        snmpEngine,
        CommunityData(community, mpModel=1),
        await UdpTransportTarget.create((host, 161)),
        ContextData(),
        ObjectType(ObjectIdentity(oid))
    )
    
    if errorIndication:
        raise RuntimeError(f"Error: {errorIndication}")
    
    for varBind in varBinds:
        return varBind[1].prettyPrint()
    
async def snmp_walk(oid, community='NetWatch', port=161):
    results = []
    current_oid = ObjectType(ObjectIdentity(oid))
    
    while True:
        try:
            errorIndication, errorStatus, errorIndex, varBinds = await asyncio.wait_for(
                next_cmd(
                    snmpEngine,
                    CommunityData(community, mpModel=1),
                    await UdpTransportTarget.create((host, port), timeout=1, retries=1),
                    ContextData(),
                    current_oid,
                    lexicographicMode=False
                ),
                timeout=1.5
            )
        except asyncio.TimeoutError:
            break
        
        if errorIndication or errorStatus or not varBinds:
            break
            
        varBind = varBinds[0]
        if not ObjectIdentity(oid).isPrefixOf(varBind[0]):
            break
            
        results.append((str(varBind[0]), int(varBind[1])))
        current_oid = ObjectType(ObjectIdentity(varBind[0]))
        
    return results

def close_snmp():
    snmpEngine.closeDispatcher()