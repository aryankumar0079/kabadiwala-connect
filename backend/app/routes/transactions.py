from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db

from app.models.user import User
from app.models.material import MaterialLot
from app.models.lot import SaleRequest
from app.models.offer import SaleRequestRecipient, RecyclerOffer
from app.models.recycler import Recycler
from app.models.transaction import MaterialTransaction

from app.auth.dependencies import require_role

from app.services.qr_service import (
    get_lot_by_qr,
    validate_lot_for_handover
)


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


# ============================================================
# HANDOVER
# ============================================================

@router.post("/handover/{lot_id}")
def handover_material(
    lot_id: str,
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find recycler profile
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # 2. Find lot using existing QR / lot_id
    # --------------------------------------------------------

    lot = get_lot_by_qr(
        db=db,
        lot_id=lot_id
    )

    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Invalid or unknown lot ID"
        )

    # --------------------------------------------------------
    # 3. Validate lot status
    # --------------------------------------------------------

    validation = validate_lot_for_handover(
        db=db,
        lot_id=lot_id
    )

    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail=validation["message"]
        )

    # --------------------------------------------------------
    # 4. Find sale request
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

    if not sale_request:
        raise HTTPException(
            status_code=404,
            detail="Sale request not found for this lot"
        )

    # --------------------------------------------------------
    # 5. Find accepted offer
    # --------------------------------------------------------

    accepted_offer = (
        db.query(RecyclerOffer)
        .filter(
            RecyclerOffer.sale_request_id == sale_request.id,
            RecyclerOffer.recycler_id == recycler.id,
            RecyclerOffer.status == "accepted"
        )
        .first()
    )

    if not accepted_offer:
        raise HTTPException(
            status_code=403,
            detail=(
                "This lot has not been assigned to you. "
                "Accepted offer not found."
            )
        )

    # --------------------------------------------------------
    # 6. Prevent duplicate handover
    # --------------------------------------------------------

    existing_handover = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.lot_id == lot.lot_id,
            MaterialTransaction.transaction_type == "handover"
        )
        .first()
    )

    if existing_handover:
        raise HTTPException(
            status_code=400,
            detail="Handover has already been completed for this lot"
        )

    # --------------------------------------------------------
    # 7. Create handover transaction
    # --------------------------------------------------------

    handover_transaction = MaterialTransaction(
        lot_id=lot.lot_id,
        collector_id=lot.collector_id,
        recycler_id=recycler.id,
        transaction_type="handover",
        status="handed_over",
        quantity_kg=lot.approximate_weight,
        price_per_kg=accepted_offer.offered_price_per_kg,
        total_amount=accepted_offer.total_offer_amount,
        description="Material handed over from collector to recycler"
    )

    db.add(handover_transaction)

    # --------------------------------------------------------
    # 8. Update lot status
    # --------------------------------------------------------

    lot.status = "handed_over"

    # --------------------------------------------------------
    # 9. Update sale request
    # --------------------------------------------------------

    sale_request.status = "handed_over"

    # --------------------------------------------------------
    # 10. Update recycler recipient
    # --------------------------------------------------------

    recipient = (
        db.query(SaleRequestRecipient)
        .filter(
            SaleRequestRecipient.sale_request_id == sale_request.id,
            SaleRequestRecipient.recycler_id == recycler.id
        )
        .first()
    )

    if recipient:
        recipient.status = "accepted"

    # --------------------------------------------------------
    # 11. Commit
    # --------------------------------------------------------

    db.commit()

    db.refresh(handover_transaction)
    db.refresh(lot)

    # --------------------------------------------------------
    # 12. Response
    # --------------------------------------------------------

    return {
        "message": "Material handover completed successfully",

        "transaction_id": handover_transaction.id,

        "lot_id": lot.lot_id,

        "collector_id": lot.collector_id,

        "recycler_id": recycler.id,

        "material_category": lot.material_category,

        "material_sub_category": lot.material_sub_category,

        "quantity_kg": lot.approximate_weight,

        "price_per_kg": accepted_offer.offered_price_per_kg,

        "total_amount": accepted_offer.total_offer_amount,

        "status": lot.status,

        "transaction_type": handover_transaction.transaction_type,

        "created_at": handover_transaction.created_at
    }


# ============================================================
# GET TRANSACTION HISTORY FOR A LOT
# ============================================================

@router.get("/lot/{lot_id}")
def get_lot_transactions(
    lot_id: str,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):
    

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
            detail="Lot not found"
        )

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

    return {
        "lot_id": lot.lot_id,
        "count": len(transactions),
        "transactions": [
            {
                "transaction_id": item.id,
                "transaction_type": item.transaction_type,
                "status": item.status,
                "collector_id": item.collector_id,
                "recycler_id": item.recycler_id,
                "quantity_kg": item.quantity_kg,
                "price_per_kg": item.price_per_kg,
                "total_amount": item.total_amount,
                "description": item.description,
                "created_at": item.created_at
            }
            for item in transactions
        ]
    }

# ============================================================
# GET MY ASSIGNED / ACCEPTED LOTS
# ============================================================

