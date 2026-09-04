from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db

from app.models.user import User
from app.models.material import MaterialLot

from app.auth.dependencies import require_role

from app.services.traceability_service import (
    get_lot_traceability
)


router = APIRouter(
    prefix="/traceability",
    tags=["Traceability"]
)


# ============================================================
# GET LOT TRACEABILITY
# ============================================================

@router.get("/{lot_id}")
def get_traceability(
    lot_id: str,
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

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

    traceability = get_lot_traceability(
        db=db,
        lot_id=lot_id
    )

    if not traceability:
        raise HTTPException(
            status_code=404,
            detail="Traceability information not found"
        )

    return traceability