/**
 * Craft Blueprint Overlay
 * 
 * A reusable craftsmanship layer that adds subtle blueprint details
 * to sections throughout the site. Renders at 1-3% opacity so visitors
 * feel it rather than consciously notice it.
 * 
 * Usage:
 * <CraftBlueprint variant="grid" /> - Architectural grid only
 * <CraftBlueprint variant="full" /> - Grid + dimensions + corners
 * <CraftBlueprint variant="minimal" /> - Just grid
 */

import React from "react";

export interface CraftBlueprintProps {
  variant?: "grid" | "full" | "minimal" | "measurements";
  className?: string;
}

export function CraftBlueprint({ variant = "grid", className = "" }: CraftBlueprintProps) {
  const baseClasses = "craft-blueprint";
  const variantClasses = {
    grid: "",
    full: "",
    minimal: "",
    measurements: "",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {variant === "full" && (
        <>
          <div className="carpenter-corner" />
          <div className="measurement-ticks" />
          <div className="joinery-outline" />
          <div className="pencil-marks" />
        </>
      )}
      {variant === "measurements" && (
        <>
          <div className="measurement-ticks" />
          <div className="carpenter-corner" />
        </>
      )}
    </div>
  );
}
