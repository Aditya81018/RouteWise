import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    // If the active theme is dark, flip it to light, otherwise make it dark
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={toggleTheme}
      className="absolute top-8 right-4 size-12 rounded-full" // Keeps it pill-shaped to match the RouteWise app
    >
      <div className="relative flex size-5 items-center justify-center">
        {/* Sun visible in light mode, shrinks and rotates out in dark mode */}
        <Sun className="size-full scale-100 rotate-0 text-amber-500 transition-all dark:scale-0 dark:-rotate-90" />

        {/* Moon hidden in light mode, grows and rotates in when dark mode active */}
        <Moon className="absolute size-full scale-0 rotate-90 text-blue-400 transition-all dark:scale-100 dark:rotate-0" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
