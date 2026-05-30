import { useLocation, useNavigate } from "react-router"
import { useEffect, useState } from "react"
import {
  RouteOptionCard,
  type RouteOptionData,
} from "../components/route-option-card"
import { LoadingScreen } from "@/components/loading-screen"
import { NavigateBack } from "@/components/navigate-back"

// Grabs your base server url config from Vite's env layer
const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000"

export default function RoutesPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Extract state params securely passed during route transition
  const { from, to } = location.state || {}

  const [routes, setRoutes] = useState<RouteOptionData[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 1. Guard clause: Bounce back to planner home screen if required state payloads are missing
    if (!from || !to) {
      console.warn("Missing route search parameters, redirecting to home.")
      navigate("/")
      return
    }

    const fetchRoutes = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 2. Format search strings as standard HTTP url query safe values
        const queryParams = new URLSearchParams({
          from: from,
          to: to,
        })

        const response = await fetch(
          `${API_BASE_URL}/search-routes?${queryParams.toString()}`
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch routes: ${response.statusText}`)
        }

        const data: RouteOptionData[] = await response.json()
        setRoutes(data)

        // 3. Pre-select recommended route natively, fallback to first entry if none flag true
        const recommended = data.find((r) => r.isRecommended)
        if (recommended) {
          setSelectedRouteId(recommended.id)
        } else if (data.length > 0) {
          setSelectedRouteId(data[0].id)
        }
      } catch (err) {
        console.error("Error communicating with data endpoint:", err)
        setError("Unable to find current routes. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoutes()
  }, [from, to, navigate])

  // Display the stylized animated brand loader when query is executing
  if (isLoading) {
    return (
      <LoadingScreen
        message={`Analyzing routes from ${from || "Origin"} to ${to || "Destination"}...`}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md animate-in flex-col gap-4 bg-background px-4 pt-8 duration-300 fade-in">
      <div className="mb-2 space-y-1 px-1">
        <div className="flex items-end gap-2">
          <NavigateBack to="/" />
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Available Rides
          </h2>
        </div>
        {/* Dynamic Destination Sub-Header Summary */}
        <p className="text-xs font-bold tracking-wider text-muted-foreground/80 uppercase">
          {from} ➜ {to}
        </p>
      </div>

      {/* API Error Notification Safe Fallback Node */}
      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-center text-sm font-semibold text-destructive">
          {error}
        </div>
      )}

      {/* Route Results Rendering Pipeline */}
      {!error && routes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center text-sm font-semibold text-muted-foreground">
          No transit routes found between these locations.
        </div>
      ) : (
        routes.map((route) => (
          <RouteOptionCard
            key={route.id}
            {...route}
            isSelected={selectedRouteId === route.id}
            onSelect={setSelectedRouteId}
          />
        ))
      )}
    </div>
  )
}
