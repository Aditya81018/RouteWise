import mapboxgl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

export type MapLibraryName = "mapbox" | "maplibre"

const detectedLibrary: MapLibraryName = "maplibre"

const mapgl = mapboxgl

export { mapgl, detectedLibrary }
