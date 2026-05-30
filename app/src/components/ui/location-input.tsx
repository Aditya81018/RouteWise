import * as React from "react"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface LocationInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "value"
> {
  icon?: React.ReactNode
  options: string[] // List of places to filter from (e.g. ["Sukantanagar", "Biswa Bangla", "Rajabazar"])
  value: string
  onChange: (value: string) => void
}

function LocationInput({
  className,
  type = "text",
  icon,
  options,
  value,
  onChange,
  ...props
}: LocationInputProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  // Filter options based on input value
  const filteredOptions = React.useMemo(() => {
    if (!value.trim()) return []
    return options.filter(
      (option) =>
        option.toLowerCase().includes(value.toLowerCase()) &&
        option.toLowerCase() !== value.toLowerCase() // Hide if exactly matched
    )
  }, [value, options])

  // Close dropdown when clicking outside the component
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (option: string) => {
    onChange(option)
    setIsOpen(false)
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex h-fit w-full flex-col"
      data-slot="location-input-wrapper"
    >
      <div className="relative flex h-fit w-full items-center">
        {icon && (
          <div className="pointer-events-none absolute left-4 z-10 flex items-center justify-center text-muted-foreground [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0">
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          data-slot="input"
          className={cn(
            "h-12 w-full min-w-0 rounded-full py-3 text-base font-medium transition-all outline-none md:text-sm",
            icon ? "pr-5 pl-12" : "px-5",
            "border-none bg-secondary text-foreground placeholder:text-muted-foreground/70",
            "focus-visible:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-primary/20",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:bg-destructive/10 aria-invalid:text-destructive aria-invalid:placeholder:text-destructive/60",
            className
          )}
          {...props}
        />
      </div>

      {/* --- SUGGESTIONS FLOATING DROPDOWN CARD --- */}
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 animate-in overflow-hidden rounded-2xl border border-border bg-card p-1 text-foreground shadow-xl duration-150 fade-in-50 slide-in-from-top-2">
          {filteredOptions.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => handleSelect(option)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-foreground transition-colors outline-none select-none hover:bg-secondary focus:bg-secondary"
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <span>{option}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { LocationInput }
