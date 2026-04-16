import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, sessionmaker, DeclarativeBase, relationship
from sqlalchemy.inspection import inspect
from typing import List, Optional, Any, Dict
from datetime import datetime

engine = sa.create_engine("sqlite:///network.db", echo=False)
Session = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    def to_dict(self) -> Dict[str, Any]:
        return {c.key: getattr(self, c.key) for c in inspect(self).mapper.column_attrs}

class Router(Base):
    __tablename__ = "router_info"
    id: Mapped[int] = mapped_column(primary_key=True)
    mac_address: Mapped[str] = mapped_column(unique=True)
    ip_address: Mapped[str] = mapped_column(default="192.168.0.133")
    dns_server: Mapped[Optional[str]] = mapped_column()
    admin_login: Mapped[str] = mapped_column(default="admin")
    admin_password: Mapped[str] = mapped_column(default="admin")
    
    clients: Mapped[List["Client"]] = relationship(back_populates="router")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="router")

class Client(Base):
    __tablename__ = "clients"
    id: Mapped[int] = mapped_column(primary_key=True)
    mac: Mapped[str] = mapped_column(unique=True, index=True)
    ip: Mapped[str] = mapped_column()
    hostname: Mapped[Optional[str]] = mapped_column()
    status: Mapped[str] = mapped_column()
    
    router_id: Mapped[int] = mapped_column(sa.ForeignKey("router_info.id"))
    router: Mapped["Router"] = relationship(back_populates="clients")

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    uuid: Mapped[str] = mapped_column(unique=True, index=True)
    role: Mapped[str] = mapped_column(default="guest")
    first_seen: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    type: Mapped[str] = mapped_column()
    severity: Mapped[str] = mapped_column()
    src_ip: Mapped[Optional[str]] = mapped_column()
    dst_ip: Mapped[Optional[str]] = mapped_column()
    description: Mapped[str] = mapped_column()
    
    router_id: Mapped[int] = mapped_column(sa.ForeignKey("router_info.id"), default=1)
    router: Mapped["Router"] = relationship(back_populates="alerts")

class Rule(Base):
    __tablename__ = "rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    type: Mapped[str] = mapped_column()
    severity: Mapped[str] = mapped_column(default="medium")
    description: Mapped[str] = mapped_column(default="")
    pattern: Mapped[str] = mapped_column()
    is_enabled: Mapped[bool] = mapped_column(default=True)

def init_db():
    Base.metadata.create_all(engine)

def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    with Session() as session:
        u = session.execute(sa.select(User).filter_by(uuid=user_id)).scalar_one_or_none()
        return u.to_dict() if u else None

def create_user(user_id: str, role: str = "guest") -> Dict[str, Any]:
    with Session() as session:
        new_user = User(uuid=user_id, role=role)
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return new_user.to_dict()
    
def add_client(mac: str, ip: str, hostname: Optional[str], status: str) -> tuple[Client, Dict[str, Any]]:
    with Session() as session:
        new_client = Client(mac=mac, ip=ip, hostname=hostname, status=status, router_id=1)
        session.add(new_client)
        session.commit()
        session.refresh(new_client)
        return new_client, new_client.to_dict()

def get_clients() -> List[Dict[str, Any]]:
    with Session() as session:
        clients = session.execute(sa.select(Client)).scalars().all()
        return [c.to_dict() for c in clients]

def get_all_rules() -> List[Dict[str, Any]]:
    with Session() as session:
        rules = session.execute(sa.select(Rule)).scalars().all()
        return [r.to_dict() for r in rules]

def add_rule(rule_data: Dict[str, Any]) -> Dict[str, Any]:
    with Session() as session:
        new_rule = Rule(
            name=rule_data.get("name"),
            type=rule_data.get("type"),
            severity=rule_data.get("severity", "medium"),
            description=rule_data.get("description", ""),
            pattern=rule_data.get("pattern"),
            is_enabled=rule_data.get("is_enabled", True)
        )
        session.add(new_rule)
        session.commit()
        session.refresh(new_rule)
        return new_rule.to_dict()

def delete_rule(rule_id: int):
    with Session() as session:
        rule = session.get(Rule, rule_id)
        if rule:
            session.delete(rule)
            session.commit()

def get_all_alerts() -> List[Dict[str, Any]]:
    with Session() as session:
        alerts = session.execute(sa.select(Alert).order_by(Alert.timestamp.desc())).scalars().all()
        return [a.to_dict() for a in alerts]

def add_alert(alert_data: Dict[str, Any]):
    with Session() as session:
        new_alert = Alert(
            type=alert_data.get("type"),
            severity=alert_data.get("severity"),
            src_ip=alert_data.get("src_ip"),
            dst_ip=alert_data.get("dst_ip"),
            description=alert_data.get("description"),
            router_id=1
        )
        session.add(new_alert)
        session.commit()
        return new_alert.to_dict()