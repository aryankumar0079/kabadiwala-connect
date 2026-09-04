from sqlalchemy.orm import Session

from app.models.price import Price


def get_material_price(
    db: Session,
    material_category: str,
    location: str
):

    price = (
        db.query(Price)
        .filter(
            Price.material_category == material_category,
            Price.location == location
        )
        .order_by(
            Price.price_date.desc()
        )
        .first()
    )

    if not price:
        return None

    return {
        "material_category": price.material_category,
        "material_sub_category": price.material_sub_category,
        "location": price.location,
        "buying_price": price.buying_price,
        "selling_price": price.selling_price,
        "offered_price": price.offered_price,
        "unit": price.unit,
        "recycler_name": price.recycler_name,
        "price_date": price.price_date
    }


def calculate_estimated_value(
    db: Session,
    material_category: str,
    location: str,
    weight: float
):

    price_data = get_material_price(
        db,
        material_category,
        location
    )

    if not price_data:
        return {
            "estimated_value": None,
            "price_per_kg": None,
            "message": "Price not available for this material and location"
        }

    price_per_kg = price_data["offered_price"]

    if price_per_kg is None:
        price_per_kg = price_data["buying_price"]

    estimated_value = price_per_kg * weight

    return {
        "estimated_value": round(
            estimated_value,
            2
        ),
        "price_per_kg": price_per_kg,
        "price_data": price_data,
        "message": "Estimated price calculated successfully"
    }