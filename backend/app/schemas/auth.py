from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class SignupRequest(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=100
    )

    email: Optional[EmailStr] = None

    mobile: str = Field(
        min_length=10,
        max_length=15
    )

    password: str = Field(
        min_length=8,
        max_length=100
    )

    role: str

    # Recycler specific fields
    facility_name: Optional[str] = Field(
        default=None,
        max_length=150
    )

    facility_location: Optional[str] = Field(
        default=None,
        max_length=200
    )

    registration_number: Optional[str] = Field(
        default=None,
        max_length=100
    )

    authorization_type: Optional[str] = Field(
        default=None,
        max_length=100
    )

    service_area: Optional[str] = Field(
        default=None,
        max_length=200
    )

    pickup_available: bool = False


class LoginRequest(BaseModel):

    identifier: str

    password: str


class TokenResponse(BaseModel):

    access_token: str

    token_type: str = "bearer"


class UserResponse(BaseModel):

    id: int
    name: str
    email: Optional[str] = None
    mobile: str
    role: str
    status: str