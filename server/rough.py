import json
import os


def update_coordinates(busdata_path="busdata.json", coords_path="coords.json"):
    # 1. Load busdata.json and extract its stops configurations
    if not os.path.exists(busdata_path):
        print(f"Error: '{busdata_path}' could not be located.")
        return

    print(f"Reading '{busdata_path}' to extract real-time GPS nodes...")
    with open(busdata_path, "r", encoding="utf-8") as f:
        busdata = json.load(f)

    # Compile a dictionary of valid replacements: { "Stop Name": [lat, lng] }
    busdata_coords = {}
    for stop in busdata.get("stops", []):
        name = stop.get("name")
        lat = stop.get("lat")
        lng = stop.get("lng")

        # Verify both coordinate metrics exist and are not null
        if name and lat is not None and lng is not None:
            busdata_coords[name] = [float(lat), float(lng)]

    print(
        f"-> Found {len(busdata_coords)} valid stop coordinate references in busdata."
    )

    # 2. Load coords.json target file
    if not os.path.exists(coords_path):
        print(f"Error: Target file '{coords_path}' does not exist.")
        return

    with open(coords_path, "r", encoding="utf-8") as f:
        coords_dict = json.load(f)

    # 3. Perform the replacements
    updated_count = 0
    for stop_name, new_coordinates in busdata_coords.items():
        if stop_name in coords_dict:
            # Check if it's an actual change or updating a null node
            if coords_dict[stop_name] != new_coordinates:
                coords_dict[stop_name] = new_coordinates
                updated_count += 1

    print(f"-> Overwrote/Updated coordinates for {updated_count} stops in memory.")

    # 4. Save updates back into coords.json safely
    with open(coords_path, "w", encoding="utf-8") as f:
        json.dump(coords_dict, f, indent=2, ensure_ascii=False)

    print(f"Success! Changes flushed permanently back into '{coords_path}'.")


if __name__ == "__main__":
    update_coordinates()
