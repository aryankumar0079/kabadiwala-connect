from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.database.base import Base


class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    email = Column(String(150), unique=True, nullable=True)

    mobile = Column(String(15), unique=True, nullable=False)

    password_hash = Column(String(255), nullable=False)

    role = Column(String(20), nullable=False)

    status = Column(
        String(20),
        default="active",
        nullable=False
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )