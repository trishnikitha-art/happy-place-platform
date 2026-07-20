import * as React from "react";
import { cn } from "@/lib/utils";

/** Centered max-width content container. */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/** Vertical rhythm section. */
export function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("py-16 sm:py-20", className)}>{children}</section>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>}
      <h2 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-tight text-text sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-lg text-text-muted sm:text-xl">{description}</p>}
    </div>
  );
}
