from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func

from app.database.base import Base


class MaterialLot(Base):

    __tablename__ = "material_lots"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    lot_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    collector_id = Column(
        Integer,
        nullable=False
    )

    material_category = Column(
        String(100),
        nullable=False
    )

    material_sub_category = Column(
        String(100),
        nullable=True
    )

    material_description = Column(
        String(255),
        nullable=True
    )

    image_path = Column(
        String(255),
        nullable=True
    )

    approximate_weight = Column(
        Float,
        nullable=False
    )

    condition = Column(
        String(100),
        nullable=True
    )

    source_type = Column(
        String(100),
        nullable=True
    )

    location = Column(
        String(100),
        nullable=False
    )

    price_per_kg = Column(
        Float,
        nullable=True
    )

    estimated_value = Column(
        Float,
        nullable=True
    )

    status = Column(
        String(50),
        default="created"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )