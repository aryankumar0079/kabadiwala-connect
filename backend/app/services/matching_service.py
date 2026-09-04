from math import radians, sin, cos, sqrt, atan2

from sqlalchemy.orm import Session

from app.models.price import Price
from app.models.collector import Collector
from app.models.recycler import Recycler
from app.models.authorization import RecyclerAuthorization


def find_matching_recyclers(
    db: Session,
    material_category: str,
    location: str
):

    matches = (
        db.query(
            Recycler,
            Price
        )
        .join(
            Price,
            Price.recycler_id == Recycler.id
        )
        .join(
            RecyclerAuthorization,
            RecyclerAuthorization.recycler_id == Recycler.id
        )
        .filter(
            Price.material_category == material_category,
            Price.location == location,
            Price.offered_price.isnot(None),
            RecyclerAuthorization.status == "approved"
        )
        .order_by(
            Price.offered_price.desc()
        )
        .all()
    )

    results = []

    for recycler, price in matches:

        results.append({
            "recycler_id": recycler.id,
            "recycler_name": recycler.facility_name,
            "location": recycler.facility_location,
            "offered_price": price.offered_price,
            "unit": price.unit,
            "pickup_available": recycler.pickup_available,
            "service_area": recycler.service_area
        })

    return results


def calculate_distance_km(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float
):
    """
    Calculate distance between two GPS coordinates
    using the Haversine formula.
    """

    earth_radius_km = 6371.0

    lat1 = radians(latitude1)
    lon1 = radians(longitude1)

    lat2 = radians(latitude2)
    lon2 = radians(longitude2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )

    distance = earth_radius_km * c

    return round(distance, 2)


def test_distance_between_points(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float
):
    """
    Test the Haversine distance calculation.
    """

    distance = calculate_distance_km(
        latitude1,
        longitude1,
        latitude2,
        longitude2
    )

    return {
        "origin": {
            "latitude": latitude1,
            "longitude": longitude1
        },
        "destination": {
            "latitude": latitude2,
            "longitude": longitude2
        },
        "distance_km": distance
    }


def debug_recycler_matching(
    db: Session,
    collector_id: int
):

    collector = (
        db.query(Collector)
        .filter(
            Collector.id == collector_id
        )
        .first()
    )

    if not collector:
        return {
            "collector_found": False
        }

    recyclers = (
        db.query(
            Recycler,
            RecyclerAuthorization
        )
        .join(
            RecyclerAuthorization,
            RecyclerAuthorization.recycler_id == Recycler.id
        )
        .filter(
            RecyclerAuthorization.status == "approved"
        )
        .all()
    )

    result = []

    for recycler, authorization in recyclers:

        result.append({
            "recycler_id": recycler.id,
            "facility_name": recycler.facility_name,
            "recycler_latitude": recycler.latitude,
            "recycler_longitude": recycler.longitude,
            "authorization_status": authorization.status
        })

    return {
        "collector_id": collector.id,
        "collector_user_id": collector.user_id,
        "collector_latitude": collector.latitude,
        "collector_longitude": collector.longitude,
        "approved_recyclers": result
    }


def find_nearest_recyclers(
    db: Session,
    collector_id: int
):
    """
    Find approved recyclers having valid GPS coordinates
    and return them ordered by distance from the collector.
    """

    collector = (
        db.query(Collector)
        .filter(
            Collector.id == collector_id
        )
        .first()
    )

    if not collector:
        return []

    if (
        collector.latitude is None
        or collector.longitude is None
    ):
        return []

    approved_recyclers = (
        db.query(Recycler)
        .join(
            RecyclerAuthorization,
            RecyclerAuthorization.recycler_id == Recycler.id
        )
        .filter(
            RecyclerAuthorization.status == "approved"
        )
        .all()
    )

    results = []

    for recycler in approved_recyclers:

        if (
            recycler.latitude is None
            or recycler.longitude is None
        ):
            continue

        distance = calculate_distance_km(
            collector.latitude,
            collector.longitude,
            recycler.latitude,
            recycler.longitude
        )

        results.append({
            "recycler_id": recycler.id,
            "recycler_name": recycler.facility_name,
            "facility_location": recycler.facility_location,
            "latitude": recycler.latitude,
            "longitude": recycler.longitude,
            "distance_km": distance,
            "pickup_available": recycler.pickup_available,
            "service_area": recycler.service_area
        })

    results.sort(
        key=lambda x: x["distance_km"]
    )

    return results


