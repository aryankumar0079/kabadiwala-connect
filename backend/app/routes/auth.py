from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db

from app.models.user import User
from app.models.collector import Collector
from app.models.recycler import Recycler
from app.models.authorization import RecyclerAuthorization

from app.schemas.auth import SignupRequest, LoginRequest

from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/signup")
def signup(
    data: SignupRequest,
    db: Session = Depends(get_db)
):

    # --------------------------------
    # 1. Only collector/recycler signup
    # --------------------------------

    if data.role not in ["collector", "recycler"]:

        raise HTTPException(
            status_code=400,
            detail="Only collector and recycler signup is allowed"
        )

    # --------------------------------
    # 2. Check duplicate mobile
    # --------------------------------

    existing_mobile = (
        db.query(User)
        .filter(User.mobile == data.mobile)
        .first()
    )

    if existing_mobile:

        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered"
        )

    # --------------------------------
    # 3. Check duplicate email
    # --------------------------------

    if data.email:

        existing_email = (
            db.query(User)
            .filter(User.email == data.email)
            .first()
        )

        if existing_email:

            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    # --------------------------------
    # 4. Recycler validation
    # --------------------------------

    if data.role == "recycler":

        if not data.facility_name:

            raise HTTPException(
                status_code=400,
                detail="Facility name is required for recycler"
            )

        if not data.facility_location:

            raise HTTPException(
                status_code=400,
                detail="Facility location is required for recycler"
            )

        if not data.registration_number:

            raise HTTPException(
                status_code=400,
                detail="Registration number is required for recycler"
            )

        if not data.authorization_type:

            raise HTTPException(
                status_code=400,
                detail="Authorization type is required for recycler"
            )

    # --------------------------------
    # 5. Hash password
    # --------------------------------

    hashed_password = hash_password(
        data.password
    )

    # --------------------------------
    # 6. Create User
    # --------------------------------

    user = User(
        name=data.name,
        email=data.email,
        mobile=data.mobile,
        password_hash=hashed_password,
        role=data.role,
        status="active"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # --------------------------------
    # 7. Collector
    # --------------------------------

    if data.role == "collector":

        collector = Collector(
            user_id=user.id,
            preferred_language="Hindi",
            operating_location=None
        )

        db.add(collector)

    # --------------------------------
    # 8. Recycler
    # --------------------------------

    elif data.role == "recycler":

        recycler = Recycler(
            user_id=user.id,
            facility_name=data.facility_name,
            facility_location=data.facility_location,
            contact_number=data.mobile,
            pickup_available=data.pickup_available,
            service_area=data.service_area
        )

        db.add(recycler)
        db.commit()
        db.refresh(recycler)

        # --------------------------------
        # 9. Create authorization record
        # --------------------------------

        authorization = RecyclerAuthorization(
            recycler_id=recycler.id,
            registration_number=data.registration_number,
            authorization_type=data.authorization_type,
            status="pending"
        )

        db.add(authorization)

    # --------------------------------
    # 10. Final database commit
    # --------------------------------

    db.commit()

    # --------------------------------
    # 11. Response
    # --------------------------------

    if data.role == "recycler":

        return {
            "message": "Recycler signup submitted successfully",
            "user_id": user.id,
            "recycler_id": recycler.id,
            "role": "recycler",
            "authorization_status": "pending"
        }

    return {
        "message": "Collector signup successful",
        "user_id": user.id,
        "role": "collector"
    }


# ============================================================
#  THIS WAS THE BUG: previously indented 4 spaces, making it
#  nested (and unreachable) inside signup(). Now at module
#  level, same indentation as @router.post("/signup") above,
#  so FastAPI actually registers this route.
# ============================================================

@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):

    # --------------------------------
    # 1. Find user by mobile or email
    # --------------------------------

    user = (
        db.query(User)
        .filter(
            (User.mobile == data.identifier)
            | (User.email == data.identifier)
        )
        .first()
    )

    # --------------------------------
    # 2. User not found
    # --------------------------------

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid mobile/email or password"
        )

    # --------------------------------
    # 3. Verify password
    # --------------------------------

    password_valid = verify_password(
        data.password,
        user.password_hash
    )

    if not password_valid:

        raise HTTPException(
            status_code=401,
            detail="Invalid mobile/email or password"
        )

    # --------------------------------
    # 4. Check account status
    # --------------------------------

    if user.status != "active":

        raise HTTPException(
            status_code=403,
            detail="Account is not active"
        )

    # --------------------------------
    # 5. Create JWT token
    # --------------------------------

    access_token = create_access_token({
        "user_id": user.id,
        "role": user.role
    })

    # --------------------------------
    # 6. Return token
    # --------------------------------

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role
    }