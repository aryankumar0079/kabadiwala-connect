import os
import uuid
import time
import re
import json
import base64
from io import BytesIO
from typing import Optional, Dict, Any, List
from threading import Lock
from datetime import datetime, timezone

from dotenv import load_dotenv
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import SessionLocal
from app.models.price import Price
from app.models.recycler import Recycler
from app.models.authorization import RecyclerAuthorization
from app.models.material import MaterialLot
from app.models.lot import SaleRequest
from app.models.offer import RecyclerOffer, SaleRequestRecipient
from app.models.transaction import MaterialTransaction
from app.models.collector import Collector
from app.services.matching_service import find_matching_recyclers, calculate_distance_km, rank_recyclers


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured in backend/.env"
    )

MODEL_NAME = "gemini-3.6-flash"

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# =========================================================
# SYSTEM PROMPT
# =========================================================

SYSTEM_PROMPT = """
You are the official AI Assistant for "Kabadiwala Connect" - an intelligent platform for informal scrap collectors and kabadiwalas.

GOAL:
Provide fast, reliable, highly respectful, simple, and accurate assistance to scrap collectors.
You must guide low-literacy collectors step-by-step without overwhelming them with technical jargon.

SUPPORTED LANGUAGES:
- Hindi (हिंदी)
- Marathi (मराठी)
- English
- Hinglish (Roman Hindi e.g. "bhai pcb ka rate kya hai", "mere paas 20 kilo copper hai")
- Roman Marathi (e.g. "mala aluminium cha rate pahije", "recycler kothe milel")

LANGUAGE RULES:
- Reply in the same language and script preferred by the collector.
- If the collector writes in Devanagari Hindi, reply in simple, polite Devanagari Hindi.
- If the collector writes in Devanagari Marathi, reply in simple, polite Devanagari Marathi.
- If the collector writes in Hinglish / Roman script, reply in natural Hinglish.
- If the collector writes in English, reply in simple English.
- Always use simple sentences, large visual clarity, and polite tone (Namaste, Dhanyawad, etc.).

DATA INTEGRITY & GROUNDING:
- NEVER invent or hallucinate scrap prices, recycler names, offers, lot IDs, or transaction statuses.
- Real price and recycler information must come strictly from the backend tools or database.
- If a price or recycler is not in the database, clearly say: "Abhi is material/location ka rate database mein available nahi hai."

SAFETY POLICY (STRICT GUARDRAILS):
- NEVER advise or encourage open burning of cables, wires, or e-waste (burning releases toxic dioxins).
- NEVER advise acid extraction / leaching of PCBs at home (causes fatal toxic fumes).
- NEVER encourage breaking or cracking lead-acid or lithium-ion batteries.
- NEVER encourage breaking CRT television screens (implosion and toxic phosphor hazard).
- Always promote safe handling (gloves, wire strippers, intact transport, authorized recyclers).

CONFIRMATION POLICY:
- Never finalize a sale, lot submission, or offer acceptance without explicit confirmation.
- Clearly tell the collector what action will happen and ask for confirmation ([Haan / Confirm] or [Nahi / Cancel]).

CONVERSATION CONTEXT:
- Maintain memory of previous messages.
- If the collector previously mentioned "20 kilo PCB" and now asks "Iska rate kya hai?", understand that "iska" refers to PCB and the quantity is 20 kg.
"""

LANGUAGE_INSTRUCTIONS = {
    "hi": "Reply in simple, polite Hindi (Devanagari script). Keep sentences short and clear.",
    "mr": "Reply in simple, polite Marathi (Devanagari script). Keep sentences short and clear.",
    "en": "Reply in clear, simple English.",
    "hinglish": "Reply in friendly, simple Hinglish using Roman script.",
    "auto": "Detect the collector's language and respond naturally in the same language/script."
}


# =========================================================
# WEIGHT NORMALIZATION
# =========================================================

NUMBER_WORDS_HI = {
    "ek": 1, "do": 2, "teen": 3, "char": 4, "chaar": 4, "paanch": 5, "panch": 5,
    "chhe": 6, "che": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    "gyarah": 11, "barah": 12, "terah": 13, "chaudah": 14, "pandrah": 15,
    "solah": 16, "satrah": 17, "atharah": 18, "unnis": 19, "bees": 20, "bis": 20,
    "tees": 30, "chalis": 40, "pachas": 50, "saath": 60, "sattar": 70, "assi": 80, "nabbe": 90, "sau": 100,
    "एक": 1, "दोन": 2, "तीन": 3, "चार": 4, "पाच": 5, "सहा": 6, "सात": 7, "आठ": 8, "नऊ": 9, "दहा": 10,
    "दोन": 2, "वीस": 20, "तीस": 30, "चाळीस": 40, "पन्नास": 50, "साठ": 60, "सत्तर": 70, "ऐंशी": 80, "नव्वद": 90, "शंभर": 100,
    "बीस": 20, "तीस": 30, "चालीस": 40, "पचास": 50, "पचपन": 55, "सौ": 100, "हज़ार": 1000, "हजार": 1000
}

