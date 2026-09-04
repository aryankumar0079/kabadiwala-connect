from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database.session import get_db

from app.models.user import User
from app.models.collector import Collector
from app.models.recycler import Recycler
from app.models.authorization import RecyclerAuthorization
from app.models.material import MaterialLot

from app.services.matching_service import (
    find_matching_recyclers,
    find_nearest_recyclers,
    rank_recyclers,
    debug_recycler_matching,
    test_distance_between_points,
    find_best_recyclers_for_lot
)


router = APIRouter(
    prefix="/recycler",
    tags=["Recycler"]
)


@router.get("/profile")
def get_recycler_profile(
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
        return {
            "message": "Recycler profile not found"
        }

    authorization = (
        db.query(RecyclerAuthorization)
        .filter(
            RecyclerAuthorization.recycler_id == recycler.id
        )
        .first()
    )

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "mobile": current_user.mobile,
        "role": current_user.role,

        "facility_name": recycler.facility_name,
        "facility_location": recycler.facility_location,
        "service_area": recycler.service_area,
        "pickup_available": recycler.pickup_available,

        "authorization_status": (
            authorization.status
            if authorization
            else "not_submitted"
        )
    }


@router.get("/matching")
def get_matching_recyclers(
    material_category: str,
    location: str,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    matches = find_matching_recyclers(
        db=db,
        material_category=material_category,
        location=location
    )

    if not matches:
        raise HTTPException(
            status_code=404,
            detail="No matching recyclers found"
        )

    return {
        "material_category": material_category,
        "location": location,
        "count": len(matches),
        "matches": matches
    }


@router.get("/matching/{lot_id}")
def get_matching_recyclers_for_lot(
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
            detail="Material lot not found"
        )

    matches = find_matching_recyclers(
        db=db,
        material_category=lot.material_category,
        location=lot.location
    )

    if not matches:
        raise HTTPException(
            status_code=404,
            detail="No matching recyclers found for this material lot"
        )

    return {
        "lot_id": lot.lot_id,
        "material_category": lot.material_category,
        "location": lot.location,
        "approximate_weight": lot.approximate_weight,
        "count": len(matches),
        "matches": matches
    }


@router.get("/nearby")
def get_nearby_recyclers(
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

    if not collector:
        raise HTTPException(
            status_code=404,
            detail="Collector profile not found"
        )

    if (
        collector.latitude is None
        or collector.longitude is None
    ):
        raise HTTPException(
            status_code=400,
            detail="Collector location is not available"
        )

    recyclers = find_nearest_recyclers(
        db=db,
        collector_id=collector.id
    )

    if not recyclers:
        raise HTTPException(
            status_code=404,
            detail="No approved recyclers with location found"
        )

    return {
        "collector_location": {
            "latitude": collector.latitude,
            "longitude": collector.longitude
        },
        "count": len(recyclers),
        "recyclers": recyclers
    }


@router.get("/debug-location")
def debug_location(
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

    if not collector:
        raise HTTPException(
            status_code=404,
            detail="Collector profile not found"
        )

    return debug_recycler_matching(
        db=db,
        collector_id=collector.id
    )


@router.get("/distance-test")
def distance_test(
    current_user: User = Depends(
        require_role("collector")
    )
):

    return test_distance_between_points(
        latitude1=28.6821,
        longitude1=77.4986,
        latitude2=28.6864,
        longitude2=77.4903
    )


@router.get("/best-match/{lot_id}")
def get_best_recycler_for_lot(
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
            detail="Material lot not found"
        )

    matches = find_best_recyclers_for_lot(
        db=db,
        collector_id=current_user.id,
        lot_id=lot_id
    )

    if not matches:
        raise HTTPException(
            status_code=404,
            detail="No suitable recyclers found for this lot"
        )

    return {
        "lot_id": lot.lot_id,
        "material_category": lot.material_category,
        "location": lot.location,
        "approximate_weight": lot.approximate_weight,
        "recommended_recycler": matches[0],
        "all_recyclers": matches
    }