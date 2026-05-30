import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// Use Omit to prevent the custom string-based onChange from clashing with the native div event handler
interface TimePickerProps extends Omit<
  React.ComponentProps<"div">,
  "onChange"
> {
  value?: string // Expecting format "HH:MM" (24hr syntax for input binding)
  onChange?: (time: string) => void
}

function TimePicker({
  className,
  value = "08:30",
  onChange,
  ...props
}: TimePickerProps) {
  const [time, setTime] = React.useState(value)

  // Converts 24h format "13:45" to 12h format "01:45 PM" to match image_ca547a.png
  const formatTo12Hour = (timeString: string) => {
    if (!timeString) return "08:30 AM"
    const [hoursStr, minutesStr] = timeString.split(":")
    let hours = parseInt(hoursStr, 10)
    const minutes = minutesStr
    const ampm = hours >= 12 ? "PM" : "AM"
    hours = hours % 12
    hours = hours ? hours : 12
    const formattedHours = hours < 10 ? `0${hours}` : hours
    return `${formattedHours}:${minutes} ${ampm}`
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setTime(newValue)
    if (onChange) {
      onChange(newValue)
    }
  }

  return (
    <div
      className={cn(
        "relative flex h-10 w-fit items-center justify-center gap-2 rounded-full px-4",
        "cursor-pointer bg-secondary text-foreground transition-colors hover:bg-secondary/80",
        className
      )}
      {...props}
    >
      <Clock className="h-5 w-5 stroke-[2.5] text-muted-foreground/80" />

      <span className="text-sm font-semibold tracking-wide select-none">
        {formatTo12Hour(time)}
      </span>

      <input
        type="time"
        value={time}
        onChange={handleTimeChange}
        className="absolute inset-0 h-full w-full cursor-pointer [color-scheme:light] opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
    </div>
  )
}

export { TimePicker }