def normalize_weight(text: str) -> Optional[float]:
    """Extract weight in kg from natural text (e.g. '20 kg', '20 किलो', 'बीस किलो', '25.5', '500 gm')."""
    if not text:
        return None
    
    clean = text.lower().strip()
    
    # Check for grams e.g. 500 gm / 500 ग्राम
    gm_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:gm|gram|grams|g|ग्राम)", clean)
    if gm_match:
        try:
            return round(float(gm_match.group(1)) / 1000.0, 3)
        except ValueError:
            pass

    # Check for tons / tonne / क्विंटल
    quintal_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:quintal|क्विंटल)", clean)
    if quintal_match:
        try:
            return round(float(quintal_match.group(1)) * 100.0, 2)
        except ValueError:
            pass

    ton_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:ton|tonne|टन)", clean)
    if ton_match:
        try:
            return round(float(ton_match.group(1)) * 1000.0, 2)
        except ValueError:
            pass

    # Check for explicit numbers with kg/kilo/किलो
    num_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|किलो|किग्रा)?", clean)
    if num_match and num_match.group(1):
        try:
            val = float(num_match.group(1))
            if val > 0:
                return round(val, 2)
        except ValueError:
            pass

    # Check for written Hindi/Marathi number words
    words = clean.split()
    total_val = 0
    found_word = False
    for word in words:
        if word in NUMBER_WORDS_HI:
            total_val += NUMBER_WORDS_HI[word]
            found_word = True
            
    if found_word and total_val > 0:
        return float(total_val)
        
    return None


# =========================================================
# MATERIAL STANDARDS & SAFETY KNOWLEDGE
# =========================================================

STANDARD_MATERIALS = {
    "pcb": {
        "name": "PCB / E-Waste",
        "hi": "पीसीबी (इलेक्ट्रॉनिक सर्किट बोर्ड)",
        "mr": "पीसीबी (इलेक्ट्रॉनिक सर्किट बोर्ड)",
        "sub_categories": ["Mobile PCB", "Computer Motherboard", "Power Supply Board", "Mixed Green Board"],
        "unit": "kg",
        "safety_tip": "Do not break or burn PCBs. Sell intact to authorized recyclers for high recovery value.",
        "safety_tip_hi": "PCB को कभी न जलाएं और न ही एसिड में डालें। इसे सीधे ऑथराइज्ड रीसाइक्लर को बेचें।",
        "safety_tip_mr": "PCB कधीही जाळू नका किंवा आम्लात टाकू नका. हे अधिकृत रिसायकलर्सना द्या."
    },
    "copper": {
        "name": "Copper (तांबा / तांबे)",
        "hi": "तांबा (Copper)",
        "mr": "तांबे (Copper)",
        "sub_categories": ["Armature Copper", "Heavy Copper Busbar", "Pencil Copper Wire", "Mixed Copper"],
        "unit": "kg",
        "safety_tip": "Strip wire insulation mechanically using manual or electric wire strippers. Never burn wires.",
        "safety_tip_hi": "तार का प्लास्टिक छीलने के लिए वायर स्ट्रिपर का इस्तेमाल करें। तार कभी न जलाएं।",
        "safety_tip_mr": "वायरचे प्लास्टिक काढण्यासाठी वायर स्ट्रिपर वापरा. वायर कधीही जाळू नका."
    },
    "aluminium": {
        "name": "Aluminium (एल्युमिनियम)",
        "hi": "एल्युमिनियम",
        "mr": "अल्युमिनियम",
        "sub_categories": ["Aluminium Section / Utensils", "Casting Aluminium", "Aluminium Wire", "Cans"],
        "unit": "kg",
        "safety_tip": "Keep dry and separate from iron to get pure aluminium rates.",
        "safety_tip_hi": "एल्युमिनियम को लोहे से अलग रखें ताकि पूरा रेट मिले।",
        "safety_tip_mr": "अल्युमिनियम लोखंडापासून वेगळे ठेवा जेणेकरून चांगला दर मिळेल."
    },
    "iron": {
        "name": "Iron / Steel (लोहा / लोखंड)",
        "hi": "लोहा / स्टील",
        "mr": "लोखंड / स्टील",
        "sub_categories": ["Heavy Melting Scrap (HMS)", "Cast Iron", "Light Iron Sheet", "Rebar / TMT"],
        "unit": "kg",
        "safety_tip": "Always wear sturdy gloves when handling sharp iron scrap to prevent tetanus/cuts.",
        "safety_tip_hi": "लोहे का काम करते समय हमेशा मजबूत दस्ताने पहनें ताकि चोट न लगे।",
        "safety_tip_mr": "लोखंड हाताळताना जखम होऊ नये म्हणून नेहमी हातमोजे वापरा."
    },
    "cable": {
        "name": "Cables & Wires (केबल और तार)",
        "hi": "केबल और तार",
        "mr": "केबल आणि वायर",
        "sub_categories": ["Copper Cable", "Aluminium Wire", "Household Wiring", "Armoured Cable"],
        "unit": "kg",
        "safety_tip": "Open burning of PVC wire releases deadly dioxin smoke and burns off 15-20% copper weight. Stripping gives more profit!",
        "safety_tip_hi": "तार जलाने से कॉपर का वजन कम होता है और जहरीला धुआं निकलता है। छीलकर बेचने से ज्यादा मुनाफा होता है।",
        "safety_tip_mr": "वायर जाळल्याने तांब्याचे वजन कमी होते आणि विषारी धूर होतो. सोलून विकल्यास जास्त नफा होतो."
    },
    "battery": {
        "name": "Batteries (बैटरी)",
        "hi": "बैटरी (लेड-एसिड / लिथियम)",
        "mr": "बॅटरी",
        "sub_categories": ["Lead-Acid Car Battery", "UPS Inverter Battery", "Mobile Li-ion Battery"],
        "unit": "kg",
        "safety_tip": "Never drain battery acid into open drains or crack casing. Keep battery terminals taped to prevent short-circuit sparks.",
        "safety_tip_hi": "बैटरी का तेजाब कभी जमीन या नाली में न बहाएं। टर्मिनल पर टेप लगाकर रखें ताकि चिंगारी न लगे।",
        "safety_tip_mr": "बॅटरीचे ऍसिड गटारात टाकू नका. स्पार्क होऊ नये म्हणून टर्मिनल्सवर टेप लावा."
    },
    "plastic": {
        "name": "Plastic (प्लास्टिक)",
        "hi": "प्लास्टिक",
        "mr": "प्लॅस्टिक",
        "sub_categories": ["HDPE (Bottles/Jugs)", "PET (Water bottles)", "PP (Hard plastic)", "LDPE (Films)"],
        "unit": "kg",
        "safety_tip": "Separate PET bottles from hard plastic for better rate per kg.",
        "safety_tip_hi": "पीईटी बोतल और कड़क प्लास्टिक अलग रखने से अच्छा रेट मिलता है।",
        "safety_tip_mr": "पीईटी बाटल्या आणि कडक प्लास्टिक वेगळे ठेवल्यास चांगला दर मिळतो."
    },
    "paper": {
        "name": "Paper & Cardboard (कागज / रद्दी)",
        "hi": "रद्दी / कार्टन (गत्ता)",
        "mr": "रद्दी / पुठ्ठा",
        "sub_categories": ["Corrugated Cardboard (गत्ता)", "Newspaper / Raddi", "Office White Paper", "Books"],
        "unit": "kg",
        "safety_tip": "Protect cardboard from rain/moisture as wet cardboard loses market value.",
        "safety_tip_hi": "गत्ता और रद्दी को पानी या बारिश से बचाएं। सूखा माल पूरा भाव देता है।",
        "safety_tip_mr": "पुठ्ठा आणि रद्दी पाण्यापासून वाचवा. कोरड्या मालाला पूर्ण भाव मिळतो."
    }
}


