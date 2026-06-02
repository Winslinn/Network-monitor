import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, sessionmaker, DeclarativeBase, relationship
from sqlalchemy.inspection import inspect
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
import hashlib

engine = sa.create_engine("sqlite:///network.db", echo=False)
Session = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    def to_dict(self) -> Dict[str, Any]:
        return {c.key: getattr(self, c.key) for c in inspect(self).mapper.column_attrs}

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

role_user = sa.Table(
    "role_user",
    Base.metadata,
    sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), primary_key=True),
    sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id"), primary_key=True),
)

permission_role = sa.Table(
    "permission_role",
    Base.metadata,
    sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id"), primary_key=True),
    sa.Column("permission_id", sa.Integer, sa.ForeignKey("permissions.id"), primary_key=True),
)

class Router(Base):
    __tablename__ = "router_info"
    id: Mapped[int] = mapped_column(primary_key=True)
    mac_address: Mapped[str] = mapped_column(unique=True)
    ip_address: Mapped[str] = mapped_column()
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

class Permission(Base):
    __tablename__ = "permissions"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    description: Mapped[Optional[str]] = mapped_column()

class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    
    permissions: Mapped[List["Permission"]] = relationship(secondary=permission_role, backref="roles")

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True, index=True)
    pwrd: Mapped[str] = mapped_column()
    first_seen: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    
    roles: Mapped[List["Role"]] = relationship(secondary=role_user, backref="users")

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
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
    with Session() as session:
        # Create default permissions
        permissions_list = [
            ("rules:view", "Permission to view rules"),
            ("rules:edit", "Permission to add or delete rules"),
            ("alerts:view", "Permission to view alerts history"),
            ("dashboard:view", "Permission to view dashboard and clients"),
        ]
        
        db_permissions = {}
        for p_name, p_desc in permissions_list:
            perm = session.execute(sa.select(Permission).filter_by(name=p_name)).scalar_one_or_none()
            if not perm:
                perm = Permission(name=p_name, description=p_desc)
                session.add(perm)
            db_permissions[p_name] = perm
        
        session.commit()

        # Ensure admin and analyst roles exist
        admin_role = session.execute(sa.select(Role).filter_by(name="admin")).scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name="admin")
            session.add(admin_role)
        
        analyst_role = session.execute(sa.select(Role).filter_by(name="analyst")).scalar_one_or_none()
        if not analyst_role:
            analyst_role = Role(name="analyst")
            session.add(analyst_role)
        
        session.commit()

        # Assign permissions to roles
        # Admin gets everything
        for perm in db_permissions.values():
            if perm not in admin_role.permissions:
                admin_role.permissions.append(perm)
        
        # Analyst gets viewing permissions
        for p_name in ["rules:view", "alerts:view", "dashboard:view"]:
            if db_permissions[p_name] not in analyst_role.permissions:
                analyst_role.permissions.append(db_permissions[p_name])
        
        session.commit()

        user_count = session.query(sa.func.count(User.id)).scalar()
        if user_count == 0:
            import secrets
            import string
            
            alphabet = string.ascii_letters + string.digits
            password = ''.join(secrets.choice(alphabet) for i in range(12))
            username = "admin"
            
            new_admin = User(username=username, pwrd=hash_password(password))
            new_admin.roles.append(admin_role)
            session.add(new_admin)
            session.commit()
            
            print(" Use the following credentials to log in and change the password immediately: ")
            print(f" Username: {username}")
            print(f" Password: {password}")

def get_user(username: str) -> Optional[Dict[str, Any]]:
    with Session() as session:
        u = session.execute(sa.select(User).options(
            sa.orm.selectinload(User.roles).selectinload(Role.permissions)
        ).filter_by(username=username)).scalar_one_or_none()
        
        if not u: return None
        
        res = u.to_dict()
        res["roles"] = [r.name for r in u.roles]
        
        permissions = set()
        for r in u.roles:
            for p in r.permissions:
                permissions.add(p.name)
        res["permissions"] = list(permissions)
        
        return res

def create_user(username: str, password: str, roles: List[str] = ["guest"]) -> Dict[str, Any]:
    with Session() as session:
        new_user = User(username=username, pwrd=hash_password(password))
        for role_name in roles:
            role = session.execute(sa.select(Role).filter_by(name=role_name)).scalar_one_or_none()
            if not role:
                role = Role(name=role_name)
                session.add(role)
            new_user.roles.append(role)
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        res = new_user.to_dict()
        res["roles"] = [r.name for r in new_user.roles]
        return res
    
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