import uuid
import random
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Literal

# Import the routing logic from our new file
from routes import get_preferable_routes

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
    nextBusNo: Optional[str] = None
    transferStop: Optional[str] = None
    arrivalTime: str
    duration: str
    cost: int
    reliabilityScore: int
    tagType: Optional[Literal["RECOMMENDED", "FASTEST", "CALMEST", "CHEAPEST"]] = None
    crowdStatus: str
    additionalInfo: Optional[str] = None


# Helper function to generate the random mockup values
def get_mock_stats():
    return {
        "arrivalTime": f"{random.randint(1, 12)}:{random.choice(['00', '15', '30', '45'])} {random.choice(['AM', 'PM'])}",
        "duration": f"{random.randint(15, 90)} min",
        "cost": random.choice([10, 15, 20, 25, 30]),
        "reliabilityScore": random.randint(60, 99),
        "isRecommended": random.choice([True, False]),
        "crowdStatus": random.choice(["LOW", "MEDIUM", "HIGH"]),
        "additionalInfo": random.choice(
            [None, "AC bus", "Gets crowded easily", "Fastest route"]
        ),
    }


@app.get("/search-routes", response_model=List[BusRouteResponse])
def get_bus_routes(
    origin: str = Query(..., alias="from", description="Starting point location"),
    destination: str = Query(..., alias="to", description="Destination location"),
):
    print(f"Received search request from '{origin}' to '{destination}'")

    # 1. Fetch real route calculations from the imported function
    route_data = get_preferable_routes(origin, destination)

    if "error" in route_data:
        return []

    response_list = []

    # 2. Process Direct Routes
    for direct in route_data.get("direct_options", []):
        mock = get_mock_stats()
        response_list.append(
            {
                "id": f"route-direct-{str(uuid.uuid4())[:8]}",
                "busNo": direct["route"],
                "nextBusNo": None,
                "transferStop": None,
                "tagType": None,  # Will be determined dynamically below
                **mock,
            }
        )

    # 3. Process Transfer Routes
    for transfer in route_data.get("one_transfer_options", []):
        mock = get_mock_stats()
        response_list.append(
            {
                "id": f"route-transfer-{str(uuid.uuid4())[:8]}",
                "busNo": transfer["leg1_route"],
                "nextBusNo": transfer["leg2_route"],
                "transferStop": transfer["transfer_stop"],
                "tagType": None,  # Will be determined dynamically below
                **mock,
            }
        )

    # 4. Evaluate and Assign Tag Types dynamically across all options
    if response_list:
        # The algorithm already sorts by minimum stops/transfers,
        # so the absolute first entry is our best structural option.
        response_list[0]["tagType"] = "RECOMMENDED"

        # Find the fastest route (minimum duration)
        # We parse the duration string (e.g., "40 min" -> 40) safely to evaluate
        def parse_duration(r):
            try:
                return int(r["duration"].split()[0])
            except (ValueError, IndexError):
                return 9999

        fastest_route = min(response_list, key=parse_duration)
        if not fastest_route["tagType"]:  # Don't overwrite RECOMMENDED
            fastest_route["tagType"] = "FASTEST"

        # Find the cheapest route (minimum cost)
        cheapest_route = min(response_list, key=lambda r: r["cost"])
        if not cheapest_route[
            "tagType"
        ]:  # Don't overwrite existing higher-priority tags
            cheapest_route["tagType"] = "CHEAPEST"

        # Find a calm route (where crowd status is LOW)
        for route in response_list:
            if route["crowdStatus"] == "LOW" and not route["tagType"]:
                route["tagType"] = "CALMEST"
                break  # Just tag the first calm one found

    return response_list
