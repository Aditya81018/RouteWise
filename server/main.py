import uuid
import random
import json
import math
from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Literal

# Import the routing logic from our new file
from routes import get_preferable_routes

# Load databases
with open("coords.json", "r") as f:
    coords_dict = json.load(f)

with open("busdata.json", "r") as f:
    bus_data_db = json.load(f)


def get_distance_meters(p1, p2):
    # p1 and p2 are [lat, lng]
    lat1, lon1 = p1
    lat2, lon2 = p2
    R = 6371000  # Earth radius in meters
    
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    
    a = (math.sin(dLat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * (math.sin(dLon / 2) ** 2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_route_stops(bus_no: str):
    for r in bus_data_db.get("routes", []):
        if r.get("code") == bus_no:
            return r.get("stops", [])
    return []


def evaluate_leg_static(bus_no: str, boarding_stop: str, alighting_stop: str):
    """
    Evaluates static commute time and fare when no live bus is available.
    """
    stops = get_route_stops(bus_no)
    if not stops or boarding_stop not in stops or alighting_stop not in stops:
        return {
            "journey_min": 15,
            "fare": 10
        }
    try:
        idx_board = stops.index(boarding_stop)
        idx_alight = stops.index(alighting_stop)
    except ValueError:
        return {
            "journey_min": 15,
            "fare": 10
        }
    if idx_board > idx_alight:
        idx_board, idx_alight = idx_alight, idx_board
        
    distance_journey = 0.0
    for i in range(idx_board, idx_alight):
        s1 = stops[i]
        s2 = stops[i+1]
        pt1 = coords_dict.get(s1)
        pt2 = coords_dict.get(s2)
        if pt1 and pt2:
            distance_journey += get_distance_meters(pt1, pt2)
        else:
            distance_journey += 600.0
            
    speed = 35
    speed_mps = (speed * 1000) / 3600
    journey_sec = distance_journey / speed_mps
    num_stops_journey = idx_alight - idx_board
    journey_buffer_sec = num_stops_journey * 45
    journey_min = math.ceil(((journey_sec + journey_buffer_sec) / 60) * 3.0)
    journey_min = max(1, journey_min)
    
    # Fare: minimum 10 Rs, max 20 Rs based on stop count
    fare = min(20, 10 + max(0, num_stops_journey - 5))
    return {
        "journey_min": journey_min,
        "fare": fare
    }


def evaluate_leg(bus_no: str, boarding_stop: str, alighting_stop: str):
    """
    Evaluates availability, arrival time, commute time, and fare for a single leg using live data.
    """
    c_board = coords_dict.get(boarding_stop)
    c_alight = coords_dict.get(alighting_stop)

    candidates = []
    for bus_id, bus in live_buses.items():
        if bus.get("routeCode") != bus_no:
            continue
            
        stops = bus.get("stopsSequence", [])
        if boarding_stop not in stops or alighting_stop not in stops:
            continue
            
        idx_board = stops.index(boarding_stop)
        idx_alight = stops.index(alighting_stop)
        if idx_board >= idx_alight:
            continue
            
        current_stop = bus.get("currentStop")
        try:
            idx_current = stops.index(current_stop)
        except ValueError:
            idx_current = bus.get("nextStopIndex", 1) - 1
            
        if idx_current > idx_board:
            continue
            
        bus_coords = bus.get("currentCoords")
        if not bus_coords:
            continue
            
        if c_board:
            dist_to_board = get_distance_meters(bus_coords, c_board)
        else:
            dist_to_board = (idx_board - idx_current) * 600.0
            
        candidates.append((dist_to_board, bus, idx_board, idx_alight, idx_current, stops))
        
    if not candidates:
        return False, None
        
    candidates.sort(key=lambda x: x[0])
    dist_to_board, best_bus, idx_board, idx_alight, idx_current, stops = candidates[0]
    
    speed = max(10, best_bus.get("speed", 40))
    speed_mps = (speed * 1000) / 3600
    
    # Calculate stop-by-stop distance along the route to the boarding stop
    distance_to_board = 0.0
    if idx_current == idx_board:
        if c_board and best_bus.get("currentCoords"):
            distance_to_board = get_distance_meters(best_bus["currentCoords"], c_board)
        else:
            distance_to_board = 0.0
    else:
        next_stop_idx = idx_current + 1
        if next_stop_idx < len(stops):
            s_next = stops[next_stop_idx]
            c_next = coords_dict.get(s_next)
            if c_next and best_bus.get("currentCoords"):
                distance_to_board += get_distance_meters(best_bus["currentCoords"], c_next)
            else:
                distance_to_board += 600.0
                
            for i in range(next_stop_idx, idx_board):
                s1 = stops[i]
                s2 = stops[i+1]
                pt1 = coords_dict.get(s1)
                pt2 = coords_dict.get(s2)
                if pt1 and pt2:
                    distance_to_board += get_distance_meters(pt1, pt2)
                else:
                    distance_to_board += 600.0
                    
    time_to_board_sec = distance_to_board / speed_mps
    num_stops_to_board = idx_board - idx_current
    buffer_sec = num_stops_to_board * 30
    arrival_min = math.ceil((time_to_board_sec + buffer_sec) / 60)
    arrival_min = max(1, arrival_min)
    
    distance_journey = 0.0
    for i in range(idx_board, idx_alight):
        s1 = stops[i]
        s2 = stops[i+1]
        pt1 = coords_dict.get(s1)
        pt2 = coords_dict.get(s2)
        if pt1 and pt2:
            distance_journey += get_distance_meters(pt1, pt2)
        else:
            distance_journey += 600.0
            
    journey_sec = distance_journey / speed_mps
    num_stops_journey = idx_alight - idx_board
    journey_buffer_sec = num_stops_journey * 45
    journey_min = math.ceil(((journey_sec + journey_buffer_sec) / 60) * 3.0)
    journey_min = max(1, journey_min)
    
    # Fare: minimum 10 Rs, max 20 Rs based on stop count
    fare = min(20, 10 + max(0, num_stops_journey - 5))
    
    details = {
        "reliabilityScore": best_bus.get("reliability", 80),
        "crowdStatus": best_bus.get("crowdStatus", "LOW"),
        "speed": speed,
        "arrival_min": arrival_min,
        "journey_min": journey_min,
        "fare": fare,
        "num_stops": num_stops_journey
    }
    return True, details

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


# In-memory storage for live buses
live_buses = {}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket client connected")
    try:
        while True:
            data = await websocket.receive_json()
            bus_id = data.get("id")
            if not bus_id:
                continue

            if data.get("action") == "delete":
                if bus_id in live_buses:
                    del live_buses[bus_id]
                print(f"[WS] Deleted Bus {bus_id} from storage")
            else:
                existing_bus = live_buses.get(bus_id, {})
                # Merge the new incoming data with the existing data
                updated_bus = {**existing_bus, **data}
                live_buses[bus_id] = updated_bus

                # Print the update and the stored state side-by-side
                print(f"[WS] Bus {bus_id} Update received:")
                print(f"     -> Incoming: {data}")
                print(f"     -> Stored:   {updated_bus}")
    except WebSocketDisconnect:
        print("WebSocket client disconnected")


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
    isAvailable: bool = True


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
    start_stop = route_data.get("start", origin)
    dest_stop = route_data.get("destination", destination)

    # 2. Process Direct Routes
    for direct in route_data.get("direct_options", []):
        bus_no = direct["route"]
        
        is_available, details = evaluate_leg(bus_no, start_stop, dest_stop)
        
        if is_available:
            arrival_time = f"in {details['arrival_min']} min"
            duration = f"{details['journey_min']} min"
            cost = details['fare']
            reliability = details['reliabilityScore']
            crowd = details['crowdStatus']
            additional_info = f"Live Tracked • Speed: {details['speed']} km/h"
        else:
            static_details = evaluate_leg_static(bus_no, start_stop, dest_stop)
            arrival_time = "--"
            duration = f"{static_details['journey_min']} min"
            cost = static_details['fare']
            reliability = 0
            crowd = "LOW"
            additional_info = "No active buses on this route"
            
        response_list.append(
            {
                "id": f"route-direct-{str(uuid.uuid4())[:8]}",
                "busNo": bus_no,
                "nextBusNo": None,
                "transferStop": None,
                "arrivalTime": arrival_time,
                "duration": duration,
                "cost": cost,
                "reliabilityScore": reliability,
                "tagType": None,
                "crowdStatus": crowd,
                "additionalInfo": additional_info,
                "isAvailable": is_available,
            }
        )

    # 3. Process Transfer Routes
    for transfer in route_data.get("one_transfer_options", []):
        leg1 = transfer["leg1_route"]
        leg2 = transfer["leg2_route"]
        transfer_stop = transfer["transfer_stop"]
        
        is_avail1, det1 = evaluate_leg(leg1, start_stop, transfer_stop)
        is_avail2, det2 = evaluate_leg(leg2, transfer_stop, dest_stop)
        
        is_available = is_avail1 and is_avail2
        
        if is_available:
            arrival_time = f"in {det1['arrival_min']} min"
            # Commute time = leg1 journey + transfer buffer (5 min) + leg2 journey
            total_commute = det1['journey_min'] + 5 + det2['journey_min']
            duration = f"{total_commute} min"
            cost = det1['fare'] + det2['fare']
            reliability = min(det1['reliabilityScore'], det2['reliabilityScore'])
            
            crowd_levels = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
            c1 = crowd_levels.get(det1['crowdStatus'], 1)
            c2 = crowd_levels.get(det2['crowdStatus'], 1)
            reverse_crowd = {1: "LOW", 2: "MEDIUM", 3: "HIGH"}
            crowd = reverse_crowd[max(c1, c2)]
            
            additional_info = f"Live Tracked • Leg 1: {det1['speed']} km/h, Leg 2: {det2['speed']} km/h"
        else:
            static_det1 = evaluate_leg_static(leg1, start_stop, transfer_stop)
            static_det2 = evaluate_leg_static(leg2, transfer_stop, dest_stop)
            arrival_time = "--"
            total_commute = static_det1['journey_min'] + 5 + static_det2['journey_min']
            duration = f"{total_commute} min"
            cost = static_det1['fare'] + static_det2['fare']
            reliability = 0
            crowd = "LOW"
            
            reasons = []
            if not is_avail1:
                reasons.append(f"Bus {leg1} offline")
            if not is_avail2:
                reasons.append(f"Bus {leg2} offline")
            additional_info = " & ".join(reasons)
            
        response_list.append(
            {
                "id": f"route-transfer-{str(uuid.uuid4())[:8]}",
                "busNo": leg1,
                "nextBusNo": leg2,
                "transferStop": transfer_stop,
                "arrivalTime": arrival_time,
                "duration": duration,
                "cost": cost,
                "reliabilityScore": reliability,
                "tagType": None,
                "crowdStatus": crowd,
                "additionalInfo": additional_info,
                "isAvailable": is_available,
            }
        )

    # 4. Evaluate and Assign Tag Types dynamically across all AVAILABLE options
    available_routes = [r for r in response_list if r["isAvailable"]]
    if available_routes:
        available_routes[0]["tagType"] = "RECOMMENDED"

        def parse_duration(r):
            try:
                return int(r["duration"].split()[0])
            except (ValueError, IndexError):
                return 9999

        fastest_route = min(available_routes, key=parse_duration)
        if not fastest_route["tagType"]:
            fastest_route["tagType"] = "FASTEST"

        cheapest_route = min(available_routes, key=lambda r: r["cost"])
        if not cheapest_route["tagType"]:
            cheapest_route["tagType"] = "CHEAPEST"

        for route in available_routes:
            if route["crowdStatus"] == "LOW" and not route["tagType"]:
                route["tagType"] = "CALMEST"
                break

    return response_list
