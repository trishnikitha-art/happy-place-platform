import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-card border border-border bg-surface shadow-sm", className)}>{children}</div>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-secondary", className)}>
      {children}
    </span>
  );
}
