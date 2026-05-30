from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

# --- CORS SETUP ---
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------------


@app.get("/")
def read_root():
    return {"message": "RouteWise Server"}


class BusRouteResponse(BaseModel):
    id: str
    busNo: str
    # Added optional fields for transfer routes
    nextBusNo: Optional[str] = None
    transferStop: Optional[str] = None
    arrivalTime: str
    duration: str
    cost: int
    reliabilityScore: int
    isRecommended: bool
    crowdStatus: str
    additionalInfo: Optional[str] = None


@app.get("/search-routes", response_model=List[BusRouteResponse])
def get_bus_routes(
    origin: str = Query(..., alias="from", description="Starting point location"),
    destination: str = Query(..., alias="to", description="Destination location"),
):
    """
    Accepts 'from' and 'to' query parameters and returns available bus routes.
    Example: /search-routes?from=Downtown&to=Uptown
    """
    print(f"Received search request from '{origin}' to '{destination}'")

    # Fixed JSON payload
    fixed_data = [
        {
            "id": "bus-202a",
            "busNo": "202A",
            "arrivalTime": "8:45 AM",
            "duration": "40 min",
            "cost": 15,
            "reliabilityScore": 96,
            "isRecommended": True,
            "crowdStatus": "LOW",
            "additionalInfo": "Will get crowded in 2 minutes",
        },
        {
            "id": "bus-104",
            "busNo": "104",
            "arrivalTime": "8:35 AM",
            "duration": "40 min",
            "cost": 15,
            "reliabilityScore": 80,
            "isRecommended": False,
            "crowdStatus": "HIGH",
        },
        # --- NEW TRANSFER ROUTE ADDED HERE ---
        {
            "id": "route-transfer-1",
            "busNo": "202A",
            "nextBusNo": "30B",
            "transferStop": "Rajabazar",
            "arrivalTime": "8:45 AM",
            "duration": "40 min",
            "cost": 15,
            "reliabilityScore": 96,
            "isRecommended": True,
            "crowdStatus": "MEDIUM",
            "additionalInfo": "Will get crowded in 2 minutes",
        },
    ]

    return fixed_data
