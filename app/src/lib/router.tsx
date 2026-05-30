import HomePage from "@/pages/home.page"
import RoutesPage from "@/pages/routes.page"
import { createBrowserRouter } from "react-router"

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/routes",
    element: <RoutesPage />,
  },
])

export default router