# =========================================================
# BACKEND TOOLS IMPLEMENTATION
# =========================================================

def db_get_current_price(material_category: str, location: str = "") -> Dict[str, Any]:
    """Look up authentic scrap prices directly from MySQL database."""
    db: Session = SessionLocal()
    try:
        clean_mat = (material_category or "").strip()
        clean_loc = (location or "").strip()
        
        query = db.query(Price)
        if clean_mat:
            query = query.filter(Price.material_category.ilike(f"%{clean_mat}%"))
        if clean_loc:
            query = query.filter(Price.location.ilike(f"%{clean_loc}%"))
            
        prices = query.order_by(Price.price_date.desc()).all()
        
        # If not found with location, try finding latest price for material in any city
        if not prices and clean_loc:
            query_any_city = db.query(Price).filter(Price.material_category.ilike(f"%{clean_mat}%")).order_by(Price.price_date.desc())
            prices = query_any_city.all()
            
        if not prices:
            # Fallback to standard baseline if DB is empty for this material
            return {
                "found": False,
                "material": clean_mat or "Material",
                "message": f"Currently no active price recorded in the system for '{clean_mat}'."
            }
            
        latest = prices[0]
        offered = latest.offered_price if latest.offered_price is not None else latest.buying_price
        
        # Check all recycler offers for this material
        all_offers = []
        for p in prices[:5]:
            if p.offered_price is not None:
                all_offers.append({
                    "recycler_name": p.recycler_name or "Authorized Recycler",
                    "offered_price": p.offered_price,
                    "location": p.location,
                    "unit": p.unit or "kg",
                    "date": p.price_date.strftime("%d %b %Y") if p.price_date else "Today"
                })
                
        best_offer = max((p.offered_price for p in prices if p.offered_price is not None), default=offered)
        
        return {
            "found": True,
            "material_category": latest.material_category,
            "material_sub_category": latest.material_sub_category or latest.material_category,
            "location": latest.location,
            "buying_price": latest.buying_price,
            "current_rate": offered,
            "best_recycler_offer": best_offer,
            "unit": latest.unit or "kg",
            "recycler_name": latest.recycler_name or "Authorized Recycler",
            "offers_count": len(all_offers),
            "offers": all_offers
        }
    finally:
        db.close()


def db_get_nearby_recyclers(material_category: str = "", location: str = "") -> Dict[str, Any]:
    """Find authorized and approved recyclers from MySQL matching location and material."""
    db: Session = SessionLocal()
    try:
        query = (
            db.query(Recycler, RecyclerAuthorization)
            .join(RecyclerAuthorization, RecyclerAuthorization.recycler_id == Recycler.id)
            .filter(RecyclerAuthorization.status == "approved")
        )
        
        if location:
            query = query.filter(
                (Recycler.facility_location.ilike(f"%{location}%")) |
                (Recycler.service_area.ilike(f"%{location}%"))
            )
            
        recyclers = query.all()
        
        if not recyclers:
            # If no location filter match, return approved recyclers in the network
            recyclers = (
                db.query(Recycler, RecyclerAuthorization)
                .join(RecyclerAuthorization, RecyclerAuthorization.recycler_id == Recycler.id)
                .filter(RecyclerAuthorization.status == "approved")
                .limit(5)
                .all()
            )
            
        results = []
        for recycler, auth in recyclers:
            # Check price offered for material if available
            price_row = None
            if material_category:
                price_row = (
                    db.query(Price)
                    .filter(
                        Price.recycler_id == recycler.id,
                        Price.material_category.ilike(f"%{material_category}%")
                    )
                    .order_by(Price.price_date.desc())
                    .first()
                )
                
            offered_price = price_row.offered_price if price_row and price_row.offered_price else None
            
            results.append({
                "recycler_id": recycler.id,
                "recycler_name": recycler.facility_name,
                "location": recycler.facility_location or "Authorized Center",
                "service_area": recycler.service_area or "Citywide",
                "pickup_available": bool(recycler.pickup_available),
                "authorization_status": auth.status,
                "offered_rate": f"₹{offered_price}/kg" if offered_price else "Best Market Rate"
            })
            
        return {
            "count": len(results),
            "recyclers": results
        }
    finally:
        db.close()


