import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

interface NavigateBackProps {
  /**
   * Optional fallback URL string (e.g. "/" or "/dashboard") if there is no historic viewport session.
   */
  to?: string
}

export function NavigateBack({ to }: NavigateBackProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    // Checks if there's history to go back to natively
    if (window.history.length > 1) {
      navigate(-1)
    } else if (to) {
      // Fallback route navigation if history is dead (e.g. opened from direct shared url string link)
      navigate(to)
    } else {
      // Hard default home fallback
      navigate("/")
    }
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={handleBack}
      className="size-8 rounded-full shadow-sm transition-transform active:scale-95"
      aria-label="Go back"
    >
      <ArrowLeft className="size-5 stroke-[2.5] text-foreground/80" />
    </Button>
  )
}