def rank_recyclers(
    recyclers
):
    """
    Rank recyclers using:
    60% price
    40% distance
    """

    if not recyclers:
        return []

    valid_recyclers = [
        recycler
        for recycler in recyclers
        if recycler.get("offered_price") is not None
        and recycler.get("distance_km") is not None
    ]

    if not valid_recyclers:
        return []

    max_price = max(
        recycler["offered_price"]
        for recycler in valid_recyclers
    )

    max_distance = max(
        recycler["distance_km"]
        for recycler in valid_recyclers
    )

    ranked = []

    for recycler in valid_recyclers:

        price = recycler["offered_price"]
        distance = recycler["distance_km"]

        # Higher price = higher score
        if max_price > 0:
            price_score = (
                price / max_price
            ) * 100
        else:
            price_score = 0

        # Shorter distance = higher score
        if len(valid_recyclers) == 1:
            distance_score = 100

        elif max_distance > 0:
            distance_score = (
                1 - (distance / max_distance)
            ) * 100

        else:
            distance_score = 100

        match_score = (
            price_score * 0.60
            + distance_score * 0.40
        )

        recycler_result = recycler.copy()

        recycler_result["price_score"] = round(
            price_score,
            2
        )

        recycler_result["distance_score"] = round(
            distance_score,
            2
        )

        recycler_result["match_score"] = round(
            match_score,
            2
        )

        ranked.append(recycler_result)

    ranked.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    return ranked


def find_best_recyclers_for_lot(
    db: Session,
    collector_id: int,
    lot_id: str
):
    """
    Find approved recyclers for a specific material lot
    and rank them using price + distance.
    """

    # --------------------------------------------------
    # 1. Find collector profile
    # --------------------------------------------------

    collector = (
        db.query(Collector)
        .filter(
            Collector.id == collector_id
        )
        .first()
    )

    if not collector:
        return []

    if (
        collector.latitude is None
        or collector.longitude is None
    ):
        return []


    # --------------------------------------------------
    # 2. Find material lot
    # --------------------------------------------------

    from app.models.material import MaterialLot

    lot = (
        db.query(MaterialLot)
        .filter(
            MaterialLot.lot_id == lot_id,

            # IMPORTANT:
            # MaterialLot.collector_id stores User ID,
            # while collector_id argument is Collector.id.
            MaterialLot.collector_id == collector.user_id
        )
        .first()
    )

    if not lot:
        return []


    # --------------------------------------------------
    # 3. Find approved recyclers + their prices
    # --------------------------------------------------

    matches = (
        db.query(
            Recycler,
            Price
        )
        .join(
            Price,
            Price.recycler_id == Recycler.id
        )
        .join(
            RecyclerAuthorization,
            RecyclerAuthorization.recycler_id == Recycler.id
        )
        .filter(
            RecyclerAuthorization.status == "approved",

            Price.material_category
            == lot.material_category,

            Price.location
            == lot.location,

            Price.offered_price.isnot(None),

            Recycler.latitude.isnot(None),

            Recycler.longitude.isnot(None)
        )
        .order_by(
            Price.price_date.desc()
        )
        .all()
    )


    if not matches:
        return []


    # --------------------------------------------------
    # 4. Keep latest price of each recycler
    # --------------------------------------------------

    latest_prices = {}

    for recycler, price in matches:

        if recycler.id not in latest_prices:

            latest_prices[recycler.id] = (
                recycler,
                price
            )


    # --------------------------------------------------
    # 5. Calculate distance + prepare results
    # --------------------------------------------------

    results = []

    for recycler, price in latest_prices.values():

        distance = calculate_distance_km(
            collector.latitude,
            collector.longitude,
            recycler.latitude,
            recycler.longitude
        )

        results.append({

            "recycler_id": recycler.id,

            "recycler_name": recycler.facility_name,

            "facility_location": (
                recycler.facility_location
            ),

            "latitude": recycler.latitude,

            "longitude": recycler.longitude,

            "distance_km": distance,

            "offered_price": price.offered_price,

            "unit": price.unit,

            "pickup_available": (
                recycler.pickup_available
            ),

            "service_area": (
                recycler.service_area
            )
        })


    if not results:
        return []


    # --------------------------------------------------
    # 6. Rank using price + distance
    # --------------------------------------------------

    return rank_recyclers(results)