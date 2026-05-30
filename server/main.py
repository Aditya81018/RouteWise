from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

# --- CORS SETUP ---
# Define which origins are allowed to make requests to this API.
# Using ["*"] allows absolutely any website/domain to access your endpoints.
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers (Content-Type, Authorization, etc.)
)
# ------------------


@app.get("/")
def read_root():
    return {"message": "RouteWise Server"}


class BusRouteResponse(BaseModel):
    id: str
    busNo: str
    arrivalTime: str
    duration: str
    cost: int
    reliabilityScore: int
    isRecommended: bool
    crowdStatus: str
    additionalInfo: Optional[str] = (
        None  # Optional because the second item doesn't have it
    )


@app.get("/search-routes", response_model=List[BusRouteResponse])
def get_bus_routes(
    origin: str = Query(..., alias="from", description="Starting point location"),
    destination: str = Query(..., alias="to", description="Destination location"),
):
    """
    Accepts 'from' and 'to' query parameters and returns available bus routes.
    Example: /search-bus?from=Downtown&to=Uptown
    """
    # Note: Since 'from' is a reserved keyword in Python, we use 'origin'
    # as the variable name and use Query(alias="from") so FastAPI maps it correctly.

    print(f"Received search request from '{origin}' to '{destination}'")

    # Fixed JSON payload
    fixed_data = [
        {
            "id": "bus-202a",
            "busNo": "Bus 202A",
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
            "busNo": "Bus 104",
            "arrivalTime": "8:35 AM",
            "duration": "40 min",
            "cost": 15,
            "reliabilityScore": 80,
            "isRecommended": False,
            "crowdStatus": "HIGH",
        },
    ]

    return fixed_data
