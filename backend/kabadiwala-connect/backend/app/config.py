import os

from dotenv import load_dotenv


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# GEOAPIFY CONFIGURATION
# =========================================================

GEOAPIFY_API_KEY = os.getenv(
    "GEOAPIFY_API_KEY"
)


if not GEOAPIFY_API_KEY:
    raise RuntimeError(
        "GEOAPIFY_API_KEY is not configured in backend/.env"
    )