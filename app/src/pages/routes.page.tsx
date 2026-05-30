import { useLocation, useNavigate } from "react-router"
import {
  RouteOptionCard,
  type RouteOptionData,
} from "../components/route-option-card"
import { useEffect, useState } from "react"

const mockRoutes: RouteOptionData[] = [
  {
    id: "bus-202a",
    busNo: "Bus 202A",
    arrivalTime: "8:45 AM",
    duration: "40 min",
    cost: 15,
    reliabilityScore: 96,
    isRecommended: true,
    crowdStatus: "LOW",
    additionalInfo: "Will get crowded in 2 minutes",
  },
  {
    id: "bus-104",
    busNo: "Bus 104",
    arrivalTime: "8:35 AM",
    duration: "40 min",
    cost: 15,
    reliabilityScore: 80,
    isRecommended: false,
    crowdStatus: "HIGH",
  },
]

export default function RoutesPage() {
  const navigate = useNavigate()

  const location = useLocation()
  const { from, to } = location.state || {}

  const [selectedRouteId, setSelectedRouteId] = useState<string>("bus-202a")

  useEffect(() => {
    if (!from || !to) {
      console.warn("Missing route search parameters, redirecting to home.")
      navigate("/")
    }
    console.log("Received route search parameters:", { from, to })
  }, [from, to, navigate])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 bg-background p-4 pt-12">
      {mockRoutes.map((route) => (
        <RouteOptionCard
          key={route.id}
          {...route}
          isSelected={selectedRouteId === route.id}
          onSelect={setSelectedRouteId}
        />
      ))}
    </div>
  )
}
