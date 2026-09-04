from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db

from app.models.user import User
from app.models.collector import Collector
from app.models.recycler import Recycler
from app.models.authorization import RecyclerAuthorization
from app.models.material import MaterialLot
from app.models.lot import SaleRequest
from app.models.offer import (
    SaleRequestRecipient,
    RecyclerOffer
)

from app.auth.dependencies import require_role


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ============================================================
# ADMIN PROFILE
# ============================================================

@router.get("/profile")
def admin_profile(
    current_user: User = Depends(
        require_role("admin")
    )
):

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "mobile": current_user.mobile,
        "role": current_user.role
    }


# ============================================================
# ADMIN DASHBOARD SUMMARY
# ============================================================

@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

    total_collectors = (
        db.query(Collector)
        .count()
    )

    total_recyclers = (
        db.query(Recycler)
        .count()
    )

    pending_authorizations = (
        db.query(RecyclerAuthorization)
        .filter(
            RecyclerAuthorization.status == "pending"
        )
        .count()
    )

    approved_recyclers = (
        db.query(RecyclerAuthorization)
        .filter(
            RecyclerAuthorization.status == "approved"
        )
        .count()
    )

    total_lots = (
        db.query(MaterialLot)
        .count()
    )

    active_lots = (
        db.query(MaterialLot)
        .filter(
            MaterialLot.status.in_([
                "created",
                "sale_requested",
                "recyclers_notified",
                "offer_received",
                "offer_accepted",
                "handover_pending",
                "handed_over",
                "received",
                "processing"
            ])
        )
        .count()
    )

    total_sale_requests = (
        db.query(SaleRequest)
        .count()
    )

    total_offers = (
        db.query(RecyclerOffer)
        .count()
    )

    total_recycled = (
        db.query(MaterialLot)
        .filter(
            MaterialLot.status == "recycled"
        )
        .count()
    )

    return {
        "total_collectors": total_collectors,
        "total_recyclers": total_recyclers,
        "pending_authorizations": pending_authorizations,
        "approved_recyclers": approved_recyclers,
        "total_lots": total_lots,
        "active_lots": active_lots,
        "total_sale_requests": total_sale_requests,
        "total_offers": total_offers,
        "total_recycled": total_recycled
    }


# ============================================================
# GET ALL COLLECTORS
# ============================================================

