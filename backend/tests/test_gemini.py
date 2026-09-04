import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

try:
    chat = client.chats.create(
        model="gemini-3.6-flash",
        config=types.GenerateContentConfig(
            system_instruction="You are a helpful scrap recycling assistant. Keep replies brief.",
            temperature=0.2,
            max_output_tokens=200
        )
    )
    res = chat.send_message("Namaste! Ek chhota sa greeting do.")
    print("SUCCESS_CHAT_OUTPUT:", res.text)
except Exception as e:
    print("ERROR:", repr(e))
