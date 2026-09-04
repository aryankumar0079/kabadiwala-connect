import httpx

from app.config import GEOAPIFY_API_KEY


# =========================================================
# GEOAPIFY REVERSE GEOCODING
# =========================================================

async def reverse_geocode(
    latitude: float,
    longitude: float
):
    """
    Convert latitude/longitude into a readable location
    using Geoapify Reverse Geocoding API.
    """

    url = (
        "https://api.geoapify.com/v1/geocode/reverse"
    )

    params = {
        "lat": latitude,
        "lon": longitude,
        "apiKey": GEOAPIFY_API_KEY
    }

    try:

        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:

            response = await client.get(
                url,
                params=params
            )

        response.raise_for_status()

        data = response.json()

        features = data.get(
            "features",
            []
        )

        if not features:
            return {
                "success": False,
                "message": "Location address not found.",
                "address": None,
                "city": None,
                "district": None,
                "state": None,
                "postcode": None
            }

        properties = features[0].get(
            "properties",
            {}
        )

        return {
            "success": True,
            "message": "Location resolved successfully.",
            "address": properties.get(
                "formatted"
            ),
            "city": properties.get(
                "city"
            ),
            "district": (
                properties.get("district")
                or properties.get("county")
            ),
            "state": properties.get(
                "state"
            ),
            "postcode": properties.get(
                "postcode"
            ),
            "country": properties.get(
                "country"
            ),
            "latitude": latitude,
            "longitude": longitude
        }

    except httpx.HTTPStatusError as exc:

        return {
            "success": False,
            "message": (
                "Geoapify request failed: "
                f"HTTP {exc.response.status_code}"
            ),
            "address": None,
            "city": None,
            "district": None,
            "state": None,
            "postcode": None
        }

    except httpx.RequestError as exc:

        return {
            "success": False,
            "message": (
                "Unable to connect to Geoapify."
            ),
            "error": str(exc),
            "address": None,
            "city": None,
            "district": None,
            "state": None,
            "postcode": None
        }

    except Exception as exc:

        return {
            "success": False,
            "message": (
                "Unexpected error while resolving location."
            ),
            "error": str(exc),
            "address": None,
            "city": None,
            "district": None,
            "state": None,
            "postcode": None
        }