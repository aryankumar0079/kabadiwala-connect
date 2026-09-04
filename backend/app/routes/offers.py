from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database.session import get_db

from app.models.user import User
from app.models.recycler import Recycler
from app.models.authorization import RecyclerAuthorization
from app.models.offer import (
    SaleRequestRecipient,
    RecyclerOffer
)
from app.models.lot import SaleRequest
from app.models.material import MaterialLot


router = APIRouter(
    prefix="/offers",
    tags=["Offers"]
)


# ============================================================
# GET SALE REQUESTS AVAILABLE FOR CURRENT RECYCLER
# ============================================================

@router.get("/sale-requests")
def get_available_sale_requests(
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    recycler = (
        db.query(Recycler)
        .filter(
            Recycler.user_id == current_user.id
        )
        .first()
    )

    if not recycler:
        raise HTTPException(
            status_code=404,
            detail="Recycler profile not found"
        )

    authorization = (
        db.query(RecyclerAuthorization)
        .filter(
            RecyclerAuthorization.recycler_id
            == recycler.id
        )
        .first()
    )

    if not authorization:
        raise HTTPException(
            status_code=403,
            detail="Recycler authorization record not found"
        )

    if authorization.status != "approved":
        raise HTTPException(
            status_code=403,
            detail="Recycler authorization is not approved"
        )

    rows = (
        db.query(
            SaleRequestRecipient,
            SaleRequest
        )
        .join(
            SaleRequest,
            SaleRequest.id
            == SaleRequestRecipient.sale_request_id
        )
        .filter(
            SaleRequestRecipient.recycler_id
            == recycler.id,

            SaleRequestRecipient.status.in_([
                "pending",
                "notified",
                "viewed"
            ]),

            SaleRequest.status.in_([
                "sale_requested",
                "recyclers_notified",
                "offer_received"
            ])
        )
        .order_by(
            SaleRequestRecipient.created_at.desc()
        )
        .all()
    )

    results = []

    for recipient, sale_request in rows:

        results.append({
            "sale_request_id": sale_request.id,
            "lot_id": sale_request.lot_id,
            "collector_id": sale_request.collector_id,
            "material_category": (
                sale_request.material_category
            ),
            "material_sub_category": (
                sale_request.material_sub_category
            ),
            "weight_kg": sale_request.weight_kg,
            "location": sale_request.location,
            "estimated_value": (
                sale_request.estimated_value
            ),
            "request_status": sale_request.status,
            "recipient_status": recipient.status,
            "distance_km": recipient.distance_km,
            "notified": recipient.notified,
            "notified_at": recipient.notified_at,
            "created_at": sale_request.created_at
        })

    return {
        "recycler_id": recycler.id,
        "count": len(results),
        "sale_requests": results
    }


# ============================================================
# MARK SALE REQUEST AS VIEWED
# ============================================================

@router.post(
    "/sale-requests/{sale_request_id}/view"
)
def mark_sale_request_viewed(
    sale_request_id: int,
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    recycler = (
        db.query(Recycler)
        .filter(
            Recycler.user_id == current_user.id
        )
        .first()
    )

    if not recycler:
        raise HTTPException(
            status_code=404,
            detail="Recycler profile not found"
        )

    recipient = (
        db.query(SaleRequestRecipient)
        .filter(
            SaleRequestRecipient.sale_request_id
            == sale_request_id,

            SaleRequestRecipient.recycler_id
            == recycler.id
        )
        .first()
    )

    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="Sale request not assigned to this recycler"
        )

    if recipient.status != "responded":
        recipient.status = "viewed"

    db.commit()

    return {
        "message": "Sale request marked as viewed",
        "sale_request_id": sale_request_id,
        "recycler_id": recycler.id,
        "status": recipient.status
    }


# ============================================================
# MAKE AN OFFER
# ============================================================

@router.post(
    "/sale-requests/{sale_request_id}/offer"
)
def make_offer(
    sale_request_id: int,
    offered_price_per_kg: float,
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    if offered_price_per_kg <= 0:
        raise HTTPException(
            status_code=400,
            detail="Offered price must be greater than zero"
        )

    recycler = (
        db.query(Recycler)
        .filter(
            Recycler.user_id == current_user.id
        )
        .first()
    )

    if not recycler:
        raise HTTPException(
            status_code=404,
            detail="Recycler profile not found"
        )

    authorization = (
        db.query(RecyclerAuthorization)
        .filter(
            RecyclerAuthorization.recycler_id
            == recycler.id
        )
        .first()
    )

    if not authorization:
        raise HTTPException(
            status_code=403,
            detail="Recycler authorization record not found"
        )

    if authorization.status != "approved":
        raise HTTPException(
            status_code=403,
            detail="Only approved recyclers can make offers"
        )

    sale_request = (
        db.query(SaleRequest)
        .filter(
            SaleRequest.id == sale_request_id
        )
        .first()
    )

    if not sale_request:
        raise HTTPException(
            status_code=404,
            detail="Sale request not found"
        )

    recipient = (
        db.query(SaleRequestRecipient)
        .filter(
            SaleRequestRecipient.sale_request_id
            == sale_request_id,

            SaleRequestRecipient.recycler_id
            == recycler.id
        )
        .first()
    )

    if not recipient:
        raise HTTPException(
            status_code=403,
            detail="This sale request was not assigned to you"
        )

    if sale_request.status not in [
        "sale_requested",
        "recyclers_notified",
        "offer_received"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "This sale request is not accepting offers. "
                f"Current status: {sale_request.status}"
            )
        )

    existing_offer = (
        db.query(RecyclerOffer)
        .filter(
            RecyclerOffer.sale_request_id
            == sale_request_id,

            RecyclerOffer.recycler_id
            == recycler.id,

            RecyclerOffer.status == "pending"
        )
        .first()
    )

    if existing_offer:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending offer for this request"
        )

    total_offer_amount = (
        offered_price_per_kg
        * sale_request.weight_kg
    )

    offer = RecyclerOffer(
        sale_request_id=sale_request.id,
        recycler_id=recycler.id,
        offered_price_per_kg=offered_price_per_kg,
        total_offer_amount=round(
            total_offer_amount,
            2
        ),
        status="pending"
    )

    db.add(offer)

    recipient.status = "responded"

    sale_request.status = "offer_received"

    db.commit()

    db.refresh(offer)

    return {
        "message": "Offer submitted successfully",
        "offer_id": offer.id,
        "sale_request_id": offer.sale_request_id,
        "lot_id": sale_request.lot_id,
        "recycler_id": offer.recycler_id,
        "offered_price_per_kg": (
            offer.offered_price_per_kg
        ),
        "total_offer_amount": (
            offer.total_offer_amount
        ),
        "status": offer.status,
        "created_at": offer.created_at
    }


