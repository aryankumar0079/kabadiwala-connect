from sqlalchemy.orm import Session

from app.models.material import MaterialLot
from app.models.lot import SaleRequest
from app.models.offer import RecyclerOffer
from app.models.recycler import Recycler
from app.models.transaction import MaterialTransaction


def get_lot_traceability(
    db: Session,
    lot_id: str
):
    """
    Return the complete lifecycle/history of a material lot.
    """

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
        return None

    # --------------------------------------------------------
    # 2. Find sale request
    # --------------------------------------------------------

    sale_request = (
        db.query(SaleRequest)
        .filter(
            SaleRequest.lot_id == lot.lot_id
        )
        .order_by(
            SaleRequest.created_at.desc()
        )
        .first()
    )

    # --------------------------------------------------------
    # 3. Find accepted offer
    # --------------------------------------------------------

    accepted_offer = None

    if sale_request:
        accepted_offer = (
            db.query(RecyclerOffer)
            .filter(
                RecyclerOffer.sale_request_id == sale_request.id,
                RecyclerOffer.status == "accepted"
            )
            .first()
        )

    # --------------------------------------------------------
    # 4. Find recycler
    # --------------------------------------------------------

    recycler_data = None

    if accepted_offer:
        recycler = (
            db.query(Recycler)
            .filter(
                Recycler.id == accepted_offer.recycler_id
            )
            .first()
        )

        if recycler:
            recycler_data = {
                "recycler_id": recycler.id,
                "facility_name": recycler.facility_name,
                "facility_location": recycler.facility_location,
                "contact_number": recycler.contact_number,
                "pickup_available": recycler.pickup_available,
                "service_area": recycler.service_area,
                "latitude": recycler.latitude,
                "longitude": recycler.longitude
            }

    # --------------------------------------------------------
    # 5. Get transaction history
    # --------------------------------------------------------

    transactions = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.lot_id == lot.lot_id
        )
        .order_by(
            MaterialTransaction.created_at.asc()
        )
        .all()
    )

    # --------------------------------------------------------
    # 6. Build lifecycle history
    # --------------------------------------------------------

    history = []

    history.append({
        "event": "lot_created",
        "status": "created",
        "created_at": lot.created_at
    })

    if sale_request:
        history.append({
            "event": "sale_request",
            "status": sale_request.status,
            "sale_request_id": sale_request.id,
            "created_at": sale_request.created_at
        })

    for transaction in transactions:
        history.append({
            "event": transaction.transaction_type,
            "status": transaction.status,
            "transaction_id": transaction.id,
            "created_at": transaction.created_at,
            "description": transaction.description
        })

    # --------------------------------------------------------
    # 7. Return complete traceability
    # --------------------------------------------------------

    return {
        "lot": {
            "lot_id": lot.lot_id,
            "collector_id": lot.collector_id,
            "material_category": lot.material_category,
            "material_sub_category": lot.material_sub_category,
            "material_description": lot.material_description,
            "approximate_weight": lot.approximate_weight,
            "condition": lot.condition,
            "source_type": lot.source_type,
            "location": lot.location,
            "price_per_kg": lot.price_per_kg,
            "estimated_value": lot.estimated_value,
            "status": lot.status,
            "created_at": lot.created_at
        },

        "sale_request": (
            {
                "sale_request_id": sale_request.id,
                "status": sale_request.status,
                "created_at": sale_request.created_at
            }
            if sale_request
            else None
        ),

        "accepted_offer": (
            {
                "offer_id": accepted_offer.id,
                "recycler_id": accepted_offer.recycler_id,
                "offered_price_per_kg": accepted_offer.offered_price_per_kg,
                "total_offer_amount": accepted_offer.total_offer_amount,
                "message": accepted_offer.message,
                "status": accepted_offer.status,
                "created_at": accepted_offer.created_at
            }
            if accepted_offer
            else None
        ),

        "recycler": recycler_data,

        "current_status": lot.status,

        "history": history
    }