@router.get("/my-lots")
def get_my_transaction_lots(
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find recycler profile
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # 2. Find lots already assigned to this recycler
    #    through an accepted offer.
    # --------------------------------------------------------

    accepted_offers = (
        db.query(RecyclerOffer, SaleRequest)
        .join(
            SaleRequest,
            SaleRequest.id == RecyclerOffer.sale_request_id
        )
        .filter(
            RecyclerOffer.recycler_id == recycler.id,
            RecyclerOffer.status == "accepted"
        )
        .order_by(
            RecyclerOffer.created_at.desc()
        )
        .all()
    )

    # --------------------------------------------------------
    # 3. Also find lots that already have transaction history.
    #    This keeps received / processing / recycled lots visible.
    # --------------------------------------------------------

    transactions = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.recycler_id == recycler.id
        )
        .order_by(
            MaterialTransaction.created_at.desc()
        )
        .all()
    )

    # --------------------------------------------------------
    # 4. Build unique lot IDs from both sources.
    # --------------------------------------------------------

    lot_ids = []

    for _, sale_request in accepted_offers:
        if sale_request.lot_id not in lot_ids:
            lot_ids.append(sale_request.lot_id)

    for transaction in transactions:
        if transaction.lot_id not in lot_ids:
            lot_ids.append(transaction.lot_id)

    # --------------------------------------------------------
    # 5. Get complete lot information.
    # --------------------------------------------------------

    result = []

    for lot_id in lot_ids:

        lot = (
            db.query(MaterialLot)
            .filter(
                MaterialLot.lot_id == lot_id
            )
            .first()
        )

        if not lot:
            continue

        # -----------------------------------------------
        # Latest transaction for this recycler and lot
        # -----------------------------------------------

        latest_transaction = (
            db.query(MaterialTransaction)
            .filter(
                MaterialTransaction.lot_id == lot.lot_id,
                MaterialTransaction.recycler_id == recycler.id
            )
            .order_by(
                MaterialTransaction.created_at.desc()
            )
            .first()
        )

        # -----------------------------------------------
        # Find the accepted offer for this lot, if any
        # -----------------------------------------------

        accepted_offer = next(
            (
                offer
                for offer, sale_request in accepted_offers
                if sale_request.lot_id == lot.lot_id
            ),
            None
        )

        result.append({
            "lot_id": lot.lot_id,
            "collector_id": lot.collector_id,
            "recycler_id": recycler.id,

            "material_category":
                lot.material_category,

            "material_sub_category":
                lot.material_sub_category,

            "material_description":
                lot.material_description,

            "approximate_weight":
                lot.approximate_weight,

            "condition":
                lot.condition,

            "source_type":
                lot.source_type,

            "location":
                lot.location,

            "price_per_kg": lot.price_per_kg,

            "estimated_value":
                lot.estimated_value,

            "offer_price_per_kg":
                accepted_offer.offered_price_per_kg
                if accepted_offer
                else None,

            "offer_total_amount":
                accepted_offer.total_offer_amount
                if accepted_offer
                else None,

            "lot_status": lot.status,

            "latest_transaction_type":
                latest_transaction.transaction_type
                if latest_transaction
                else None,

            "latest_transaction_status":
                latest_transaction.status
                if latest_transaction
                else None,

            "latest_transaction_at":
                latest_transaction.created_at
                if latest_transaction
                else None,

            "created_at": lot.created_at
        })

    # --------------------------------------------------------
    # 6. Return response
    # --------------------------------------------------------

    return {
        "count": len(result),
        "lots": result
    }

# ============================================================
# MARK MATERIAL AS RECEIVED
# ============================================================

@router.post("/received/{lot_id}")
def mark_material_received(
    lot_id: str,
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find recycler profile
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # 2. Find lot
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
            detail="Lot not found"
        )

    # --------------------------------------------------------
    # 3. Verify previous handover
    # --------------------------------------------------------

    handover = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.lot_id == lot.lot_id,
            MaterialTransaction.recycler_id == recycler.id,
            MaterialTransaction.transaction_type == "handover",
            MaterialTransaction.status == "handed_over"
        )
        .first()
    )

    if not handover:
        raise HTTPException(
            status_code=400,
            detail="This lot has not been handed over to you"
        )

    # --------------------------------------------------------
    # 4. Prevent duplicate receive
    # --------------------------------------------------------

    existing_received = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.lot_id == lot.lot_id,
            MaterialTransaction.transaction_type == "received"
        )
        .first()
    )

    if existing_received:
        raise HTTPException(
            status_code=400,
            detail="Material has already been marked as received"
        )

    # --------------------------------------------------------
    # 5. Create received transaction
    # --------------------------------------------------------

    received_transaction = MaterialTransaction(
        lot_id=lot.lot_id,
        collector_id=lot.collector_id,
        recycler_id=recycler.id,
        transaction_type="received",
        status="received",
        quantity_kg=lot.approximate_weight,
        price_per_kg=lot.price_per_kg,
        total_amount=lot.estimated_value,
        description="Material received by recycler"
    )

    db.add(received_transaction)

    # --------------------------------------------------------
    # 6. Update lot status
    # --------------------------------------------------------

    lot.status = "received"

    db.commit()

    db.refresh(received_transaction)
    db.refresh(lot)

    return {
        "message": "Material marked as received",

        "transaction_id": received_transaction.id,

        "lot_id": lot.lot_id,

        "collector_id": lot.collector_id,

        "recycler_id": recycler.id,

        "material_category": lot.material_category,

        "quantity_kg": lot.approximate_weight,

        "status": lot.status,

        "created_at": received_transaction.created_at
    }


