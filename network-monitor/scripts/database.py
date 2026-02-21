import sqlalchemy as sa

from sqlalchemy.orm import Mapped, mapped_column, sessionmaker, declarative_base, relationship
from typing import List

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

def session():
    return Session()

def init():
    Base.metadata.create_all(db)