@router.get("/collectors")
def get_all_collectors(
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

    rows = (
        db.query(
            User,
            Collector
        )
        .join(
            Collector,
            Collector.user_id == User.id
        )
        .filter(
            User.role == "collector"
        )
        .order_by(
            User.id.desc()
        )
        .all()
    )

    results = []

    for user, collector in rows:

        lot_count = (
            db.query(MaterialLot)
            .filter(
                MaterialLot.collector_id == user.id
            )
            .count()
        )

        sale_request_count = (
            db.query(SaleRequest)
            .filter(
                SaleRequest.collector_id == user.id
            )
            .count()
        )

        results.append({
            "user_id": user.id,
            "collector_id": collector.id,
            "name": user.name,
            "email": user.email,
            "mobile": user.mobile,
            "status": user.status,
            "preferred_language": (
                collector.preferred_language
            ),
            "operating_location": (
                collector.operating_location
            ),
            "latitude": collector.latitude,
            "longitude": collector.longitude,
            "total_lots": lot_count,
            "total_sale_requests": sale_request_count
        })

    return {
        "count": len(results),
        "collectors": results
    }


# ============================================================
# GET ALL RECYCLERS
# ============================================================

@router.get("/recyclers")
def get_all_recyclers(
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

    rows = (
        db.query(
            User,
            Recycler
        )
        .join(
            Recycler,
            Recycler.user_id == User.id
        )
        .filter(
            User.role == "recycler"
        )
        .order_by(
            User.id.desc()
        )
        .all()
    )

    results = []

    for user, recycler in rows:

        authorization = (
            db.query(
                RecyclerAuthorization
            )
            .filter(
                RecyclerAuthorization.recycler_id
                == recycler.id
            )
            .first()
        )

        offer_count = (
            db.query(RecyclerOffer)
            .filter(
                RecyclerOffer.recycler_id
                == recycler.id
            )
            .count()
        )

        received_request_count = (
            db.query(SaleRequestRecipient)
            .filter(
                SaleRequestRecipient.recycler_id
                == recycler.id
            )
            .count()
        )

        results.append({
            "user_id": user.id,
            "recycler_id": recycler.id,
            "name": user.name,
            "email": user.email,
            "mobile": user.mobile,
            "status": user.status,

            "facility_name": (
                recycler.facility_name
            ),

            "facility_location": (
                recycler.facility_location
            ),

            "contact_number": (
                recycler.contact_number
            ),

            "pickup_available": (
                recycler.pickup_available
            ),

            "service_area": (
                recycler.service_area
            ),

            "latitude": recycler.latitude,
            "longitude": recycler.longitude,

            "authorization_status": (
                authorization.status
                if authorization
                else "not_submitted"
            ),

            "registration_number": (
                authorization.registration_number
                if authorization
                else None
            ),

            "authorization_type": (
                authorization.authorization_type
                if authorization
                else None
            ),

            "total_requests_received": (
                received_request_count
            ),

            "total_offers": offer_count
        })

    return {
        "count": len(results),
        "recyclers": results
    }


# ============================================================
# GET ALL MATERIAL LOTS
# ============================================================

@router.get("/lots")
def get_all_lots(
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

    lots = (
        db.query(MaterialLot)
        .order_by(
            MaterialLot.created_at.desc()
        )
        .all()
    )

    results = []

    for lot in lots:

        collector = (
            db.query(User)
            .filter(
                User.id == lot.collector_id
            )
            .first()
        )

        results.append({
            "lot_id": lot.lot_id,

            "collector_id": (
                lot.collector_id
            ),

            "collector_name": (
                collector.name
                if collector
                else None
            ),

            "material_category": (
                lot.material_category
            ),

            "material_sub_category": (
                lot.material_sub_category
            ),

            "approximate_weight": (
                lot.approximate_weight
            ),

            "condition": lot.condition,

            "source_type": lot.source_type,

            "location": lot.location,

            "price_per_kg": (
                lot.price_per_kg
            ),

            "estimated_value": (
                lot.estimated_value
            ),

            "status": lot.status,

            "created_at": lot.created_at
        })

    return {
        "count": len(results),
        "lots": results
    }


# ============================================================
# TRACEABILITY BY LOT ID
# ============================================================

@router.get("/traceability/{lot_id}")
def get_traceability(
    lot_id: str,
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find material lot
    # --------------------------------------------------------

    lot = (
        db.query(MaterialLot)
        .filter(
            MaterialLot.lot_id == lot_id
        )
        .first()
    )

    if not lot:

        raise HTTPException(
            status_code=404,
            detail="Material lot not found"
        )

    # --------------------------------------------------------
    # 2. Collector
    # --------------------------------------------------------

    collector = (
        db.query(User)
        .filter(
            User.id == lot.collector_id
        )
        .first()
    )

    # --------------------------------------------------------
    # 3. Sale request
    # --------------------------------------------------------

    sale_request = (
        db.query(SaleRequest)
        .filter(
            SaleRequest.lot_id == lot.lot_id
        )
        .first()
    )

    recipients = []

    offers = []

    selected_recycler = None

    if sale_request:

        # ----------------------------------------------------
        # Recipients
        # ----------------------------------------------------

        recipient_rows = (
            db.query(
                SaleRequestRecipient,
                Recycler
            )
            .join(
                Recycler,
                Recycler.id
                == SaleRequestRecipient.recycler_id
            )
            .filter(
                SaleRequestRecipient.sale_request_id
                == sale_request.id
            )
            .all()
        )

        for recipient, recycler in recipient_rows:

            recipients.append({
                "recycler_id": recycler.id,

                "recycler_name": (
                    recycler.facility_name
                ),

                "distance_km": (
                    recipient.distance_km
                ),

                "notified": (
                    recipient.notified
                ),

                "notified_at": (
                    recipient.notified_at
                ),

                "status": (
                    recipient.status
                )
            })


        # ----------------------------------------------------
        # Offers
        # ----------------------------------------------------

        offer_rows = (
            db.query(
                RecyclerOffer,
                Recycler
            )
            .join(
                Recycler,
                Recycler.id
                == RecyclerOffer.recycler_id
            )
            .filter(
                RecyclerOffer.sale_request_id
                == sale_request.id
            )
            .order_by(
                RecyclerOffer.created_at.asc()
            )
            .all()
        )

        for offer, recycler in offer_rows:

            offers.append({
                "offer_id": offer.id,

                "recycler_id": (
                    recycler.id
                ),

                "recycler_name": (
                    recycler.facility_name
                ),

                "offered_price_per_kg": (
                    offer.offered_price_per_kg
                ),

                "total_offer_amount": (
                    offer.total_offer_amount
                ),

                "status": offer.status,

                "created_at": offer.created_at,

                "updated_at": offer.updated_at
            })

            if offer.status == "accepted":
                selected_recycler = {
                    "recycler_id": recycler.id,
                    "recycler_name": recycler.facility_name,
                    "offered_price_per_kg": (
                        offer.offered_price_per_kg
                    ),
                    "total_offer_amount": (
                        offer.total_offer_amount
                    )
                }

    # --------------------------------------------------------
    # 4. Final traceability response
    # --------------------------------------------------------

    return {
        "lot": {
            "lot_id": lot.lot_id,

            "material_category": (
                lot.material_category
            ),

            "material_sub_category": (
                lot.material_sub_category
            ),

            "weight_kg": (
                lot.approximate_weight
            ),

            "condition": lot.condition,

            "source_type": lot.source_type,

            "location": lot.location,

            "price_per_kg": lot.price_per_kg,

            "estimated_value": lot.estimated_value,

            "status": lot.status,

            "created_at": lot.created_at
        },

        "collector": {
            "user_id": (
                collector.id
                if collector
                else None
            ),

            "name": (
                collector.name
                if collector
                else None
            ),

            "mobile": (
                collector.mobile
                if collector
                else None
            )
        },

        "sale_request": (
            {
                "sale_request_id": sale_request.id,
                "status": sale_request.status,
                "request_source": (
                    sale_request.request_source
                ),
                "created_at": sale_request.created_at,
                "updated_at": sale_request.updated_at
            }
            if sale_request
            else None
        ),

        "recycler_recipients": recipients,

        "offers": offers,

        "selected_recycler": selected_recycler
    }