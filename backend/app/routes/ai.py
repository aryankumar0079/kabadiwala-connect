import os
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database.session import get_db
from app.models.user import User
from app.models.collector import Collector
from app.models.lot import SaleRequest
from app.models.material import MaterialLot
from app.models.offer import RecyclerOffer
from app.services.ai_service import (
    chat_with_ai,
    identify_material_from_image,
    create_chat_session,
    clear_chat_session,
    STANDARD_MATERIALS,
    db_get_current_price,
    db_get_nearby_recyclers,
    process_voice_dialogue
)
from app.services.matching_service import find_best_recyclers_for_lot
from app.models.offer import SaleRequestRecipient
from datetime import datetime, timezone


router = APIRouter(
    prefix="/ai",
    tags=["AI Assistant"]
)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "kabadiwala_connect_super_secret_key_change_this")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Extract authenticated user from Bearer token if provided, otherwise return None."""
    if not authorization:
        return None
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
            if user_id:
                return db.query(User).filter(User.id == user_id, User.status == "active").first()
    except Exception:
        pass
    return None


class AIChatRequest(BaseModel):
    message: str
    language: str = "auto"
    conversation_id: Optional[str] = None


class AIConfirmActionRequest(BaseModel):
    action_type: str  # "sell_lot" or "accept_offer"
    target_id: str     # lot_id or offer_id
    conversation_id: Optional[str] = None


@router.post("/chat")
def ai_chat_endpoint(
    data: AIChatRequest,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    try:
        user_id = current_user.id if current_user else None
        result = chat_with_ai(
            message=data.message,
            language=data.language,
            conversation_id=data.conversation_id,
            user_id=user_id
        )
        return {
            "success": True,
            **result
        }
    except Exception as exc:
        print("AI chat route error:", repr(exc))
        return {
            "success": True,
            "reply": "Thodi technical problem aa gayi hai. Aap dobara try karein.",
            "language": data.language,
            "conversation_id": data.conversation_id,
            "card_type": None,
            "card_data": None
        }


@router.post("/identify-photo")
async def ai_identify_photo_endpoint(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    conversation_id: Optional[str] = Form(None)
):
    """Multimodal scrap identification using Gemini Vision."""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are supported"
        )
        
    try:
        image_bytes = await file.read()
        analysis = identify_material_from_image(
            image_bytes=image_bytes,
            mime_type=file.content_type,
            language=language
        )
        return {
            "success": True,
            "conversation_id": conversation_id,
            **analysis
        }
    except Exception as exc:
        print("AI photo identification error:", repr(exc))
        return {
            "success": False,
            "error": "Failed to analyze photo",
            "fallback_message": "Photo clear nahi aayi. Kripya dobara photo bhejein."
        }


@router.post("/confirm-action")
def ai_confirm_action(
    data: AIConfirmActionRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Execute confirmed transactional action (sell lot or accept offer) after user clicked Confirm."""
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Action confirm karne ke liye login zaroori hai."
        )

    if data.action_type == "sell_lot":
        lot_id = data.target_id
        collector = db.query(Collector).filter(Collector.user_id == current_user.id).first()
        if not collector:
            raise HTTPException(status_code=404, detail="Collector profile nahi mili.")

        lot = db.query(MaterialLot).filter(MaterialLot.lot_id == lot_id, MaterialLot.collector_id == current_user.id).first()
        if not lot:
            raise HTTPException(status_code=404, detail="Lot nahi mila ya aapka nahi hai.")

        existing_req = db.query(SaleRequest).filter(SaleRequest.lot_id == lot.lot_id).first()
        if existing_req:
            return {
                "success": True,
                "message": "Is lot ka sale request pehle se bana hua hai.",
                "sale_request_id": existing_req.id,
                "lot_id": lot.lot_id,
                "status": lot.status
            }

        matched_recyclers = find_best_recyclers_for_lot(db=db, collector_id=collector.id, lot_id=lot.lot_id)
        if not matched_recyclers:
            raise HTTPException(status_code=404, detail="Is lot ke liye koi approved recycler nahi mila.")

        sale_request = SaleRequest(
            lot_id=lot.lot_id,
            collector_id=current_user.id,
            material_category=lot.material_category,
            material_sub_category=lot.material_sub_category,
            weight_kg=lot.approximate_weight,
            location=lot.location,
            estimated_value=lot.estimated_value,
            status="sale_requested",
            request_source="assistant_ai"
        )
        db.add(sale_request)
        db.flush()

        notification_time = datetime.now(timezone.utc)
        for recycler in matched_recyclers:
            recipient = SaleRequestRecipient(
                sale_request_id=sale_request.id,
                recycler_id=recycler["recycler_id"],
                distance_km=recycler.get("distance_km"),
                notified=True,
                notified_at=notification_time,
                status="notified"
            )
            db.add(recipient)

        lot.status = "recyclers_notified"
        db.commit()

        return {
            "success": True,
            "message": f"Badhaai! Lot {lot.lot_id} ka sale request ban gaya hai aur {len(matched_recyclers)} recyclers ko notify kar diya gaya hai.",
            "sale_request_id": sale_request.id,
            "lot_id": lot.lot_id,
            "recyclers_notified": len(matched_recyclers)
        }

    elif data.action_type == "accept_offer":
        try:
            offer_id = int(data.target_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid offer ID.")

        offer = db.query(RecyclerOffer).filter(RecyclerOffer.id == offer_id).first()
        if not offer:
            raise HTTPException(status_code=404, detail="Offer nahi mila.")

        sale_request = db.query(SaleRequest).filter(
            SaleRequest.id == offer.sale_request_id,
            SaleRequest.collector_id == current_user.id
        ).first()

        if not sale_request:
            raise HTTPException(status_code=403, detail="Aap is offer ko accept nahi kar sakte.")

        offer.status = "accepted"
        sale_request.status = "offer_accepted"

        # Mark other offers rejected
        other_offers = db.query(RecyclerOffer).filter(
            RecyclerOffer.sale_request_id == sale_request.id,
            RecyclerOffer.id != offer.id
        ).all()
        for o in other_offers:
            o.status = "rejected"

        lot = db.query(MaterialLot).filter(MaterialLot.lot_id == sale_request.lot_id).first()
        if lot:
            lot.status = "offer_accepted"

        db.commit()

        return {
            "success": True,
            "message": f"Offer #{offer.id} accept kar liya gaya hai. Recycler ke sath handover QR process shuru karein.",
            "offer_id": offer.id,
            "lot_id": sale_request.lot_id,
            "total_amount": offer.total_offer_amount
        }

    raise HTTPException(status_code=400, detail="Unknown action type")


@router.get("/materials")
def get_standard_materials():
    """Returns standard scrap materials and metadata for accessible quick action buttons."""
    return {
        "materials": [
            {
                "key": key,
                "name": val["name"],
                "name_hi": val["hi"],
                "name_mr": val["mr"],
                "unit": val["unit"],
                "sub_categories": val["sub_categories"]
            }
            for key, val in STANDARD_MATERIALS.items()
        ]
    }


@router.post("/session/new")
def new_session():
    """Create a fresh conversation session."""
    session_id = create_chat_session()
    return {
        "conversation_id": session_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }


@router.delete("/session/{session_id}")
def delete_session(session_id: str):
    """Clear memory of a conversation session."""
    success = clear_chat_session(session_id)
    return {"success": success}


class AIVoiceDialogueRequest(BaseModel):
    speech_text: str
    language: str = "hi"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    conversation_id: Optional[str] = None


@router.post("/voice-dialogue")
def ai_voice_dialogue_endpoint(
    data: AIVoiceDialogueRequest,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Voice Assistant endpoint for conversational selling and speech processing."""
    try:
        user_id = current_user.id if current_user else None
        res = process_voice_dialogue(
            speech_text=data.speech_text,
            language=data.language,
            latitude=data.latitude,
            longitude=data.longitude,
            location_name=data.location_name,
            user_id=user_id,
            conversation_id=data.conversation_id
        )
        return {
            "success": True,
            **res
        }
    except Exception as exc:
        print("Voice dialogue error:", repr(exc))
        return {
            "success": False,
            "spoken_text": "Thodi takneeki samasya aa gayi hai. Kripya dobara bolein.",
            "display_text": "Thodi takneeki samasya aa gayi hai. Kripya dobara bolein.",
            "language": data.language
        }

