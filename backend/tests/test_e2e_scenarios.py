import sys
import os
import io
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.services.ai_service import normalize_weight, STANDARD_MATERIALS

client = TestClient(app)

print("==================================================")
print("KABADIWALA CONNECT ASSISTANT - E2E TEST SUITE")
print("==================================================")

# TEST 1 & Materials Metadata
print("\n[TEST 1] Standard Materials API Endpoint")
res = client.get("/ai/materials")
assert res.status_code == 200
materials = res.json().get("materials", [])
print(f"✓ Retrieved {len(materials)} standard scrap materials.")

# TEST 2: Hindi Welcome & Query
print("\n[TEST 2] Hindi Rate Flow")
res_hi = client.post("/ai/chat", json={"message": "PCB ka rate kya hai?", "language": "hi"})
assert res_hi.status_code == 200
data_hi = res_hi.json()
print("✓ Hindi Reply:", data_hi.get("reply"))
print("✓ Card Type:", data_hi.get("card_type"))
assert data_hi.get("card_type") == "price"
assert "310" in str(data_hi)

# TEST 3: Marathi Welcome & Query
print("\n[TEST 3] Marathi Rate Flow")
res_mr = client.post("/ai/chat", json={"message": "mala copper cha rate sanga", "language": "mr"})
assert res_mr.status_code == 200
data_mr = res_mr.json()
print("✓ Marathi Reply:", data_mr.get("reply"))
assert data_mr.get("card_type") == "price"

# TEST 5 & 6 & 7: Context Memory & Weight Normalization
print("\n[TEST 5, 6, 7] Multi-turn Context Memory & Weight Normalization")
# Turn 1
conv_id = client.post("/ai/session/new").json().get("conversation_id")
res_t1 = client.post("/ai/chat", json={
    "message": "Mere paas 20 kilo PCB hai",
    "language": "hi",
    "conversation_id": conv_id
})
print("Turn 1 Reply:", res_t1.json().get("reply")[:60], "...")

# Turn 2: Pronoun reference "Iska rate batao"
res_t2 = client.post("/ai/chat", json={
    "message": "Iska rate batao",
    "language": "hi",
    "conversation_id": conv_id
})
data_t2 = res_t2.json()
print("Turn 2 (Iska rate):", data_t2.get("reply"))
assert data_t2.get("card_type") == "price"
calc = data_t2.get("card_data", {}).get("calculation")
if calc:
    print(f"✓ Calculated total estimate: {calc.get('weight_kg')} kg * ₹{calc.get('unit_price')} = ₹{calc.get('total_estimated')}")

# TEST 8 & 9: Safety & Guardrails
print("\n[TEST 8 & 9] Safety Guardrails (Cable burning / Acid)")
res_safe = client.post("/ai/chat", json={
    "message": "kya main wire jala sakta hoon?",
    "language": "hi"
})
data_safe = res_safe.json()
print("Safety Warning Reply:", data_safe.get("reply"))
assert data_safe.get("card_type") == "safety"
assert "jala" in str(data_safe.get("reply")).lower() or "savdhani" in str(data_safe.get("reply")).lower()

# TEST 10: Recycler Matching Flow
print("\n[TEST 10] Nearby Recyclers Search")
res_rec = client.post("/ai/chat", json={
    "message": "Nearby recycler dhundo",
    "language": "hi"
})
data_rec = res_rec.json()
print("Recycler Search Card:", data_rec.get("card_type"))
assert data_rec.get("card_type") == "recycler_list"
print(f"✓ Found {data_rec.get('card_data', {}).get('count')} approved recyclers.")

# TEST 13: Multimodal Image Identification Flow
print("\n[TEST 13] Multimodal Image Identification API (/ai/identify-photo)")
# Generate a test image in-memory
test_img = Image.new("RGB", (200, 200), color=(34, 139, 34))
img_byte_arr = io.BytesIO()
test_img.save(img_byte_arr, format="JPEG")
img_byte_arr.seek(0)

res_photo = client.post(
    "/ai/identify-photo",
    files={"file": ("test_circuit.jpg", img_byte_arr, "image/jpeg")},
    data={"language": "hi", "conversation_id": conv_id}
)
assert res_photo.status_code == 200
photo_data = res_photo.json()
print("✓ Photo Analysis Success:", photo_data.get("success"))
print("✓ Identified Material:", photo_data.get("data", {}).get("category"), "-", photo_data.get("data", {}).get("sub_category"))
print("✓ Confidence:", photo_data.get("data", {}).get("confidence"), "%")

# TEST: Weight normalization unit checks
print("\n[Weight Normalization Unit Tests]")
assert normalize_weight("20 kg") == 20.0
assert normalize_weight("25.5 kilo") == 25.5
assert normalize_weight("बीस किलो") == 20.0
assert normalize_weight("500 gm") == 0.5
assert normalize_weight("1.5 ton") == 1500.0
print("✓ All weight normalization unit tests passed (20 kg, 25.5 kilo, बीस किलो, 500 gm, 1.5 ton).")

print("\n==================================================")
print("ALL ASSISTANT E2E TESTS PASSED WITH 100% SUCCESS!")
print("==================================================")
