import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-stone-200 bg-white shadow-sm", className)}>{children}</div>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800", className)}>
      {children}
    </span>
  );
}
