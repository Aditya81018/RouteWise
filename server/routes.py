import json


def get_preferable_routes(point_a, point_b, filepath="busdata.json"):
    # Load the JSON data
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            busdata = json.load(f)
    except FileNotFoundError:
        return {"error": "Error: busdata.json not found."}

    # 1. Alias Resolution: Normalize the input points
    aliases = busdata.get("aliases", {})

    def canon(stop_name):
        return aliases.get(stop_name, stop_name)

    start = canon(point_a)
    end = canon(point_b)

    # 2. Build Stop to Route Mapping
    stop_to_routes = {}
    routes = busdata.get("routes", [])

    for r_idx, route in enumerate(routes):
        for s_idx, stop in enumerate(route["stops"]):
            if stop not in stop_to_routes:
                stop_to_routes[stop] = []
            stop_to_routes[stop].append((r_idx, s_idx))

    if start not in stop_to_routes or end not in stop_to_routes:
        return {
            "error": f"Could not find one or both stops ('{start}', '{end}') in the network."
        }

    direct_routes = []
    one_transfer_routes = []

    start_routes = stop_to_routes[start]
    end_routes = stop_to_routes[end]

    # 3. Search for Direct Routes
    for r1_idx, start_idx in start_routes:
        for r2_idx, end_idx in end_routes:
            if r1_idx == r2_idx and start_idx < end_idx:
                route = routes[r1_idx]
                direct_routes.append(
                    {
                        "route": route["code"],
                        "kind": route.get("kind", "unknown"),
                        "stops_count": end_idx - start_idx,
                        "path": f"{start} -> {end}",
                    }
                )

    # 4. Search for 1-Transfer Routes
    for r1_idx, start_idx in start_routes:
        for r2_idx, end_idx in end_routes:
            if r1_idx == r2_idx:
                continue

            r1_subsequent = {
                stop: idx
                for idx, stop in enumerate(routes[r1_idx]["stops"])
                if idx > start_idx
            }
            r2_preceding = {
                stop: idx
                for idx, stop in enumerate(routes[r2_idx]["stops"])
                if idx < end_idx
            }

            transfer_points = set(r1_subsequent.keys()).intersection(
                set(r2_preceding.keys())
            )

            for tp in transfer_points:
                total_stops = (r1_subsequent[tp] - start_idx) + (
                    end_idx - r2_preceding[tp]
                )
                one_transfer_routes.append(
                    {
                        "leg1_route": routes[r1_idx]["code"],
                        "leg2_route": routes[r2_idx]["code"],
                        "transfer_stop": tp,
                        "total_stops": total_stops,
                        "path": f"Take [{routes[r1_idx]['code']}] to {tp} -> Change to [{routes[r2_idx]['code']}]",
                    }
                )

    # 5. Sort and Prepare Results
    direct_routes = sorted(direct_routes, key=lambda x: x["stops_count"])
    one_transfer_routes = sorted(one_transfer_routes, key=lambda x: x["total_stops"])

    unique_1_transfers = []
    seen_combos = set()
    for r in one_transfer_routes:
        combo = (r["leg1_route"], r["leg2_route"])
        if combo not in seen_combos:
            seen_combos.add(combo)
            unique_1_transfers.append(r)

    return {
        "start": start,
        "destination": end,
        "direct_options": direct_routes,
        "one_transfer_options": unique_1_transfers[:5],
    }
