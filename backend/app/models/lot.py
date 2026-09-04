from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text
)
from sqlalchemy.sql import func

from app.database.base import Base


class SaleRequest(Base):
    __tablename__ = "sale_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # Existing MaterialLot primary key/reference.
    # We store the lot identifier as text because the
    # existing system uses LOT-XXXXXXXX identifiers.
    lot_id = Column(
        String(100),
        nullable=False,
        index=True
    )

    # User ID of the collector who wants to sell.
    collector_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    material_category = Column(
        String(100),
        nullable=False
    )

    material_sub_category = Column(
        String(100),
        nullable=True
    )

    weight_kg = Column(
        Float,
        nullable=False
    )

    location = Column(
        String(150),
        nullable=True
    )

    estimated_value = Column(
        Float,
        nullable=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="sale_requested",
        index=True
    )

    # How the request was initiated.
    # Examples:
    # manual, voice
    request_source = Column(
        String(30),
        nullable=False,
        default="manual"
    )

    notes = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )