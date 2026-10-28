import { cn } from "@/lib/utils";

interface BlueprintGridProps {
  className?: string;
  gridSize?: number;
  lineColor?: string;
}

/** Quiet workshop texture. Section motion belongs to the shared ScrollReveal. */
export function BlueprintGrid({ className, gridSize = 20, lineColor = "rgba(100, 120, 140, 0.08)" }: BlueprintGridProps) {
  return <div aria-hidden="true" className={cn("absolute inset-0 pointer-events-none", className)} style={{
    backgroundImage: 'linear-gradient(to right, ' + lineColor + ' 1px, transparent 1px), linear-gradient(to bottom, ' + lineColor + ' 1px, transparent 1px)',
    backgroundSize: gridSize + 'px ' + gridSize + 'px',
  }} />;
}