# ============================================================
# START PROCESSING
# ============================================================

@router.post("/processing/{lot_id}")
def start_material_processing(
    lot_id: str,
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find recycler profile
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # 2. Find lot
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
            detail="Lot not found"
        )

    # --------------------------------------------------------
    # 3. Make sure material is received
    # --------------------------------------------------------

    received_transaction = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.lot_id == lot.lot_id,
            MaterialTransaction.recycler_id == recycler.id,
            MaterialTransaction.transaction_type == "received",
            MaterialTransaction.status == "received"
        )
        .first()
    )

    if not received_transaction:
        raise HTTPException(
            status_code=400,
            detail="Material must be received before processing"
        )

    # --------------------------------------------------------
    # 4. Prevent duplicate processing
    # --------------------------------------------------------

    existing_processing = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.lot_id == lot.lot_id,
            MaterialTransaction.transaction_type == "processing"
        )
        .first()
    )

    if existing_processing:
        raise HTTPException(
            status_code=400,
            detail="Material processing has already started"
        )

    # --------------------------------------------------------
    # 5. Create processing transaction
    # --------------------------------------------------------

    processing_transaction = MaterialTransaction(
        lot_id=lot.lot_id,
        collector_id=lot.collector_id,
        recycler_id=recycler.id,
        transaction_type="processing",
        status="processing",
        quantity_kg=lot.approximate_weight,
        price_per_kg=lot.price_per_kg,
        total_amount=lot.estimated_value,
        description="Material processing started"
    )

    db.add(processing_transaction)

    # --------------------------------------------------------
    # 6. Update lot status
    # --------------------------------------------------------

    lot.status = "processing"

    db.commit()

    db.refresh(processing_transaction)
    db.refresh(lot)

    return {
        "message": "Material processing started",

        "transaction_id": processing_transaction.id,

        "lot_id": lot.lot_id,

        "collector_id": lot.collector_id,

        "recycler_id": recycler.id,

        "material_category": lot.material_category,

        "quantity_kg": lot.approximate_weight,

        "status": lot.status,

        "created_at": processing_transaction.created_at
    }


# ============================================================
# MARK MATERIAL AS RECYCLED
# ============================================================

@router.post("/recycled/{lot_id}")
def mark_material_recycled(
    lot_id: str,
    current_user: User = Depends(
        require_role("recycler")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find recycler profile
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # 2. Find lot
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
            detail="Lot not found"
        )

    # --------------------------------------------------------
    # 3. Make sure processing happened
    # --------------------------------------------------------

    processing_transaction = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.lot_id == lot.lot_id,
            MaterialTransaction.recycler_id == recycler.id,
            MaterialTransaction.transaction_type == "processing",
            MaterialTransaction.status == "processing"
        )
        .first()
    )

    if not processing_transaction:
        raise HTTPException(
            status_code=400,
            detail="Material must be processed before marking it recycled"
        )

    # --------------------------------------------------------
    # 4. Prevent duplicate recycled status
    # --------------------------------------------------------

    existing_recycled = (
        db.query(MaterialTransaction)
        .filter(
            MaterialTransaction.lot_id == lot.lot_id,
            MaterialTransaction.transaction_type == "recycled"
        )
        .first()
    )

    if existing_recycled:
        raise HTTPException(
            status_code=400,
            detail="Material has already been marked as recycled"
        )

    # --------------------------------------------------------
    # 5. Create recycled transaction
    # --------------------------------------------------------

    recycled_transaction = MaterialTransaction(
        lot_id=lot.lot_id,
        collector_id=lot.collector_id,
        recycler_id=recycler.id,
        transaction_type="recycled",
        status="recycled",
        quantity_kg=lot.approximate_weight,
        price_per_kg=lot.price_per_kg,
        total_amount=lot.estimated_value,
        description="Material successfully recycled"
    )

    db.add(recycled_transaction)

    # --------------------------------------------------------
    # 6. Update lot status
    # --------------------------------------------------------

    lot.status = "recycled"

    db.commit()

    db.refresh(recycled_transaction)
    db.refresh(lot)

    return {
        "message": "Material marked as recycled successfully",

        "transaction_id": recycled_transaction.id,

        "lot_id": lot.lot_id,

        "collector_id": lot.collector_id,

        "recycler_id": recycler.id,

        "material_category": lot.material_category,

        "quantity_kg": lot.approximate_weight,

        "status": lot.status,

        "created_at": recycled_transaction.created_at
    }    