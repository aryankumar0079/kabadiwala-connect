from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Boolean,
    Text
)

from sqlalchemy.sql import func

from app.database.base import Base


# ============================================================
# SALE REQUEST RECIPIENT
# ============================================================
# Keeps track of which recyclers received a collector's
# sale request.
#
# Example:
#
# Sale Request #10
#     ├── Recycler #1 -> notified
#     ├── Recycler #4 -> notified
#     └── Recycler #7 -> notified
#
# This is NOT the offer itself.
# ============================================================

class SaleRequestRecipient(Base):

    __tablename__ = "sale_request_recipients"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    sale_request_id = Column(
        Integer,
        ForeignKey("sale_requests.id"),
        nullable=False,
        index=True
    )

    recycler_id = Column(
        Integer,
        ForeignKey("recyclers.id"),
        nullable=False,
        index=True
    )

    # Distance between collector and this recycler
    # when the request was sent.
    distance_km = Column(
        Float,
        nullable=True
    )

    # Indicates that notification/request was generated
    # for this recycler.
    notified = Column(
        Boolean,
        default=False,
        nullable=False
    )

    notified_at = Column(
        DateTime,
        nullable=True
    )

    # Request state for this particular recycler.
    #
    # pending
    # notified
    # viewed
    # responded
    # expired
    # rejected
    #
    status = Column(
        String(30),
        default="pending",
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


# ============================================================
# RECYCLER OFFER
# ============================================================
# Stores the actual price offered by a recycler for a
# particular sale request.
# ============================================================

class RecyclerOffer(Base):

    __tablename__ = "recycler_offers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    sale_request_id = Column(
        Integer,
        ForeignKey("sale_requests.id"),
        nullable=False,
        index=True
    )

    recycler_id = Column(
        Integer,
        ForeignKey("recyclers.id"),
        nullable=False,
        index=True
    )

    # Price offered per kg.
    offered_price_per_kg = Column(
        Float,
        nullable=False
    )

    # Total amount offered for the lot.
    total_offer_amount = Column(
        Float,
        nullable=True
    )

    message = Column(
        Text,
        nullable=True
    )

    # pending
    # accepted
    # rejected
    # withdrawn
    # expired
    status = Column(
        String(30),
        default="pending",
        nullable=False,
        index=True
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