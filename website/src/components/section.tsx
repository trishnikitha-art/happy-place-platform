import * as React from "react";
import { cn } from "@/lib/utils";

/** Centered max-width content container. */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/** Vertical rhythm section with optional background tint. */
export function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("py-16 sm:py-20", className)}>{children}</section>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-lg text-stone-600">{description}</p>}
    </div>
  );
}
