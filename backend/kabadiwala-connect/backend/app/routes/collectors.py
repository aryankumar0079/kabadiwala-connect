from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import require_role

from app.models.user import User
from app.models.collector import Collector

from app.services.collector_service import reverse_geocode


router = APIRouter(
    prefix="/collector",
    tags=["Collector"]
)


# =========================================================
# GET COLLECTOR PROFILE
# =========================================================

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


# =========================================================
# UPDATE COLLECTOR LOCATION
# =========================================================

@router.put("/location")
def update_collector_location(
    latitude: float,
    longitude: float,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # Validate latitude
    # -----------------------------------------------------

    if not -90 <= latitude <= 90:

        raise HTTPException(
            status_code=400,
            detail="Invalid latitude"
        )


    # -----------------------------------------------------
    # Validate longitude
    # -----------------------------------------------------

    if not -180 <= longitude <= 180:

        raise HTTPException(
            status_code=400,
            detail="Invalid longitude"
        )


    # -----------------------------------------------------
    # Find collector profile
    # -----------------------------------------------------

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


    # -----------------------------------------------------
    # Save latitude and longitude
    # -----------------------------------------------------

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


# =========================================================
# REVERSE GEOCODE COLLECTOR LOCATION
# =========================================================

@router.get("/location-details")
async def get_collector_location_details(
    latitude: float,
    longitude: float,
    current_user: User = Depends(
        require_role("collector")
    )
):

    # -----------------------------------------------------
    # Validate latitude
    # -----------------------------------------------------

    if not -90 <= latitude <= 90:

        raise HTTPException(
            status_code=400,
            detail="Invalid latitude"
        )


    # -----------------------------------------------------
    # Validate longitude
    # -----------------------------------------------------

    if not -180 <= longitude <= 180:

        raise HTTPException(
            status_code=400,
            detail="Invalid longitude"
        )


    # -----------------------------------------------------
    # Reverse geocode using Geoapify
    # -----------------------------------------------------

    location = await reverse_geocode(
        latitude=latitude,
        longitude=longitude
    )


    # -----------------------------------------------------
    # Geoapify failure
    # -----------------------------------------------------

    if not location.get("success"):

        raise HTTPException(
            status_code=502,
            detail=location.get(
                "message",
                "Unable to resolve location"
            )
        )


    # -----------------------------------------------------
    # Return readable location
    # -----------------------------------------------------

    return {
        "success": True,

        "latitude": latitude,
        "longitude": longitude,

        "address": location.get(
            "address"
        ),

        "city": location.get(
            "city"
        ),

        "district": location.get(
            "district"
        ),

        "state": location.get(
            "state"
        ),

        "postcode": location.get(
            "postcode"
        ),

        "country": location.get(
            "country"
        )
    }