from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database.base import Base


class Price(Base):

    __tablename__ = "prices"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )
    recycler_id = Column(
    Integer,
    ForeignKey("recyclers.id"),
    nullable=True,
    index=True
    )

    material_category = Column(
        String(100),
        nullable=False,
        index=True
    )

    material_sub_category = Column(
        String(100),
        nullable=True
    )

    location = Column(
        String(100),
        nullable=False,
        index=True
    )

    buying_price = Column(
        Float,
        nullable=False
    )

    selling_price = Column(
        Float,
        nullable=True
    )

    unit = Column(
        String(20),
        default="kg"
    )

    recycler_name = Column(
        String(150),
        nullable=True
    )

    offered_price = Column(
        Float,
        nullable=True
    )

    price_date = Column(
        DateTime,
        server_default=func.now()
    )