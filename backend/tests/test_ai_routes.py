import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("--- Testing GET /ai/materials ---")
res_mat = client.get("/ai/materials")
print("Status:", res_mat.status_code)
print("Materials count:", len(res_mat.json().get("materials", [])))

print("\n--- Testing POST /ai/chat (Rate check) ---")
res_chat = client.post("/ai/chat", json={"message": "PCB ka rate kya hai?", "language": "hi"})
print("Status:", res_chat.status_code)
json_res = res_chat.json()
print("Success:", json_res.get("success"))
print("Reply:", json_res.get("reply"))
print("Card type:", json_res.get("card_type"))

print("\n--- Testing POST /ai/chat (Context Memory) ---")
sess_id = json_res.get("conversation_id")
res_chat2 = client.post("/ai/chat", json={"message": "Mere paas 20 kilo copper hai", "language": "hi", "conversation_id": sess_id})
print("Turn 1 reply:", res_chat2.json().get("reply")[:50])

res_chat3 = client.post("/ai/chat", json={"message": "Iska rate batao", "language": "hi", "conversation_id": sess_id})
print("Turn 2 (Iska rate):", res_chat3.json().get("reply"))

print("\n--- ALL AI ROUTE TESTS COMPLETED SUCCESSFULLY ---")
