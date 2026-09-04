from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.price import Price

from app.auth.dependencies import require_role
from app.models.user import User
from app.models.authorization import RecyclerAuthorization


router = APIRouter(
    prefix="/price",
    tags=["Price"]
)


@router.get("/current")
def get_current_price(
    material_category: str,
    location: str,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
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
        raise HTTPException(
            status_code=404,
            detail="Price not available"
        )

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
@router.get("/history")
def get_price_history(
    material_category: str,
    location: str,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    prices = (
        db.query(Price)
        .filter(
            Price.material_category == material_category,
            Price.location == location
        )
        .order_by(
            Price.price_date.desc()
        )
        .all()
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail="Price history not available"
        )

    result = []

    for price in prices:

        result.append({
            "material_category": price.material_category,
            "material_sub_category": price.material_sub_category,
            "location": price.location,
            "buying_price": price.buying_price,
            "selling_price": price.selling_price,
            "offered_price": price.offered_price,
            "unit": price.unit,
            "recycler_name": price.recycler_name,
            "price_date": price.price_date
        })

    return {
        "material_category": material_category,
        "location": location,
        "count": len(result),
        "history": result
    }
@router.get("/trend")
def get_price_trend(
    material_category: str,
    location: str,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    prices = (
        db.query(Price)
        .filter(
            Price.material_category == material_category,
            Price.location == location
        )
        .order_by(
            Price.price_date.asc()
        )
        .all()
    )

    if len(prices) < 2:
        raise HTTPException(
            status_code=404,
            detail="Not enough price data to calculate trend"
        )

    first_price = prices[0].offered_price

    last_price = prices[-1].offered_price

    if first_price is None:
        first_price = prices[0].buying_price

    if last_price is None:
        last_price = prices[-1].buying_price

    price_change = last_price - first_price

    percentage_change = (
        price_change / first_price
    ) * 100

    if percentage_change > 2:
        trend = "increasing"

    elif percentage_change < -2:
        trend = "decreasing"

    else:
        trend = "stable"

    return {
        "material_category": material_category,
        "location": location,
        "first_price": first_price,
        "latest_price": last_price,
        "price_change": round(
            price_change,
            2
        ),
        "percentage_change": round(
            percentage_change,
            2
        ),
        "trend": trend,
        "data_points": len(prices)
    }
@router.get("/board")
def get_price_board(
    material_category: str,
    location: str,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    prices = (
        db.query(Price)
        .filter(
            Price.material_category == material_category,
            Price.location == location
        )
        .order_by(
            Price.price_date.desc()
        )
        .all()
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail="No price data available"
        )

    latest_price = prices[0]

    current_price = latest_price.offered_price

    if current_price is None:
        current_price = latest_price.buying_price

    previous_price = None

    if len(prices) > 1:

        previous_price = prices[1].offered_price

        if previous_price is None:
            previous_price = prices[1].buying_price

    price_change = None
    percentage_change = None

    if previous_price is not None:

        price_change = current_price - previous_price

        if previous_price != 0:

            percentage_change = (
                price_change / previous_price
            ) * 100

    if percentage_change is None:

        trend = "not_available"

    elif percentage_change > 2:

        trend = "increasing"

    elif percentage_change < -2:

        trend = "decreasing"

    else:

        trend = "stable"

    history = []

    for price in prices:

        history.append({
            "offered_price": (
                price.offered_price
                if price.offered_price is not None
                else price.buying_price
            ),
            "price_date": price.price_date,
            "recycler_name": price.recycler_name
        })

    return {

        "material_category": material_category,

        "location": location,

        "unit": latest_price.unit,

        "current_price": current_price,

        "buying_price": latest_price.buying_price,

        "selling_price": latest_price.selling_price,

        "recycler_name": latest_price.recycler_name,

        "trend": trend,

        "price_change": (
            round(price_change, 2)
            if price_change is not None
            else None
        ),

        "percentage_change": (
            round(percentage_change, 2)
            if percentage_change is not None
            else None
        ),

        "history_count": len(history),

        "history": history
    }
@router.get("/offers")
def get_recycler_offers(
    material_category: str,
    location: str,
    current_user: User = Depends(
        require_role("collector")
    ),
    db: Session = Depends(get_db)
):

    prices = (
        db.query(Price)
        .join(
            RecyclerAuthorization,
            Price.recycler_id == RecyclerAuthorization.recycler_id
        )
        .filter(
            Price.material_category == material_category,
            Price.location == location,
            Price.offered_price.isnot(None),
            Price.recycler_id.isnot(None),
            RecyclerAuthorization.status == "approved"
        )
        .order_by(
            Price.recycler_id,
            Price.price_date.desc()
        )
        .all()
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail="No approved recycler offers available"
        )

    latest_offers = {}

    for price in prices:

        if price.recycler_id not in latest_offers:

            latest_offers[price.recycler_id] = {
                "recycler_id": price.recycler_id,
                "recycler_name": price.recycler_name,
                "material_category": price.material_category,
                "material_sub_category": price.material_sub_category,
                "location": price.location,
                "offered_price": price.offered_price,
                "unit": price.unit,
                "price_date": price.price_date
            }

    offers = list(latest_offers.values())

    offers.sort(
        key=lambda x: x["offered_price"],
        reverse=True
    )

    return {
        "material_category": material_category,
        "location": location,
        "count": len(offers),
        "offers": offers
    }

    prices = (
        db.query(Price)
        .join(
            RecyclerAuthorization,
            Price.recycler_id == RecyclerAuthorization.recycler_id
        )
        .filter(
            Price.material_category == material_category,
            Price.location == location,
            Price.offered_price.isnot(None),
            Price.recycler_id.isnot(None),
            RecyclerAuthorization.status == "approved"
        )
        .order_by(
            Price.offered_price.desc()
        )
        .all()
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail="No approved recycler offers available"
        )

    offers = []

    for price in prices:

        offers.append({
            "recycler_id": price.recycler_id,
            "recycler_name": price.recycler_name,
            "material_category": price.material_category,
            "material_sub_category": price.material_sub_category,
            "location": price.location,
            "offered_price": price.offered_price,
            "unit": price.unit,
            "price_date": price.price_date
        })

    return {
        "material_category": material_category,
        "location": location,
        "count": len(offers),
        "offers": offers
    }

    prices = (
        db.query(Price)
        .filter(
            Price.material_category == material_category,
            Price.location == location,
            Price.offered_price.isnot(None)
        )
        .order_by(
            Price.offered_price.desc()
        )
        .all()
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail="No recycler offers available"
        )

    offers = []

    for price in prices:

        offers.append({
            "recycler_name": price.recycler_name,
            "material_category": price.material_category,
            "material_sub_category": price.material_sub_category,
            "location": price.location,
            "offered_price": price.offered_price,
            "unit": price.unit,
            "price_date": price.price_date
        })

    return {
        "material_category": material_category,
        "location": location,
        "count": len(offers),
        "offers": offers
    }            