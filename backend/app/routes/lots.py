from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db

from app.models.user import User
from app.models.collector import Collector
from app.models.material import MaterialLot
from app.models.lot import SaleRequest
from app.models.offer import SaleRequestRecipient

from app.auth.dependencies import require_role

from app.services.matching_service import (
    find_best_recyclers_for_lot
)


router = APIRouter(
    prefix="/lots",
    tags=["Lot Sale"]
)


# ============================================================
# SELL LOT
# ============================================================

@router.post("/{lot_id}/sell")
def sell_lot(
    lot_id: str,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # 1. Find collector profile
    # --------------------------------------------------------

    collector = (
        db.query(Collector)
        .filter(
            Collector.user_id == current_user.id
        )
        .first()
    )

    if not collector:
        raise HTTPException(
            status_code=404,
            detail="Collector profile not found"
        )

    # --------------------------------------------------------
    # 2. Find lot belonging to current collector
    # --------------------------------------------------------

    lot = (
        db.query(MaterialLot)
        .filter(
            MaterialLot.lot_id == lot_id,
            MaterialLot.collector_id == current_user.id
        )
        .first()
    )

    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Lot not found or does not belong to this collector"
        )

    # --------------------------------------------------------
    # 3. Make sure lot is not already in sale workflow
    # --------------------------------------------------------

    blocked_statuses = [
        "sale_requested",
        "recyclers_notified",
        "offer_received",
        "offer_accepted",
        "handover_pending",
        "handed_over",
        "received",
        "processing",
        "recycled"
    ]

    if lot.status in blocked_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                f"This lot cannot be sold again. "
                f"Current status: {lot.status}"
            )
        )

    # --------------------------------------------------------
    # 4. Check existing sale request
    # --------------------------------------------------------

    existing_request = (
        db.query(SaleRequest)
        .filter(
            SaleRequest.lot_id == lot.lot_id
        )
        .first()
    )

    if existing_request:
        raise HTTPException(
            status_code=400,
            detail="A sale request already exists for this lot"
        )

    # --------------------------------------------------------
    # 5. Find best approved recyclers
    #
    # Uses existing matching service:
    # price + distance + approved authorization
    # --------------------------------------------------------

    matched_recyclers = find_best_recyclers_for_lot(
        db=db,
        collector_id=collector.id,
        lot_id=lot.lot_id
    )

    if not matched_recyclers:

        raise HTTPException(
            status_code=404,
            detail=(
                "No suitable approved recycler found "
                "for this material lot"
            )
        )

    # --------------------------------------------------------
    # 6. Create SaleRequest
    # --------------------------------------------------------

    sale_request = SaleRequest(
        lot_id=lot.lot_id,
        collector_id=current_user.id,
        material_category=lot.material_category,
        material_sub_category=lot.material_sub_category,
        weight_kg=lot.approximate_weight,
        location=lot.location,
        estimated_value=lot.estimated_value,
        status="sale_requested",
        request_source="manual"
    )

    db.add(sale_request)

    # Flush so sale_request.id becomes available before commit.
    db.flush()

    # --------------------------------------------------------
    # 7. Create recipient records
    # --------------------------------------------------------

    notification_time = datetime.now(timezone.utc)

    recipients = []

    for recycler in matched_recyclers:

        recipient = SaleRequestRecipient(
            sale_request_id=sale_request.id,
            recycler_id=recycler["recycler_id"],
            distance_km=recycler.get("distance_km"),
            notified=True,
            notified_at=notification_time,
            status="notified"
        )

        db.add(recipient)

        recipients.append({
            "recycler_id": recycler["recycler_id"],
            "recycler_name": recycler["recycler_name"],
            "distance_km": recycler.get("distance_km"),
            "offered_price": recycler.get("offered_price"),
            "match_score": recycler.get("match_score"),
            "status": "notified"
        })

    # --------------------------------------------------------
    # 8. Update original material lot
    # --------------------------------------------------------

    lot.status = "recyclers_notified"

    # --------------------------------------------------------
    # 9. Commit everything together
    # --------------------------------------------------------

    db.commit()

    db.refresh(sale_request)
    db.refresh(lot)

    # --------------------------------------------------------
    # 10. Return complete response
    # --------------------------------------------------------

    return {
        "message": (
            "Sale request created and nearby approved "
            "recyclers have been notified"
        ),

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

        "estimated_value": (
            sale_request.estimated_value
        ),

        "status": sale_request.status,

        "request_source": (
            sale_request.request_source
        ),

        "recyclers_notified": len(recipients),

        "recipients": recipients,

        "created_at": sale_request.created_at
    }


# ============================================================
# GET MY SALE REQUESTS
# ============================================================

@router.get("/my-sale-requests")
def get_my_sale_requests(
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    requests = (
        db.query(SaleRequest)
        .filter(
            SaleRequest.collector_id == current_user.id
        )
        .order_by(
            SaleRequest.created_at.desc()
        )
        .all()
    )

    return [
        {
            "sale_request_id": item.id,
            "lot_id": item.lot_id,
            "material_category": (
                item.material_category
            ),
            "material_sub_category": (
                item.material_sub_category
            ),
            "weight_kg": item.weight_kg,
            "location": item.location,
            "estimated_value": (
                item.estimated_value
            ),
            "status": item.status,
            "request_source": (
                item.request_source
            ),
            "notes": item.notes,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        }
        for item in requests
    ]


# ============================================================
# GET ONE SALE REQUEST
# ============================================================

@router.get(
    "/my-sale-requests/{sale_request_id}"
)
def get_my_sale_request(
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

    recipients = (
        db.query(SaleRequestRecipient)
        .filter(
            SaleRequestRecipient.sale_request_id
            == sale_request.id
        )
        .all()
    )

    return {
        "sale_request_id": sale_request.id,

        "lot_id": sale_request.lot_id,

        "collector_id": (
            sale_request.collector_id
        ),

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

        "status": sale_request.status,

        "request_source": (
            sale_request.request_source
        ),

        "notes": sale_request.notes,

        "created_at": sale_request.created_at,

        "updated_at": sale_request.updated_at,

        "recycler_recipients": [
            {
                "recycler_id": (
                    recipient.recycler_id
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

                "status": recipient.status
            }
            for recipient in recipients
        ]
    }