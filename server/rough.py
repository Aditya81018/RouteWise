import json
import os


def map_stops_to_buses(
    stops_path="stops.json", busdata_path="busdata.json", output_path="stop-buses.json"
):
    # 1. Load the flat list of unique stops
    if not os.path.exists(stops_path):
        print(f"Error: Base file '{stops_path}' could not be found.")
        return

    with open(stops_path, "r", encoding="utf-8") as f:
        stops_list = json.load(f)
    print(f"Loaded {len(stops_list)} unique stops from '{stops_path}'.")

    # 2. Load the bus dataset containing route sequences
    if not os.path.exists(busdata_path):
        print(f"Error: Dataset file '{busdata_path}' could not be found.")
        return

    with open(busdata_path, "r", encoding="utf-8") as f:
        busdata = json.load(f)
    routes = busdata.get("routes", [])
    print(
        f"Loaded {len(routes)} bus routes from '{busdata_path}' for cross-referencing."
    )

    # 3. Process mapping logic
    # Structure: { "Stop Name": ["Bus Code 1", "Bus Code 2", ...] }
    stop_buses_map = {}

    for stop_name in stops_list:
        matching_buses = []

        for route in routes:
            bus_code = route.get("code")
            route_stops = route.get("stops", [])

            # If the current stop name is present in this route's sequence list
            if stop_name in route_stops and bus_code:
                matching_buses.append(bus_code)

        # Sort the bus codes alphabetically/numerically for cleaner presentation
        matching_buses.sort()

        # Save the result string array to the stop key
        stop_buses_map[stop_name] = matching_buses

    # 4. Save the compiled dictionary array of objects to stop-buses.json
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(stop_buses_map, f, indent=2, ensure_ascii=False)

    print(
        f"Success! Generated '{output_path}' linking your stops to matching bus routes."
    )


if __name__ == "__main__":
    map_stops_to_buses()
