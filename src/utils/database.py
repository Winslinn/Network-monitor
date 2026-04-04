import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, sessionmaker, DeclarativeBase, relationship
from typing import List, Optional, Any, Dict
from datetime import datetime

engine = sa.create_engine("sqlite:///network.db", echo=False)
Session = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    def to_dict(self) -> Dict[str, Any]:
        return {field.name: getattr(self, field.name) for field in self.__table__.columns}

    def __repr__(self) -> str:
        fields = ", ".join(f"{k}={v!r}" for k, v in self.to_dict().items())
        return f"<{self.__class__.__name__}({fields})>"

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

    router_id: Mapped[int] = mapped_column(sa.ForeignKey("router_info.id"))
    router: Mapped["Router"] = relationship(back_populates="alerts")

class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    type: Mapped[str] = mapped_column()
    severity: Mapped[str] = mapped_column(default="medium")
    description: Mapped[str] = mapped_column()
    pattern: Mapped[str] = mapped_column()
    is_enabled: Mapped[bool] = mapped_column(default=True)


def add_client(mac: str, ip: str, hostname: str, status: str):
    with Session() as session:
        client = session.execute(sa.select(Client).filter_by(mac=mac)).scalar_one_or_none()
        
        if client:
            client.ip = ip
            client.hostname = hostname
            client.status = status
        else:
            client = Client(mac=mac, ip=ip, hostname=hostname, status=status, router_id=1)
            session.add(client)

        session.commit()
        session.refresh(client)
        return client.to_dict()

def get_all_rules():
    with Session() as session:
        rules = session.execute(sa.select(Rule)).scalars().all()
        return [r.to_dict() for r in rules]

def add_alert(alert_type: str, severity: str, src_ip: str, dst_ip: str, description: str):
    with Session() as session:
        alert = Alert(
            type=alert_type, 
            severity=severity, 
            src_ip=src_ip, 
            dst_ip=dst_ip, 
            description=description, 
            router_id=1
        )
        session.add(alert)
        session.commit()
        return alert.to_dict()

def session():
    return Session()

def init_db():
    Base.metadata.create_all(engine)