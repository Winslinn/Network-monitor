import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, sessionmaker, declarative_base

db = sa.create_engine("sqlite:///network.db", echo=False)
Session = sessionmaker(bind=db)
Base = declarative_base()