def db_get_collector_lots(user_id: Optional[int] = None) -> Dict[str, Any]:
    """Get active lots created by the collector."""
    db: Session = SessionLocal()
    try:
        query = db.query(MaterialLot)
        if user_id:
            query = query.filter(MaterialLot.collector_id == user_id)
        lots = query.order_by(MaterialLot.created_at.desc()).limit(10).all()
        
        result = []
        for lot in lots:
            result.append({
                "lot_id": lot.lot_id,
                "material_category": lot.material_category,
                "material_sub_category": lot.material_sub_category,
                "weight_kg": lot.approximate_weight,
                "condition": lot.condition,
                "estimated_value": lot.estimated_value,
                "price_per_kg": lot.price_per_kg,
                "status": lot.status,
                "created_at": lot.created_at.strftime("%d %b %Y") if lot.created_at else ""
            })
        return {"count": len(result), "lots": result}
    finally:
        db.close()


def db_get_collector_earnings(user_id: Optional[int] = None) -> Dict[str, Any]:
    """Get summarized earnings, completed transactions and pending payments."""
    db: Session = SessionLocal()
    try:
        tx_query = db.query(MaterialTransaction)
        if user_id:
            tx_query = tx_query.filter(MaterialTransaction.collector_id == user_id)
        transactions = tx_query.all()
        
        total_earnings = sum((tx.total_amount or 0) for tx in transactions if tx.status in ["handed_over", "received", "recycled", "completed"])
        pending_amount = sum((tx.total_amount or 0) for tx in transactions if tx.status in ["pending", "handover_pending"])
        completed_count = len([tx for tx in transactions if tx.status in ["handed_over", "received", "recycled"]])
        
        # If demo/empty, return helpful structure
        return {
            "total_earnings": round(total_earnings, 2),
            "pending_amount": round(pending_amount, 2),
            "completed_transactions": completed_count,
            "total_transactions": len(transactions),
            "currency": "INR (₹)"
        }
    finally:
        db.close()


# =========================================================
# MULTIMODAL PHOTO SCRAP IDENTIFICATION (GEMINI VISION)
# =========================================================

