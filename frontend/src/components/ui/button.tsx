import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-[11px] font-black uppercase tracking-[0.2em] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 active:scale-[0.98] border border-transparent",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-black hover:bg-primary/90 shadow-[0_10px_30px_rgba(255,77,0,0.2)]",
                destructive:
                    "bg-red-600 text-white hover:bg-red-700",
                outline:
                    "border-white/10 bg-transparent hover:bg-white/5 hover:border-white/20 text-white",
                secondary:
                    "bg-white text-black hover:bg-white/90",
                ghost: "hover:bg-white/5 hover:text-white text-white/60",
                link: "text-primary underline-offset-4 hover:underline",
                mission: "bg-transparent border-primary/40 text-primary hover:bg-primary/5 hover:border-primary shadow-[0_0_20px_rgba(255,77,0,0.1)]",
            },
            size: {
                default: "h-11 px-8",
                sm: "h-9 px-4",
                lg: "h-14 px-12 text-xs",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
