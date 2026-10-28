import { cn } from "@/lib/utils";

interface WorkshopAtmosphereProps {
  className?: string;
  /** Retained for existing callers; atmosphere no longer needs particles. */
  particleCount?: number;
}

/** Warm workshop light, without a canvas or a permanent animation clock. */
export function WorkshopAtmosphere({ className }: WorkshopAtmosphereProps) {
  return <div className={cn("workshop-light absolute inset-0 pointer-events-none", className)} aria-hidden="true" />;
}