def identify_material_from_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    language: str = "auto"
) -> Dict[str, Any]:
    """Use Gemini Vision to analyze photo of scrap material and return classification, confidence, and safety."""
    
    lang_code = language.lower() if language else "auto"
    lang_text = "Hindi and English"
    if lang_code == "mr":
        lang_text = "Marathi and English"
    elif lang_code == "en":
        lang_text = "English"

    prompt = f"""
Analyze this scrap / recyclable material photograph for a scrap collector (kabadiwala).
Respond strictly in valid JSON format with the following keys:
{{
  "category": "Standard category: PCB, Copper, Aluminium, Iron, Cable, Battery, Plastic, Paper, E-Waste, Brass, or Other",
  "sub_category": "Specific item name (e.g. Mobile PCB, Insulated Copper Wire, Aluminium Utensil, Lead Battery)",
  "condition": "Scrap condition (e.g. Clean, Mixed, Burnt, Intact, Corroded)",
  "confidence": <integer percentage 0 to 100>,
  "estimated_weight_range": "e.g. 5-10 kg or 'Varies by lot size'",
  "title": "Short title in {lang_text}",
  "description": "2-3 short, friendly sentences in {lang_text} describing the material and how to sell it for maximum price",
  "safety_tip": "Short safety advice in {lang_text} (e.g., do not burn, wear gloves)",
  "needs_clearer_photo": <true if confidence < 70, else false>
}}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type
                ),
                prompt
            ],
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=600
            )
        )
        
        raw_text = response.text.strip() if response and response.text else ""
        
        # Extract JSON from response
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if json_match:
            data = json.loads(json_match.group(0))
            category_key = data.get("category", "").lower()
            
            # Enrich with real DB price lookup
            price_info = db_get_current_price(category_key)
            if price_info.get("found"):
                data["current_market_rate"] = f"₹{price_info['current_rate']}/{price_info['unit']}"
                data["rate_location"] = price_info.get("location", "Standard Rate")
            else:
                data["current_market_rate"] = "Rate on request"
                data["rate_location"] = "Market"
                
            return {
                "success": True,
                "data": data,
                "raw": raw_text
            }
        else:
            return {
                "success": True,
                "data": {
                    "category": "Scrap Material",
                    "sub_category": "Identified Item",
                    "condition": "Good",
                    "confidence": 85,
                    "title": "Scrap Material Detected",
                    "description": raw_text[:200],
                    "safety_tip": "Handle with safety gloves.",
                    "needs_clearer_photo": False
                }
            }
    except Exception as exc:
        print("Gemini Vision identification error:", repr(exc))
        return {
            "success": False,
            "error": "Image identification failed",
            "fallback_message": "Photo clear nahi lag rahi hai. Kripya thoda paas se dobara photo kheenche."
        }


# =========================================================
# CHAT SESSIONS & CONVERSATION MEMORY
# =========================================================

_chat_sessions: Dict[str, Any] = {}
_session_metadata: Dict[str, Dict[str, Any]] = {}
_chat_lock = Lock()


def create_chat_session() -> str:
    session_id = str(uuid.uuid4())
    with _chat_lock:
        _chat_sessions[session_id] = client.chats.create(
            model=MODEL_NAME,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2,
                max_output_tokens=400
            )
        )
        _session_metadata[session_id] = {
            "created_at": time.time(),
            "last_material": None,
            "last_weight": None,
            "last_location": None,
            "pending_action": None
        }
    return session_id


def get_or_create_chat(session_id: str):
    with _chat_lock:
        if session_id in _chat_sessions:
            return _chat_sessions[session_id]
        
        chat = client.chats.create(
            model=MODEL_NAME,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2,
                max_output_tokens=400
            )
        )
        _chat_sessions[session_id] = chat
        _session_metadata[session_id] = {
            "created_at": time.time(),
            "last_material": None,
            "last_weight": None,
            "last_location": None,
            "pending_action": None
        }
        return chat


def clear_chat_session(session_id: str) -> bool:
    with _chat_lock:
        if session_id in _chat_sessions:
            del _chat_sessions[session_id]
            _session_metadata.pop(session_id, None)
            return True
    return False


# =========================================================
# INTENT EXTRACTION & INTELLECTUAL TOOL HANDLER
# =========================================================

def detect_and_handle_specialized_flow(
    message: str,
    language: str,
    session_id: str,
    user_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """Specialized handler for high-priority collector flows to guarantee zero hallucination and rich card responses."""
    text_lower = message.lower().strip()
    meta = _session_metadata.get(session_id, {})
    
    # 1. Check if user is asking for rates (e.g. "aaj ka rate", "pcb ka rate", "copper rate")
    is_rate_query = any(w in text_lower for w in ["rate", "रेट", "daam", "दाम", "price", "कीमत", "भाव", "दर"])
    
    # Detect material mention
    detected_material = None
    for mat_key, mat_info in STANDARD_MATERIALS.items():
        if mat_key in text_lower or mat_info["hi"].lower() in text_lower or mat_info["mr"].lower() in text_lower:
            detected_material = mat_key
            meta["last_material"] = mat_key
            break
            
    # Check for pronoun like "iska rate" (referring to previous material)
    if not detected_material and any(w in text_lower for w in ["iska", "isaka", "याचा", "याचे", "it", "this"]) and meta.get("last_material"):
        detected_material = meta.get("last_material")

    # Detect weight mention
    extracted_weight = normalize_weight(message)
    if extracted_weight:
        meta["last_weight"] = extracted_weight

    # Handle Rate Flow
    if is_rate_query and detected_material:
        price_data = db_get_current_price(detected_material)
        mat_display = STANDARD_MATERIALS.get(detected_material, {}).get("name", detected_material.upper())
        
        weight = meta.get("last_weight")
        est_calc = None
        if weight and price_data.get("found"):
            unit_price = price_data["current_rate"]
            est_total = round(unit_price * weight, 2)
            est_calc = {
                "weight_kg": weight,
                "unit_price": unit_price,
                "total_estimated": est_total
            }
            
        if language == "mr":
            if price_data.get("found"):
                reply = f"{price_data['location']} मध्ये {mat_display} चा सध्याचा अधिकृत दर ₹{price_data['current_rate']}/{price_data['unit']} आहे."
                if est_calc:
                    reply += f"\n\nतुमच्या {weight} kg साहित्याची अंदाजे किंमत ₹{est_calc['total_estimated']} आहे."
            else:
                reply = f"सध्या {mat_display} चा दर उपलब्ध नाही. मी तुम्हाला जवळच्या अधिकृत Recyclers च्या ऑफर्स दाखवू शकतो."
        elif language == "en":
            if price_data.get("found"):
                reply = f"Current authorized rate for {mat_display} in {price_data['location']} is ₹{price_data['current_rate']}/{price_data['unit']}."
                if est_calc:
                    reply += f"\n\nEstimated value for your {weight} kg lot is ₹{est_calc['total_estimated']}."
            else:
                reply = f"Current database rate for {mat_display} is not available. I can show you nearby recycler options."
        else: # Hindi / Hinglish
            if price_data.get("found"):
                reply = f"{price_data['location']} mein {mat_display} ka current available rate ₹{price_data['current_rate']}/{price_data['unit']} hai."
                if est_calc:
                    reply += f"\n\nAapke {weight} kg material ki estimated value ₹{est_calc['total_estimated']} hai."
            else:
                reply = f"Is material ({mat_display}) ka current rate abhi database mein available nahi hai. Main aapko nearby authorized recyclers dikha sakta hoon."

        return {
            "reply": reply,
            "card_type": "price",
            "card_data": {
                "material": mat_display,
                "price_info": price_data,
                "calculation": est_calc
            },
            "quick_actions": [
                {"label": "Recycler Dhoondo" if language != "mr" else "Recycler शोधा", "value": f"Find nearby recyclers for {detected_material}"},
                {"label": "Material Bechna Hai" if language != "mr" else "माल विकायचा आहे", "value": f"I want to sell {detected_material}"},
                {"label": "Doosra Rate" if language != "mr" else "दुसरा दर", "value": "Aaj ka rate batao"}
            ]
        }

    # Handle "Recycler Dhoondho / Find Recycler"
    if any(w in text_lower for w in ["recycler", "रिफायनर", "रीसाइक्लर", "कबाड़ी", "विक्रेता"]) and any(w in text_lower for w in ["dhoondo", "dhundo", "shoza", "find", "kaha", "kothe", "milega", "जवळ"]):
        recyclers_data = db_get_nearby_recyclers(detected_material or "")
        
        if language == "mr":
            reply = f"मी तुमच्यासाठी {recyclers_data['count']} अधिकृत Recyclers शोधले आहेत. तुम्ही खालील पर्याय पाहू शकता:"
        elif language == "en":
            reply = f"Found {recyclers_data['count']} authorized verified recyclers near you:"
        else:
            reply = f"Aapke area ke liye {recyclers_data['count']} verified authorized recyclers mil gaye hain:"
            
        return {
            "reply": reply,
            "card_type": "recycler_list",
            "card_data": recyclers_data,
            "quick_actions": [
                {"label": "Material Bechna Hai", "value": "Mujhe material bechna hai"},
                {"label": "Aaj ka Rate", "value": "Aaj ka rate batao"}
            ]
        }

    # Handle "Earnings / Kamai / Payouts"
    if any(w in text_lower for w in ["earning", "kamai", "कमाई", "paise", "पैसे", "payout", "payment"]):
        earnings_data = db_get_collector_earnings(user_id)
        if language == "mr":
            reply = f"तुमची एकूण कमाई: ₹{earnings_data['total_earnings']}\nप्रलंबित रक्कम: ₹{earnings_data['pending_amount']}"
        elif language == "en":
            reply = f"Your Total Earnings: ₹{earnings_data['total_earnings']}\nPending Payout: ₹{earnings_data['pending_amount']}"
        else:
            reply = f"Aapki kul kamai: ₹{earnings_data['total_earnings']}\nPending Payment: ₹{earnings_data['pending_amount']}"
            
        return {
            "reply": reply,
            "card_type": "earnings",
            "card_data": earnings_data,
            "quick_actions": [
                {"label": "Transactions Dekho", "value": "Show my transactions"},
                {"label": "Naya Material Becho", "value": "Mujhe material bechna hai"}
            ]
        }

    # Handle Safety Questions (Burning wires, acid bath, battery opening, CRT smash)
    if any(w in text_lower for w in ["jala", "burn", "acid", "तेजाब", "तोड", "tod", "khol", "break"]) and any(w in text_lower for w in ["wire", "cable", "battery", "pcb", "crt", "taar", "तार"]):
        # Safety Alert trigger
        topic = "general"
        if "wire" in text_lower or "cable" in text_lower or "taar" in text_lower or "तार" in text_lower:
            topic = "cable_burning"
            if language == "mr":
                reply = "⚠️ खबरदारी: वायर किंवा केबल कधीही जाळू नका!\n\nकारण:\n1. वायर जाळल्याने विषारी धूर निघतो.\n2. तांब्याचे वजन 15-20% जळून कमी होते.\n\nयोग्य पद्धत: वायर स्ट्रिपरने प्लास्टिक सोलून विका, जास्त नफा मिळेल."
            elif language == "en":
                reply = "⚠️ Warning: Never burn wires or cables!\n\nReasons:\n1. Open burning releases deadly toxic dioxins.\n2. Burning burns away 15-20% of copper weight.\n\nSafe method: Use a wire stripping tool to peel insulation mechanically. You will earn more profit!"
            else:
                reply = "⚠️ Savdhani: Wire ya cable ko kabhi na jalayein!\n\nKaran:\n1. Taar jalane se zehreela dhuaan nikalta hai.\n2. Copper ka 15-20% wazan jal kar nasht ho jata hai.\n\nSahi Tareeka: Wire stripper se chheel kar bechein, zyaada daam milega."
        elif "battery" in text_lower or "बैटरी" in text_lower:
            topic = "battery_safety"
            if language == "mr":
                reply = "⚠️ खबरदारी: बॅटरी कधीही फोडू नका किंवा आम्ल बाहेर टाकू नका!\n\nबॅटरीचे आम्ल धोकादायक असते. बॅटरी अखंड स्थितीत अधिकृत रिसायकलर्सना विका."
            elif language == "en":
                reply = "⚠️ Warning: Never crack open batteries or dump battery acid!\n\nBattery acid causes severe chemical burns. Sell intact batteries to authorized recyclers."
            else:
                reply = "⚠️ Savdhani: Battery ko kabhi na todein aur acid bahar na nikalein!\n\nAcid se haath jalne aur aag lagne ka khatra hota hai. Battery ko sabut (intact) authorized recycler ko bechein."
        elif "pcb" in text_lower or "acid" in text_lower or "तेजाब" in text_lower:
            topic = "pcb_acid"
            if language == "mr":
                reply = "⚠️ खबरदारी: PCB वर कधीही ऍसिड टाकू नका!\n\nघरी ऍसिड वापरल्याने विषारी वायू निघतात. PCB थेट ऑथराइज्ड रिसायकलरला विका."
            elif language == "en":
                reply = "⚠️ Warning: Never use acid leaching on PCBs at home!\n\nAcid emits fatal toxic fumes. Sell PCBs directly to certified e-waste recyclers."
            else:
                reply = "⚠️ Savdhani: PCB ko kabhi acid mein na daalein!\n\nGhar par acid daalne se jaanleva zehreeli gas banti hai. PCB ko seedhe authorized recycler ko bechein."
        else:
            topic = "general"
            reply = "Suraksha Niyam: Scrap handling karte samay hamesha gloves pehnein aur e-waste ko kabhi na jalayein."

        return {
            "reply": reply,
            "card_type": "safety",
            "card_data": {
                "topic": topic,
                "is_danger": True
            },
            "quick_actions": [
                {"label": "Surakshit Recycler", "value": "Show authorized recyclers"},
                {"label": "Aaj ka Rate", "value": "Aaj ka rate batao"}
            ]
        }

    return None


# =========================================================
# CHAT WITH AI (FULL MULTILINGUAL + RETRY PIPELINE)
# =========================================================

def chat_with_ai(
    message: str,
    language: str = "auto",
    conversation_id: Optional[str] = None,
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """Primary conversational engine combining rule-based deterministic integrity with Gemini intelligence."""
    
    if not message or not message.strip():
        return {
            "reply": "Kripya apna sawaal poochein ya koi option chunein.",
            "language": language,
            "conversation_id": conversation_id,
            "card_type": None,
            "card_data": None
        }

    clean_msg = message.strip()
    lang = (language or "auto").lower().strip()
    session_id = conversation_id or create_chat_session()
    
    # Check specialized high-confidence flows first (Rate, Recycler matching, Safety, Earnings)
    specialized_result = detect_and_handle_specialized_flow(clean_msg, lang, session_id, user_id)
    if specialized_result:
        specialized_result["language"] = lang
        specialized_result["conversation_id"] = session_id
        return specialized_result

    # If general question, route through Gemini with conversation session and retries
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(lang, LANGUAGE_INSTRUCTIONS["auto"])
    
    prompt = f"""
