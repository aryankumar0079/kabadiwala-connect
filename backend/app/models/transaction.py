from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from app.database.base import Base


class MaterialTransaction(Base):
    __tablename__ = "material_transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    lot_id = Column(
        String(50),
        nullable=False,
        index=True
    )

    collector_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    recycler_id = Column(
        Integer,
        ForeignKey("recyclers.id"),
        nullable=True,
        index=True
    )

    transaction_type = Column(
        String(50),
        nullable=False,
        index=True
    )

    status = Column(
        String(50),
        nullable=False,
        index=True
    )

    quantity_kg = Column(
        Float,
        nullable=True
    )

    price_per_kg = Column(
        Float,
        nullable=True
    )

    total_amount = Column(
        Float,
        nullable=True
    )

    qr_code = Column(
        String(255),
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )
    