# ============================================================
# COLLECTOR: GET OFFERS FOR ONE SALE REQUEST
# ============================================================

@router.get(
    "/sale-requests/{sale_request_id}/offers"
)
def get_sale_request_offers(
    sale_request_id: int,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    sale_request = (
        db.query(SaleRequest)
        .filter(
            SaleRequest.id == sale_request_id,
            SaleRequest.collector_id == current_user.id
        )
        .first()
    )

    if not sale_request:
        raise HTTPException(
            status_code=404,
            detail="Sale request not found"
        )

    rows = (
        db.query(
            RecyclerOffer,
            Recycler
        )
        .join(
            Recycler,
            Recycler.id == RecyclerOffer.recycler_id
        )
        .filter(
            RecyclerOffer.sale_request_id
            == sale_request_id
        )
        .order_by(
            RecyclerOffer.offered_price_per_kg.desc()
        )
        .all()
    )

    offers = []

    for offer, recycler in rows:

        recipient = (
            db.query(SaleRequestRecipient)
            .filter(
                SaleRequestRecipient.sale_request_id
                == sale_request_id,

                SaleRequestRecipient.recycler_id
                == recycler.id
            )
            .first()
        )

        offers.append({
            "offer_id": offer.id,
            "recycler_id": recycler.id,
            "recycler_name": (
                recycler.facility_name
            ),
            "facility_location": (
                recycler.facility_location
            ),
            "distance_km": (
                recipient.distance_km
                if recipient
                else None
            ),
            "pickup_available": (
                recycler.pickup_available
            ),
            "offered_price_per_kg": (
                offer.offered_price_per_kg
            ),
            "total_offer_amount": (
                offer.total_offer_amount
            ),
            "status": offer.status,
            "created_at": offer.created_at
        })

    return {
        "sale_request_id": sale_request_id,
        "lot_id": sale_request.lot_id,
        "status": sale_request.status,
        "count": len(offers),
        "offers": offers
    }


# ============================================================
# COLLECTOR: ACCEPT AN OFFER
# ============================================================

@router.post(
    "/{offer_id}/accept"
)
def accept_offer(
    offer_id: int,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find selected offer
    # --------------------------------------------------------

    selected_offer = (
        db.query(RecyclerOffer)
        .filter(
            RecyclerOffer.id == offer_id
        )
        .first()
    )

    if not selected_offer:
        raise HTTPException(
            status_code=404,
            detail="Offer not found"
        )

    # --------------------------------------------------------
    # 2. Find sale request and verify collector ownership
    # --------------------------------------------------------

    sale_request = (
        db.query(SaleRequest)
        .filter(
            SaleRequest.id
            == selected_offer.sale_request_id,

            SaleRequest.collector_id
            == current_user.id
        )
        .first()
    )

    if not sale_request:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission to accept "
                "this offer"
            )
        )

    # --------------------------------------------------------
    # 3. Make sure sale request is still accepting selection
    # --------------------------------------------------------

    if sale_request.status not in [
        "sale_requested",
        "recyclers_notified",
        "offer_received"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "This sale request cannot accept an offer now. "
                f"Current status: {sale_request.status}"
            )
        )

    # --------------------------------------------------------
    # 4. Selected offer must still be pending
    # --------------------------------------------------------

    if selected_offer.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=(
                "This offer is no longer available. "
                f"Current status: {selected_offer.status}"
            )
        )

    # --------------------------------------------------------
    # 5. Verify selected recycler is a request recipient
    # --------------------------------------------------------

    selected_recipient = (
        db.query(SaleRequestRecipient)
        .filter(
            SaleRequestRecipient.sale_request_id
            == sale_request.id,

            SaleRequestRecipient.recycler_id
            == selected_offer.recycler_id
        )
        .first()
    )

    if not selected_recipient:
        raise HTTPException(
            status_code=400,
            detail="Selected recycler is not assigned to this request"
        )

    # --------------------------------------------------------
    # 6. Accept selected offer
    # --------------------------------------------------------

    selected_offer.status = "accepted"

    # --------------------------------------------------------
    # 7. Update selected recycler recipient
    # --------------------------------------------------------

    selected_recipient.status = "accepted"

    # --------------------------------------------------------
    # 8. Reject all other pending offers
    # --------------------------------------------------------

    other_offers = (
        db.query(RecyclerOffer)
        .filter(
            RecyclerOffer.sale_request_id
            == sale_request.id,

            RecyclerOffer.id != selected_offer.id,

            RecyclerOffer.status == "pending"
        )
        .all()
    )

    for other_offer in other_offers:

        other_offer.status = "rejected"

    # --------------------------------------------------------
    # 9. Reject all other recycler recipients
    # --------------------------------------------------------

    other_recipients = (
        db.query(SaleRequestRecipient)
        .filter(
            SaleRequestRecipient.sale_request_id
            == sale_request.id,

            SaleRequestRecipient.recycler_id
            != selected_offer.recycler_id,

            SaleRequestRecipient.status.in_([
                "pending",
                "notified",
                "viewed",
                "responded"
            ])
        )
        .all()
    )

    for other_recipient in other_recipients:

        other_recipient.status = "rejected"

    # --------------------------------------------------------
    # 10. Update SaleRequest
    # --------------------------------------------------------

    sale_request.status = "offer_accepted"

    # --------------------------------------------------------
    # 11. Update MaterialLot
    # --------------------------------------------------------

    lot = (
        db.query(MaterialLot)
        .filter(
            MaterialLot.lot_id
            == sale_request.lot_id,

            MaterialLot.collector_id
            == current_user.id
        )
        .first()
    )

    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Material lot linked to this request not found"
        )

    lot.status = "offer_accepted"

    # --------------------------------------------------------
    # 12. Commit complete selection
    # --------------------------------------------------------

    db.commit()

    db.refresh(selected_offer)
    db.refresh(sale_request)
    db.refresh(lot)

    # --------------------------------------------------------
    # 13. Recycler details
    # --------------------------------------------------------

    selected_recycler = (
        db.query(Recycler)
        .filter(
            Recycler.id
            == selected_offer.recycler_id
        )
        .first()
    )

    # --------------------------------------------------------
    # 14. Return final result
    # --------------------------------------------------------

    return {
        "message": "Offer accepted successfully",

        "offer_id": selected_offer.id,

        "sale_request_id": (
            sale_request.id
        ),

        "lot_id": (
            sale_request.lot_id
        ),

        "collector_id": (
            sale_request.collector_id
        ),

        "selected_recycler": {
            "recycler_id": (
                selected_recycler.id
                if selected_recycler
                else None
            ),

            "recycler_name": (
                selected_recycler.facility_name
                if selected_recycler
                else None
            ),

            "facility_location": (
                selected_recycler.facility_location
                if selected_recycler
                else None
            ),

            "pickup_available": (
                selected_recycler.pickup_available
                if selected_recycler
                else None
            )
        },

        "offered_price_per_kg": (
            selected_offer.offered_price_per_kg
        ),

        "total_offer_amount": (
            selected_offer.total_offer_amount
        ),

        "sale_request_status": (
            sale_request.status
        ),

        "lot_status": (
            lot.status
        ),

        "message_to_collector": (
            "This recycler has been selected. "
            "The next step is QR-based handover."
        )
    }


