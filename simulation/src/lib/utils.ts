import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export async function fetchOSRMPath(
  points: [number, number][],
  overview: "simplified" | "full" = "full"
): Promise<[number, number][]> {
  const validPoints = points.filter(
    (pt) =>
      Array.isArray(pt) &&
      pt.length === 2 &&
      pt[0] !== null &&
      pt[1] !== null
  )

  if (validPoints.length < 2) return []

  const MAX_WAYPOINTS = 90
  let stitchedGeoJsonPoints: [number, number][] = []

  for (let j = 0; j < validPoints.length; j += MAX_WAYPOINTS - 1) {
    const chunk = validPoints.slice(j, j + MAX_WAYPOINTS)
    if (chunk.length < 2) continue

    const osrmCoordsString = chunk
      .map((pt) => `${pt[1]},${pt[0]}`)
      .join(";")

    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${osrmCoordsString}?geometries=geojson&overview=${overview}&continue_straight=true`
    )

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("OSRM Rate limit hit! Slowing down...")
        await delay(1000)
      }
      throw new Error(`OSRM API Error: ${response.status}`)
    }

    const data = await response.json()

    if (data.routes && data.routes.length > 0) {
      const coords = data.routes[0].geometry.coordinates as [number, number][]
      stitchedGeoJsonPoints = stitchedGeoJsonPoints.concat(
        coords.map(([lng, lat]) => [lat, lng] as [number, number])
      )
    }

    if (j + MAX_WAYPOINTS < validPoints.length) {
      await delay(100)
    }
  }

  // Returns [lat, lng][]
  return stitchedGeoJsonPoints
}

// Haversine formula to get distance between two points in meters
// Points are [lat, lng]
export function getDistanceMeters(p1: [number, number], p2: [number, number]) {
  const [lat1, lon1] = p1
  const [lat2, lon2] = p2
  const R = 6371e3 // Earth radius in meters

  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const getRandomColor = () => {
  const colors = [
    "#10b981", // emerald-500
    "#3b82f6", // blue-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export const getRandomCrowdStatus = (): "LOW" | "MEDIUM" | "HIGH" => {
  const statuses: ("LOW" | "MEDIUM" | "HIGH")[] = ["LOW", "MEDIUM", "HIGH"]
  return statuses[Math.floor(Math.random() * statuses.length)]
}

export const getRandomReliability = () => Math.floor(Math.random() * 30) + 70 // 70-100%
