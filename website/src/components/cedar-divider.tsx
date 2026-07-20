import { cn } from "@/lib/utils";

/**
 * CedarDivider — a natural wood-edge divider (Directive 032: "instead of boring
 * lines, very subtle cedar texture or natural wood edge"). Renders a thin band of
 * layered warm cedar tones. Decorative; hidden from a11y tree.
 */
export function CedarDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-2 w-full cedar-grain", className)}
    />
  );
}