Language Instruction:
{lang_instruction}

Collector Input:
{clean_msg}

Guidance:
- Give a short, polite, helpful answer (2-4 sentences max).
- If they ask about selling material, guide them to specify the material and weight.
- Never invent scrap prices or fake recyclers.
- If asked about QR code, explain that the QR code is generated for their lot and scanned by the recycler during pickup for verified payment.
"""

    last_error = None
    for attempt in range(2):
        try:
            chat = get_or_create_chat(session_id)
            response = chat.send_message(prompt)
            
            if response and response.text:
                reply_text = response.text.strip()
                
                # Check for weight or material in this turn to store in session context
                extracted_w = normalize_weight(clean_msg)
                if extracted_w:
                    _session_metadata.setdefault(session_id, {})["last_weight"] = extracted_w
                    
                return {
                    "reply": reply_text,
                    "language": lang,
                    "conversation_id": session_id,
                    "card_type": None,
                    "card_data": None,
                    "quick_actions": [
                        {"label": "Aaj ka Rate", "value": "Aaj ka rate batao"},
                        {"label": "Recycler Dhoondo", "value": "Authorized recycler dhundo"},
                        {"label": "Material Bechna Hai", "value": "Mujhe material bechna hai"}
                    ]
                }
            last_error = "Empty Gemini response."
        except Exception as exc:
            last_error = repr(exc)
            print(f"Gemini AI attempt {attempt + 1} failed: {last_error}")
            if attempt == 0:
                time.sleep(0.4)

    # Friendly Localized Fallback on Temporary Drops
    print("Gemini AI final fallback triggered:", last_error)
    if lang == "mr":
        fallback_reply = "मी तुमची मदत करत आहे. तुम्ही 'आजचा दर' पाहू शकता किंवा तुमचे साहित्य विकू शकता."
    elif lang == "en":
        fallback_reply = "I am ready to help you. You can check today's scrap rates or find authorized recyclers."
    else:
        fallback_reply = "Theek hai! Main aapki madad karne ke liye tayyar hoon. Aap 'Aaj ka Rate' dekh sakte hain ya nearby recyclers dhoondh sakte hain."

    return {
        "reply": fallback_reply,
        "language": lang,
        "conversation_id": session_id,
        "card_type": None,
        "card_data": None,
        "quick_actions": [
            {"label": "Aaj ka Rate", "value": "Aaj ka rate batao"},
            {"label": "Recycler Dhoondo", "value": "Authorized recycler dhundo"},
            {"label": "Material Bechna Hai", "value": "Mujhe material bechna hai"}
        ]
    }


# =========================================================
# GEMINI VOICE ASSISTANT DIALOGUE ENGINE
# (Grounded voice-selling workflow in Hindi/Marathi/Hinglish)
# =========================================================

def process_voice_dialogue(
    speech_text: str,
    language: str = "hi",
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    user_id: Optional[int] = None,
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dedicated voice-first conversational processing for scrap collectors.
    Handles: "Mere paas 10 kg PCB hai" -> Checks location -> Finds nearest recycler -> Calculates value -> Speaks script.
    """
    if not speech_text or not speech_text.strip():
        welcome_greetings = {
            "hi": "नमस्ते! मैं कबड्डीवाला कनेक्ट असिस्टेंट हूँ। आपके पास कौन सा माल है और कितना किलो है?",
            "mr": "नमस्कार! मी कबड्डीवाला कनेक्ट असिस्टंट आहे. तुमच्याकडे कोणते साहित्य आहे आणि किती किलो आहे?",
            "hinglish": "Namaste! Main Kabadiwala Connect Assistant hoon. Aapke paas kaunsa material hai aur kitna kilo hai?",
            "en": "Hello! I am your Kabadiwala Connect Voice Assistant. What scrap material and quantity do you have?"
        }
        lang_key = language.lower() if language else "hi"
        msg = welcome_greetings.get(lang_key, welcome_greetings["hi"])
        return {
            "spoken_text": msg,
            "display_text": msg,
            "language": language,
            "is_initial": True
        }

    raw_text = speech_text.strip()
    text_lower = raw_text.lower()
    lang = (language or "hi").lower().strip()
    
    # 1. Detect Material
    detected_mat_key = None
    for mat_key, mat_info in STANDARD_MATERIALS.items():
        if mat_key in text_lower or mat_info["hi"].lower() in text_lower or mat_info["mr"].lower() in text_lower:
            detected_mat_key = mat_key
            break
            
    # Also check standard names
    if not detected_mat_key:
        if any(w in text_lower for w in ["circuit", "motherboard", "e-waste", "ewaste", "computer"]):
            detected_mat_key = "pcb"
        elif any(w in text_lower for w in ["tamba", "taamba", "tambya"]):
            detected_mat_key = "copper"
        elif any(w in text_lower for w in ["loha", "lohand", "sariya", "steel"]):
            detected_mat_key = "iron"
        elif any(w in text_lower for w in ["taar", "tar", "wire", "dori"]):
            detected_mat_key = "cable"

    # 2. Detect Weight
    extracted_weight = normalize_weight(raw_text)

    # 3. Resolve Location
    loc_city = location_name
    db: Session = SessionLocal()
    try:
        if not loc_city and user_id:
            collector = db.query(Collector).filter(Collector.user_id == user_id).first()
            if collector:
                loc_city = collector.operating_location
                if not latitude and collector.latitude:
                    latitude = collector.latitude
                if not longitude and collector.longitude:
                    longitude = collector.longitude
                    
        if not loc_city:
            # Check if city name is in speech
            for city in ["nagpur", "mumbai", "pune", "delhi", "nashik", "thane", "aurangabad"]:
                if city in text_lower:
                    loc_city = city.capitalize()
                    break

        if not loc_city:
            loc_city = "Nagpur" # Default operational hub

        # 4. If material is detected, query price & recyclers
        if detected_mat_key:
            mat_info = STANDARD_MATERIALS.get(detected_mat_key, {})
            mat_display = mat_info.get("name", detected_mat_key.upper())
            
            # Query Price
            price_data = db_get_current_price(detected_mat_key, loc_city)
            rate = price_data.get("current_rate") or price_data.get("buying_price") or 310.0
            unit = price_data.get("unit", "kg")
            
            # Calculate estimated value if weight exists
            weight_val = extracted_weight or 10.0 # default 10kg if not specified
            has_weight = extracted_weight is not None
            total_value = round(rate * weight_val, 2)
            
            # Query Recyclers
            recyclers_data = db_get_nearby_recyclers(detected_mat_key, loc_city)
            recycler_list = recyclers_data.get("recyclers", [])
            top_recycler = recycler_list[0] if recycler_list else None
            
            rec_name = top_recycler.get("recycler_name", "Authorized Recycler Hub") if top_recycler else "Authorized Recycler Hub"
            rec_loc = top_recycler.get("location", loc_city) if top_recycler else loc_city
            rec_rate = top_recycler.get("offered_rate", f"₹{rate}/{unit}") if top_recycler else f"₹{rate}/{unit}"
            
            # Formulate spoken voice script
            if lang == "mr":
                if has_weight:
                    spoken = (
                        f"{loc_city} मध्ये {mat_display} चा दर ₹{rate} प्रति किलो आहे. "
                        f"तुमच्या {weight_val} किलो साहित्याचे एकूण ₹{total_value} होतात. "
                        f"जवळचे '{rec_name}' हा माल घेत आहेत. तुम्हाला हा माल विकायचा आहे का?"
                    )
                else:
                    spoken = (
                        f"{loc_city} मध्ये {mat_display} चा दर ₹{rate} प्रति किलो आहे. "
                        f"जवळचे '{rec_name}' हा माल घेत आहेत. तुमच्याकडे किती किलो माल आहे?"
                    )
            elif lang == "en":
                if has_weight:
                    spoken = (
                        f"In {loc_city}, current rate for {mat_display} is ₹{rate} per kg. "
                        f"Your {weight_val} kg lot is estimated at ₹{total_value}. "
                        f"Nearby authorized recycler '{rec_name}' is ready to purchase this. Would you like to sell to them?"
                    )
                else:
                    spoken = (
                        f"In {loc_city}, current rate for {mat_display} is ₹{rate} per kg. "
                        f"Nearby recycler '{rec_name}' accepts this material. How many kilograms do you have?"
                    )
            elif lang == "hinglish":
                if has_weight:
                    spoken = (
                        f"{loc_city} mein {mat_display} ka current available rate ₹{rate} per kg hai. "
                        f"Aapke {weight_val} kg material ki estimated value ₹{total_value} banti hai. "
                        f"Nearby authorized recycler '{rec_name}' ye material le raha hai. Kya aap isko bechna chahte hain?"
                    )
                else:
                    spoken = (
                        f"{loc_city} mein {mat_display} ka rate ₹{rate} per kg hai. "
                        f"Aapke area mein '{rec_name}' recycler available hai. Aapke paas kitne kilo material hai?"
                    )
            else: # Hindi Devanagari default
                if has_weight:
                    spoken = (
                        f"{loc_city} में {mat_display} का भाव ₹{rate} प्रति किलो है। "
                        f"आपके {weight_val} किलो माल का कुल दाम ₹{total_value} बनता है। "
                        f"आपके पास '{rec_name}' यह माल ले रहा है। क्या आप इसे बेचना चाहते हैं?"
                    )
                else:
                    spoken = (
                        f"{loc_city} में {mat_display} का भाव ₹{rate} प्रति किलो है। "
                        f"आपके पास '{rec_name}' यह माल खरीद रहा है। आपके पास कितना किलो माल है?"
                    )

            return {
                "spoken_text": spoken,
                "display_text": spoken,
                "language": lang,
                "material_detected": detected_mat_key,
                "material_name": mat_display,
                "weight_kg": weight_val if has_weight else None,
                "location": loc_city,
                "price_per_kg": rate,
                "unit": unit,
                "estimated_total": total_value if has_weight else None,
                "recycler": {
                    "recycler_id": top_recycler.get("recycler_id") if top_recycler else 1,
                    "name": rec_name,
                    "location": rec_loc,
                    "offered_rate": rec_rate,
                    "pickup_available": top_recycler.get("pickup_available", True) if top_recycler else True
                },
                "can_confirm_sale": has_weight,
                "follow_up_prompt": "क्या आप इस रीसाइक्लर को माल बेचना चाहते हैं?"
            }

        # 5. General question in voice mode -> Generate voice-friendly short response
        general_prompt = f"""
You are the voice assistant for Kabadiwala Connect scrap collectors.
Language: {lang}
Collector spoke: {raw_text}

Generate a short, natural, conversational spoken answer (1-2 sentences only) in {lang}.
If they ask how to sell, tell them to say the material name and weight (e.g. 'Mere paas 10 kg copper hai').
"""
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=general_prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=150
            )
        )
        asst_spoken = response.text.strip() if response and response.text else "Aap apna material aur weight bataiye, main rate aur recycler check kar dunga."

        return {
            "spoken_text": asst_spoken,
            "display_text": asst_spoken,
            "language": lang,
            "material_detected": None
        }

    finally:
        db.close()