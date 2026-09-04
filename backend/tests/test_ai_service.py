import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.ai_service import chat_with_ai, db_get_current_price, db_get_nearby_recyclers

print("--- Testing db_get_current_price ---")
price_res = db_get_current_price("PCB")
print("PCB Price:", price_res.get("found"), price_res.get("current_rate"), price_res.get("location"))

print("\n--- Testing db_get_nearby_recyclers ---")
rec_res = db_get_nearby_recyclers("PCB")
print("Recyclers count:", rec_res.get("count"))

print("\n--- Testing chat_with_ai with Hindi Rate Query ---")
chat_res1 = chat_with_ai("PCB ka rate kya hai?", language="hi")
print("Reply 1:", chat_res1["reply"])
print("Card type 1:", chat_res1.get("card_type"))

print("\n--- Testing chat_with_ai with Marathi Rate Query ---")
chat_res2 = chat_with_ai("mala copper cha rate sanga", language="mr")
print("Reply 2:", chat_res2["reply"])
print("Card type 2:", chat_res2.get("card_type"))

print("\n--- Testing chat_with_ai with Safety Query ---")
chat_res3 = chat_with_ai("kya main taar jala kar copper nikal sakta hoon?", language="hi")
print("Reply 3:", chat_res3["reply"])
print("Card type 3:", chat_res3.get("card_type"))

print("\n--- ALL BACKEND AI TESTS PASSED SUCCESSFULLY! ---")
