import * as React from "react";
import { cn } from "@/lib/utils";

/** Centered max-width content container. */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/** Vertical rhythm section. `size` controls breathing room:
    major = emotional moments (hero, featured, family); minor = supporting. */
export function Section({
  className,
  children,
  size = "major",
}: {
  className?: string;
  children: React.ReactNode;
  size?: "major" | "minor";
}) {
  const pad = size === "minor" ? "py-12 sm:py-16" : "py-20 sm:py-28";
  return <section className={cn(pad, className)}>{children}</section>;
}

/** A quiet section separator: thin cedar rule + tiny brass pin. Never obvious. */
export function CraftDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)} aria-hidden="true">
      <div className="craft-rule"><span /></div>
    </div>
  );
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
