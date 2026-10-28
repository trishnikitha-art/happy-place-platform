import { cn } from "@/lib/utils";

interface PencilLineProps {
  className?: string;
  direction?: "horizontal" | "vertical";
  color?: string;
}

/** Static craft divider; no layout animation or independent viewport observer. */
export function PencilLine({ className, direction = "horizontal", color = "rgba(100, 100, 100, 0.3)" }: PencilLineProps) {
  const horizontal = direction === "horizontal";
  return <div className={cn(horizontal ? "w-full overflow-hidden" : "h-full overflow-hidden", className)} aria-hidden="true">
    <div className={horizontal ? "h-px w-full" : "w-px h-full"} style={{ backgroundColor: color }} />
  </div>;
}
