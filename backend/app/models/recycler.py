from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey

from app.database.base import Base


class Recycler(Base):

    __tablename__ = "recyclers"

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

    facility_name = Column(
        String(150),
        nullable=False
    )

    facility_location = Column(
        String(200),
        nullable=False
    )

    contact_number = Column(
        String(15),
        nullable=True
    )

    pickup_available = Column(
        Boolean,
        default=False
    )

    service_area = Column(
        String(200),
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