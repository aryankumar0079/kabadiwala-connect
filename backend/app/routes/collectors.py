from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import require_role

from app.models.user import User
from app.models.collector import Collector


router = APIRouter(
    prefix="/collector",
    tags=["Collector"]
)


@router.get("/profile")
def get_collector_profile(
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    collector = (
        db.query(Collector)
        .filter(
            Collector.user_id == current_user.id
        )
        .first()
    )

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "mobile": current_user.mobile,
        "role": current_user.role,
        "preferred_language": (
            collector.preferred_language
            if collector else None
        ),
        "operating_location": (
            collector.operating_location
            if collector else None
        ),
        "latitude": (
            collector.latitude
            if collector else None
        ),
        "longitude": (
            collector.longitude
            if collector else None
        )
    }


@router.put("/location")
def update_collector_location(
    latitude: float,
    longitude: float,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    # Validate latitude
    if not -90 <= latitude <= 90:
        raise HTTPException(
            status_code=400,
            detail="Invalid latitude"
        )

    # Validate longitude
    if not -180 <= longitude <= 180:
        raise HTTPException(
            status_code=400,
            detail="Invalid longitude"
        )

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

    collector.latitude = latitude
    collector.longitude = longitude

    db.commit()
    db.refresh(collector)

    return {
        "message": "Collector location updated successfully",
        "collector_id": collector.id,
        "latitude": collector.latitude,
        "longitude": collector.longitude
    }