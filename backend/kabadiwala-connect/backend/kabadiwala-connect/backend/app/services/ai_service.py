import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured in backend/.env")

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-2.5-flash"


SYSTEM_PROMPT = """
You are the AI assistant for Kabadiwala Connect.

Your role:
- Help waste collectors use the Kabadiwala Connect application.
- Understand Hindi, Hinglish, Marathi, and English.
- Keep responses simple and easy to understand.
- Prefer Hindi or the language requested by the user.
- Explain things clearly for users who may have limited literacy.
- Help with scrap materials such as iron, copper, aluminium, plastic, paper,
  cardboard, PCB, e-waste and other recyclable materials.
- Never invent prices, recycler information, user information, or transaction data.
- If actual application data is required, it must come from backend services/tools.
- Do not claim that an action was completed unless the backend actually completed it.

For normal conversation:
- Be concise.
- Give practical answers.
- For voice responses, use natural conversational language.
"""


def chat_with_ai(message: str, language: str = "hi") -> str:
    """
    Send a user message to Gemini and return the AI response.
    """

    if not message or not message.strip():
        return "Please tell me what you need help with."

    language_instruction = {
        "hi": "Reply mainly in Hindi. You may use simple English words when useful.",
        "mr": "Reply mainly in Marathi. You may use simple English words when useful.",
        "en": "Reply in simple English.",
        "hinglish": "Reply in simple Hinglish using Roman script."
    }.get(language.lower(), "Reply in simple Hindi.")

    prompt = f"""
{SYSTEM_PROMPT}

Language instruction:
{language_instruction}

Collector's message:
{message}

Respond naturally and helpfully.
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        if not response or not response.text:
            return "Sorry, I could not generate a response right now."

        return response.text.strip()

    except Exception as e:
        print(f"Gemini AI error: {e}")
        return "Sorry, AI service is temporarily unavailable. Please try again."