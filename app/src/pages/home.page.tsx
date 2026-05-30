import RoutePlannerCard from "@/components/route-planner-card"

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-md bg-background px-4 py-6">
      {/* --- HEADER TITLE SECTION --- */}
      <div className="mb-6 space-y-1">
        <span className="text-xs font-black tracking-wider text-blue-600 uppercase">
          Welcome to RouteWise
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Plan your ride
        </h1>
      </div>

      {/* --- ROUTE PLANNER CARD COMPONENT --- */}
      <RoutePlannerCard />
    </div>
  )
}
