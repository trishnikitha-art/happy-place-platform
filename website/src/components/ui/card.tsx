import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CraftCard — premium card component using existing design language.
 * 
 * Inherits craftsmanship from homepage cards:
 * - Layered shadow stack (subtle depth)
 * - Subtle inset highlight (premium feel)
 * - Consistent border radius
 * - Smooth transition with gentle lift
 * 
 * Uses ONLY existing semantic tokens:
 * - border-border (no hardcoded colors)
 * - bg-surface (no hardcoded colors)
 * - shadow tokens from design system
 * 
 * NO gold, NO gradients, NO decoration.
 * Premium feeling comes from depth, spacing, and typography.
 * 
 * CraftCard owns ALL card styling. Only layout classes should be passed via className.
 * 
 * COLOR PAIRING RULE: Cards ALWAYS use light register (bg-surface).
 * Cards never inherit page background. A card on a dark page still uses light surface.
 */
export function CraftCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div 
      className={cn(
        // Base structure - existing tokens only
        "rounded-xl border",
        "bg-surface",
        "border-border/40",
        
        // Premium shadow stack - layered depth (from homepage cards)
        "shadow-[--shadow-card]",
        
        // Smooth transition with gentle lift
        "transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
        
        // Hover state - slightly richer shadow, subtle lift
        "hover:shadow-[--shadow-card-hover]",
        "hover:-translate-y-0.5",
        
        // Only allow layout classes (padding, margin, flex, grid, etc.)
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Card — legacy component, now uses CraftCard internally.
 * @deprecated Use CraftCard directly for new implementations.
 */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <CraftCard className={className}>{children}</CraftCard>;
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-accent", className)}>
      {children}
    </span>
  );
}
