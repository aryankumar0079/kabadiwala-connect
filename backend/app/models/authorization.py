from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

from app.database.base import Base


class RecyclerAuthorization(Base):

    __tablename__ = "recycler_authorizations"

    id = Column(Integer, primary_key=True, index=True)

    recycler_id = Column(
        Integer,
        ForeignKey("recyclers.id"),
        nullable=False
    )

    registration_number = Column(
        String(100),
        nullable=False
    )

    authorization_type = Column(
        String(100),
        nullable=True
    )

    document_path = Column(
        String(255),
        nullable=True
    )

    status = Column(
        String(20),
        default="pending"
    )

    verified_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    verified_at = Column(
        DateTime,
        nullable=True
    )