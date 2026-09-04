from sqlalchemy import Column, Integer, String, Float, ForeignKey

from app.database.base import Base


class Collector(Base):

    __tablename__ = "collectors"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    preferred_language = Column(
        String(20),
        default="Hindi"
    )

    operating_location = Column(
        String(150),
        nullable=True
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )