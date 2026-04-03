import sqlalchemy as sa

from sqlalchemy.orm import Mapped, mapped_column, sessionmaker, declarative_base, relationship
from typing import List
from datetime import datetime

db = sa.create_engine("sqlite:///network.db", echo=False)
Session = sessionmaker(bind=db)
Base = declarative_base()

class Router(Base):
    __tablename__ = "router_info"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mac_address: Mapped[str] = mapped_column(unique=True)
    ip_address: Mapped[str] = mapped_column(default="192.168.0.133")
    dns_server: Mapped[str]

    admin_login: Mapped[str] = mapped_column(default="admin")
    admin_password: Mapped[str] = mapped_column(default="admin")

    clients: Mapped[List["Client"]] = relationship("Client", back_populates="router")
    alerts: Mapped[List["Alerts"]] = relationship("Alerts", back_populates="router")

    def __repr__(self):
        return f"<Router(id={self.id}, mac_address='{self.mac_address}', ip_address='{self.ip_address}', dns_server='{self.dns_server}')>"

class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mac: Mapped[str] = mapped_column(unique=True)
    ip: Mapped[str]
    hostname: Mapped[str]
    status: Mapped[str]

    router_id: Mapped[int] = mapped_column(sa.ForeignKey("router_info.id"))
    router: Mapped["Router"] = relationship("Router", back_populates="clients")

    def __repr__(self):
        return f"<Client(id={self.id}, mac='{self.mac}', ip='{self.ip}', hostname='{self.hostname}', status='{self.status}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "mac": self.mac,
            "ip": self.ip,
            "hostname": self.hostname,
            "status": self.status
        }
    
class Users(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(unique=True, nullable=False)
    role: Mapped[str] = mapped_column(default="guest")
    first_seen: Mapped [datetime] = mapped_column(default=datetime.now())

    def __repr__(self):
        return f"<User(id={self.id}, uuid='{self.uuid}', role='{self.role}', first_seen='{self.first_seen}')>" 

    def to_dict(self):
        return {
            "id": self.id,
            "uuid": self.uuid,
            "role": self.role,
            "first_seen": self.first_seen
        }

class Alerts(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[str]
    type: Mapped[str]
    severity: Mapped[str]
    src_ip: Mapped[str]
    dst_ip: Mapped[str]
    description: Mapped[str]

    router_id: Mapped[int] = mapped_column(sa.ForeignKey("router_info.id"))
    router: Mapped["Router"] = relationship("Router", back_populates="alerts")

    def __repr__(self):
        return f"<Alert(id={self.id}, timestamp='{self.timestamp}', _type='{self._type}', severity='{self.severity}', src_ip='{self.src_ip}', dst_ip='{self.dst_ip}', description='{self.description}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "type": self.type,
            "severity": self.severity,
            "src_ip": self.src_ip,
            "dst_ip": self.dst_ip,
            "description": self.description
        }
    
class Rules(Base):
    __tablename__ = "rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str]
    type: Mapped[str]
    severity: Mapped[str] = mapped_column(default="medium")
    description: Mapped[str]
    pattern: Mapped[str]
    is_enabled: Mapped[bool] = mapped_column(default=True)

    def __repr__(self):
        return f"<Rule(id={self.id}, name='{self.name}', type='{self.type}', severity='{self.severity}', description='{self.description}', pattern='{self.pattern}', is_enabled={self.is_enabled})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "severity": self.severity,
            "description": self.description,
            "pattern": self.pattern,
            "is_enabled": self.is_enabled
        }

def get_clients():
    with Session() as session:
        clients = session.query(Client).all()
        return [
            {
                "mac": c.mac,
                "ip": c.ip,
                "hostname": c.hostname,
                "status": c.status
            } for c in clients
        ]

def add_client(mac: str, ip: str, hostname: str, status: str):
    with Session() as session:
        client = session.query(Client).filter_by(mac=mac).first()
        
        if client:
            client.ip = ip
            client.hostname = hostname
            client.status = status
            session.add(client)
        else:
            client = Client(mac=mac, ip=ip, hostname=hostname, status=status, router_id=1)
            session.add(client)

        session.commit()
        return client, client.to_dict()

def add_rule(name: str, type: str, severity: str, description: str, pattern: str):
    with Session() as session:
        rule = Rules(name=name, type=type, severity=severity, description=description, pattern=pattern)
        session.add(rule)
        session.commit()
        return rule, rule.to_dict()
    
def delete_rule(rule_id: int):
    with Session() as session:
        rule = session.query(Rules).filter_by(id=rule_id).first()
        if rule:
            session.delete(rule)
            session.commit()
            return True
        return False
    
def get_all_rules():
    with Session() as session:
        rules = session.query(Rules).all()
        return [r.to_dict() for r in rules]

def add_alert(timestamp: str, type: str, severity: str, src_ip: str, dst_ip: str, description: str):
    with Session() as session:
        alert = Alerts(timestamp=timestamp, type=type, severity=severity, src_ip=src_ip, dst_ip=dst_ip, description=description, router_id=1)
        session.add(alert)
        session.commit()
        return alert, alert.to_dict()
    
def get_all_alerts():
    with Session() as session:
        alerts = session.query(Alerts).all()
        return [a.to_dict() for a in alerts]

def clear_all_alerts():
    with Session() as session:
        session.query(Alerts).delete()
        session.commit()

def user(user_uuid: str):
    with Session() as session:
        _user = session.query(Users).filter_by(uuid=user_uuid).first()
        if not _user:
            _user = Users(uuid=user_uuid)
            session.add(_user)
            session.commit()
        return _user.to_dict()

def session():
    return Session()

def init():
    Base.metadata.create_all(db)