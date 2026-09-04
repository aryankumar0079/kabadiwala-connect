from sqlalchemy.orm import Session

from app.models.material import MaterialLot


def get_lot_by_qr(
    db: Session,
    lot_id: str
):
    """
    Find a material lot using the lot_id
    encoded inside the existing QR.
    """

    lot = (
        db.query(MaterialLot)
        .filter(
            MaterialLot.lot_id == lot_id
        )
        .first()
    )

    return lot


def validate_lot_for_handover(
    db: Session,
    lot_id: str
):
    """
    Validate whether the lot exists and is
    currently in a valid handover state.
    """

    lot = get_lot_by_qr(
        db=db,
        lot_id=lot_id
    )

    if not lot:
        return {
            "valid": False,
            "message": "Invalid or unknown lot ID"
        }

    allowed_statuses = [
        "offer_accepted",
        "handover_pending"
    ]

    if lot.status not in allowed_statuses:
        return {
            "valid": False,
            "message": (
                f"Lot is not ready for handover. "
                f"Current status: {lot.status}"
            )
        }

    return {
        "valid": True,
        "message": "Lot is valid for handover",
        "lot": lot
    }