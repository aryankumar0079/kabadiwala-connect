from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db

from app.models.user import User
from app.models.recycler import Recycler
from app.models.authorization import RecyclerAuthorization
from app.auth.dependencies import (
    get_current_user,
    require_role
)


router = APIRouter(
    prefix="/test",
    tags=["Authorization Test"]
)


@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):

    return {
        "message": "Authenticated user",
        "user_id": current_user.id,
        "name": current_user.name,
        "role": current_user.role
    }


@router.get("/collector-only")
def collector_only(
    current_user: User = Depends(
        require_role("collector")
    )
):

    return {
        "message": "Collector access granted",
        "user_id": current_user.id,
        "role": current_user.role
    }


@router.get("/recycler-only")
def recycler_only(
    current_user: User = Depends(
        require_role("recycler")
    )
):

    return {
        "message": "Recycler access granted",
        "user_id": current_user.id,
        "role": current_user.role
    }


@router.get("/admin-only")
def admin_only(
    current_user: User = Depends(
        require_role("admin")
    )
):

    return {
        "message": "Admin access granted",
        "user_id": current_user.id,
        "role": current_user.role
    }


@router.get("/admin/pending-recyclers")
def get_pending_recyclers(
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

    recyclers = (
        db.query(RecyclerAuthorization)
        .filter(
            RecyclerAuthorization.status == "pending"
        )
        .all()
    )

    result = []

    for authorization in recyclers:

        recycler = (
            db.query(Recycler)
            .filter(
                Recycler.id == authorization.recycler_id
            )
            .first()
        )

        if recycler:

            user = (
                db.query(User)
                .filter(
                    User.id == recycler.user_id
                )
                .first()
            )

            result.append({
                "authorization_id": authorization.id,
                "recycler_id": recycler.id,
                "user_id": user.id if user else None,
                "name": user.name if user else None,
                "email": user.email if user else None,
                "facility_name": recycler.facility_name,
                "facility_location": recycler.facility_location,
                "authorization_status": authorization.status
            })

    return {
        "count": len(result),
        "recyclers": result
    }


@router.put("/admin/approve/{recycler_id}")
def approve_recycler(
    recycler_id: int,
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

    authorization = (
        db.query(RecyclerAuthorization)
        .filter(
            RecyclerAuthorization.recycler_id == recycler_id
        )
        .first()
    )

    if not authorization:
        raise HTTPException(
            status_code=404,
            detail="Authorization record not found"
        )

    authorization.status = "approved"

    db.commit()
    db.refresh(authorization)

    return {
        "message": "Recycler approved successfully",
        "recycler_id": recycler_id,
        "authorization_status": authorization.status
    }
@router.put("/admin/reject/{recycler_id}")
def reject_recycler(
    recycler_id: int,
    current_user: User = Depends(
        require_role("admin")
    ),
    db: Session = Depends(get_db)
):

    authorization = (
        db.query(RecyclerAuthorization)
        .filter(
            RecyclerAuthorization.recycler_id == recycler_id
        )
        .first()
    )

    if not authorization:
        raise HTTPException(
            status_code=404,
            detail="Authorization record not found"
        )

    authorization.status = "rejected"

    db.commit()
    db.refresh(authorization)

    return {
        "message": "Recycler rejected successfully",
        "recycler_id": recycler_id,
        "authorization_status": authorization.status
    }
@router.get("/my-status")
def get_my_authorization_status(
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
            RecyclerAuthorization.recycler_id == recycler.id
        )
        .first()
    )

    if not authorization:
        return {
            "recycler_id": recycler.id,
            "authorization_status": "not_submitted"
        }

    return {
        "recycler_id": recycler.id,
        "authorization_status": authorization.status
    }