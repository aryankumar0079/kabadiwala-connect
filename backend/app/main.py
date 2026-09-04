from typing import Dict, List

from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware
from app.models.transaction import MaterialTransaction

from pydantic import BaseModel

from sqlalchemy import text

from app.database.connection import engine
from app.database.base import Base


# =========================================================
# MODELS
# =========================================================

from app.models.user import User
from app.models.collector import Collector
from app.models.recycler import Recycler
from app.models.authorization import RecyclerAuthorization
from app.models.lot import SaleRequest

from app.models.offer import (
    SaleRequestRecipient,
    RecyclerOffer
)


# =========================================================
# AI SERVICE
# =========================================================

from app.services.ai_service import chat_with_ai


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# ROUTES
# =========================================================

from app.routes.auth import router as auth_router
from app.routes.authorization import router as authorization_router
from app.routes.collectors import router as collector_router
from app.routes.recyclers import router as recycler_router
from app.routes.admin import router as admin_router
from app.routes.materials import router as material_router
from app.routes.prices import router as price_router
from app.routes.lots import router as lot_router
from app.routes.offers import router as offer_router
from app.routes import transactions
from app.routes import traceability
from app.routes.ai import router as ai_router


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="Kabadiwala Connect API",
    version="1.0.0"
)


# =========================================================
# WEBSOCKET CONNECTION MANAGER
# =========================================================

class ConnectionManager:

    def __init__(self):

        self.recycler_connections: Dict[
            int,
            List[WebSocket]
        ] = {}


    async def connect(
        self,
        recycler_id: int,
        websocket: WebSocket
    ):

        await websocket.accept()

        if recycler_id not in self.recycler_connections:

            self.recycler_connections[
                recycler_id
            ] = []

        self.recycler_connections[
            recycler_id
        ].append(websocket)


    def disconnect(
        self,
        recycler_id: int,
        websocket: WebSocket
    ):

        connections = (
            self.recycler_connections.get(
                recycler_id,
                []
            )
        )

        if websocket in connections:

            connections.remove(websocket)

        if not connections:

            self.recycler_connections.pop(
                recycler_id,
                None
            )


    async def send_to_recycler(
        self,
        recycler_id: int,
        message: dict
    ):

        connections = (
            self.recycler_connections.get(
                recycler_id,
                []
            )
        )

        disconnected = []

        for websocket in connections:

            try:

                await websocket.send_json(
                    message
                )

            except Exception:

                disconnected.append(
                    websocket
                )


        for websocket in disconnected:

            self.disconnect(
                recycler_id,
                websocket
            )


manager = ConnectionManager()


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(
    auth_router
)

app.include_router(
    authorization_router
)

app.include_router(
    collector_router
)

app.include_router(
    recycler_router
)

app.include_router(
    admin_router
)

app.include_router(
    material_router
)

app.include_router(
    price_router
)

app.include_router(
    lot_router
)

app.include_router(
    offer_router
)

app.include_router(
    transactions.router
)

app.include_router(
    traceability.router
)

app.include_router(
    ai_router
)


# =========================================================
# ROOT API
# =========================================================

@app.get("/")
def root():

    return {
        "message": "Kabadiwala Connect API is running"
    }


# =========================================================
# DATABASE TEST
# =========================================================

@app.get("/test-db")
def test_database():

    try:

        with engine.connect() as connection:

            connection.execute(
                text("SELECT 1")
            )

        return {
            "status": "success",
            "message": "MySQL connected successfully"
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# =========================================================
# RECYCLER WEBSOCKET
# =========================================================

@app.websocket(
    "/ws/recycler/{recycler_id}"
)
async def recycler_websocket(
    websocket: WebSocket,
    recycler_id: int
):

    await manager.connect(
        recycler_id,
        websocket
    )

    try:

        while True:

            await websocket.receive_text()

    except WebSocketDisconnect:

        manager.disconnect(
            recycler_id,
            websocket
        )