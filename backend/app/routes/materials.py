from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
import qrcode
from io import BytesIO

from fastapi.responses import StreamingResponse

from app.database.session import get_db

from app.models.user import User
from app.models.material import MaterialLot

from app.schemas.material import MaterialCreate

from app.auth.dependencies import require_role
from fastapi import UploadFile, File
from pathlib import Path
import shutil
from fastapi.responses import FileResponse
from app.services.price_service import calculate_estimated_value


router = APIRouter(
    prefix="/material",
    tags=["Material"]
)


@router.post("/create")
def create_material_lot(
    material: MaterialCreate,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    lot_id = f"LOT-{uuid4()}"

    price_result = calculate_estimated_value(
        db=db,
        material_category=material.material_category,
        location=material.location,
        weight=material.approximate_weight
    )

    new_lot = MaterialLot(
    lot_id=lot_id,
    collector_id=current_user.id,
    material_category=material.material_category,
    material_sub_category=material.material_sub_category,
    material_description=material.material_description,
    approximate_weight=material.approximate_weight,
    condition=material.condition,
    source_type=material.source_type,
    location=material.location,
    price_per_kg=price_result["price_per_kg"],
    estimated_value=price_result["estimated_value"],
    status="created",
)

    db.add(new_lot)
    db.commit()
    db.refresh(new_lot)

    return {
    "message": "Material lot created successfully",
    "lot_id": new_lot.lot_id,
    "collector_id": new_lot.collector_id,
    "material_category": new_lot.material_category,
    "material_sub_category": new_lot.material_sub_category,
    "approximate_weight": new_lot.approximate_weight,
    "condition": new_lot.condition,
    "source_type": new_lot.source_type,
    "location": new_lot.location,
    "price_per_kg": new_lot.price_per_kg,
    "estimated_value": new_lot.estimated_value,
    "status": new_lot.status,
    "created_at": new_lot.created_at
}


@router.get("/my-lots")
def get_my_lots(
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    lots = (
        db.query(MaterialLot)
        .filter(
            MaterialLot.collector_id == current_user.id
        )
        .order_by(
            MaterialLot.created_at.desc()
        )
        .all()
    )

    result = []

    for lot in lots:

        result.append({
            "lot_id": lot.lot_id,
            "material_category": lot.material_category,
            "material_sub_category": lot.material_sub_category,
            "material_description": lot.material_description,
            "approximate_weight": lot.approximate_weight,
            "condition": lot.condition,
            "source_type": lot.source_type,
            "estimated_value": lot.estimated_value,
            "status": lot.status,
            "created_at": lot.created_at
        })

    return {
        "count": len(result),
        "lots": result
    }


@router.get("/my-lots/{lot_id}")
def get_my_lot(
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

    return {
        "lot_id": lot.lot_id,
        "collector_id": lot.collector_id,
        "material_category": lot.material_category,
        "material_sub_category": lot.material_sub_category,
        "material_description": lot.material_description,
        "image_path": lot.image_path,
        "approximate_weight": lot.approximate_weight,
        "condition": lot.condition,
        "source_type": lot.source_type,
        "estimated_value": lot.estimated_value,
        "status": lot.status,
        "created_at": lot.created_at
    }


@router.get("/my-lots/{lot_id}/qr")
def generate_lot_qr(
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

    qr_data = lot.lot_id

    qr = qrcode.make(qr_data)

    image_stream = BytesIO()
    qr.save(image_stream, format="PNG")

    image_stream.seek(0)

    return StreamingResponse(
        image_stream,
        media_type="image/png"
    )


@router.get("/verify/{lot_id}")
def verify_material_lot(
    lot_id: str,
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
            detail="Invalid or unknown lot ID"
        )

    return {
        "verified": True,
        "lot_id": lot.lot_id,
        "material_category": lot.material_category,
        "material_sub_category": lot.material_sub_category,
        "approximate_weight": lot.approximate_weight,
        "condition": lot.condition,
        "location": lot.location,
        "status": lot.status,
        "created_at": lot.created_at
    }


@router.post("/my-lots/{lot_id}/photo")
def upload_material_photo(
    lot_id: str,
    file: UploadFile = File(...),
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

    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    upload_dir = Path(
        "uploads/materials"
    )

    upload_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    file_extension = Path(
        file.filename
    ).suffix.lower()

    file_name = (
        f"{lot_id}{file_extension}"
    )

    file_path = upload_dir / file_name

    with open(file_path, "wb") as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    lot.image_path = str(file_path)

    db.commit()
    db.refresh(lot)

    return {
        "message": "Material photo uploaded successfully",
        "lot_id": lot.lot_id,
        "image_path": lot.image_path
    }


@router.get("/my-lots/{lot_id}/photo")
def get_material_photo(
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

    if not lot.image_path:
        raise HTTPException(
            status_code=404,
            detail="No photo uploaded for this lot"
        )

    image_path = Path(lot.image_path)

    if not image_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Photo file not found"
        )

    return FileResponse(
        path=image_path
    )