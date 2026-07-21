/**
 * Woodwork Craft Overlay
 * 
 * A reusable craftsmanship layer that adds subtle woodworking details
 * to sections throughout the site. Renders at 2-8% opacity so visitors
 * feel it rather than consciously notice it.
 * 
 * Usage:
 * <WoodworkCraft variant="dovetail" /> - Dovetail corner pattern
 * <WoodworkCraft variant="joinery" /> - Mortise-tenon + compass arcs
 * <WoodworkCraft variant="framing" /> - Framing marks + saw kerf
 * <WoodworkCraft variant="full" /> - All woodworking details
 */

import React from "react";

export interface WoodworkCraftProps {
  variant?: "dovetail" | "joinery" | "framing" | "full" | "minimal";
  className?: string;
}

export function WoodworkCraft({ variant = "minimal", className = "" }: WoodworkCraftProps) {
  const baseClasses = "woodwork-craft";

  return (
    <div className={`${baseClasses} ${className}`}>
      {variant === "dovetail" && (
        <div className="dovetail-corner" />
      )}
      {variant === "joinery" && (
        <>
          <div className="mortise-tenon" />
          <div className="compass-arc" />
          <div className="joinery-lines" />
        </>
      )}
      {variant === "framing" && (
        <>
          <div className="framing-marks" />
          <div className="saw-kerf" />
          <div className="snap-line" />
        </>
      )}
      {variant === "full" && (
        <>
          <div className="dovetail-corner" />
          <div className="mortise-tenon" />
          <div className="compass-arc" />
          <div className="snap-line" />
          <div className="wood-grain-contour" />
          <div className="router-curve" />
          <div className="framing-marks" />
          <div className="joinery-lines" />
          <div className="face-frame" />
        </>
      )}
    </div>
  );
}