# ============================================================
# RECYCLER: GET MY OFFERS
# ============================================================

@router.get("/my-offers")
def get_my_offers(
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    recycler = (
        db.query(Recycler)
        .filter(
            Recycler.user_id == current_user.id
        )
        .first()
    )

    if not recycler:
        raise HTTPException(
            status_code=404,
            detail="Recycler profile not found"
        )

    offers = (
        db.query(
            RecyclerOffer,
            SaleRequest
        )
        .join(
            SaleRequest,
            SaleRequest.id
            == RecyclerOffer.sale_request_id
        )
        .filter(
            RecyclerOffer.recycler_id
            == recycler.id
        )
        .order_by(
            RecyclerOffer.created_at.desc()
        )
        .all()
    )

    results = []

    for offer, sale_request in offers:

        results.append({
            "offer_id": offer.id,

            "sale_request_id": (
                offer.sale_request_id
            ),

            "lot_id": sale_request.lot_id,

            "collector_id": (
                sale_request.collector_id
            ),

            "material_category": (
                sale_request.material_category
            ),

            "weight_kg": (
                sale_request.weight_kg
            ),

            "offered_price_per_kg": (
                offer.offered_price_per_kg
            ),

            "total_offer_amount": (
                offer.total_offer_amount
            ),

            "status": offer.status,

            "sale_request_status": (
                sale_request.status
            ),

            "created_at": offer.created_at,

            "updated_at": offer.updated_at
        })

    return {
        "recycler_id": recycler.id,
        "count": len(results),
        "offers": results
    }