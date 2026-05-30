import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all outline-none select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // RouteWise Primary: Vivid Blue top-to-bottom gradient with an ambient blue shadow
        default:
          "bg-gradient-to-b from-[#5B93FF] to-[#3B82F6] text-white shadow-lg shadow-blue-500/20 hover:brightness-105 active:brightness-95",
        outline:
          "rounded-full border border-border bg-background hover:bg-muted hover:text-foreground",
        secondary:
          "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "rounded-full hover:bg-muted hover:text-foreground",
        destructive:
          "rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Matches the large, comfortable "Find Best Routes" layout from iPhone 17 - 2.png
        default: "h-12 gap-2 rounded-full px-6 text-base",
        xs: "h-7 gap-1 rounded-full px-3 text-xs [&_svg]:size-3",
        sm: "h-9 gap-1.5 rounded-full px-4 text-sm [&_svg]:size-3.5",
        lg: "h-14 gap-2.5 rounded-full px-8 text-lg",
        icon: "size-12 rounded-full",
        "icon-xs": "size-7 rounded-full [&_svg]:size-3",
        "icon-sm": "size-9 rounded-full",
        "icon-lg": "size-14 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
