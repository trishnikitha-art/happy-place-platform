import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Button — uses SEMANTIC design tokens only (bg-primary, bg-secondary, …).
 * Re-skinning the brand happens in globals.css @theme, not here.
 * Premium micro-interactions: press animation, hover glow, shadow shift.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ease-out active:scale-[0.96] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover hover:shadow-md hover:-translate-y-0.5",
        accent: "bg-accent text-accent-foreground hover:opacity-90 hover:shadow-md hover:-translate-y-0.5",
        outline: "border border-border bg-surface text-text hover:bg-surface-muted hover:shadow-md hover:-translate-y-0.5",
        ghost: "text-text-muted hover:bg-surface-muted hover:shadow-sm",
        link: "text-accent underline-offset-4 hover:underline p-0",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-base",
        lg: "h-13 px-8 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, children, ...props }: ButtonProps) {
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      {...props}
    >
      {children}
      {/* Ripple effect overlay */}
      <span 
        className={cn(
          "absolute inset-0 bg-white/20 rounded-full transition-opacity duration-300",
          isPressed ? "opacity-100" : "opacity-0"
        )}
      />
    </button>
  );
}

export { buttonVariants };
