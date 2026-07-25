"use client";

import * as React from "react";

interface HappyBrandSignatureProps {
  variant?: "hero" | "heading" | "inline" | "signature";
  className?: string;
}

export function HappyBrandSignature({ variant = "hero", className }: HappyBrandSignatureProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyles = {
    hero: "font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight",
    heading: "font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight",
    inline: "font-display text-2xl sm:text-3xl font-bold tracking-tight",
    signature: "font-signature text-2xl sm:text-3xl tracking-wide",
  };

  // Layered gold gradients - deep cedar gold, warm honey, soft amber, highlight, darker edges
  const gradientStyles = {
    hero: "bg-gradient-to-br from-[#A67C00] via-[#D99A4E] via-[#E7AD63] to-[#F0C070]",
    heading: "bg-gradient-to-br from-[#A67C00] via-[#D99A4E] via-[#E7AD63] to-[#F0C070]",
    inline: "bg-gradient-to-br from-[#A67C00] via-[#D99A4E] via-[#E7AD63] to-[#F0C070]",
    signature: "bg-gradient-to-br from-[#D99A4E] via-[#E7AD63] via-[#F0C070] to-[#F8D080]",
  };

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base gold text with layered gradients */}
      <span
        className={`
          ${baseStyles[variant]}
          ${gradientStyles[variant]}
          bg-clip-text text-transparent
          transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isHovered ? 'scale-[1.01]' : 'scale-100'}
        `}
        style={{
          filter: isHovered ? 'brightness(1.08) saturate(1.1)' : 'brightness(1) saturate(1)',
        }}
      >
        HAPPY
      </span>
      
      {/* Animated shimmer sweep - warm light traveling left to right */}
      <span
        className={`
          absolute inset-0 bg-gradient-to-r from-transparent via-white/15 via-white/10 to-transparent
          bg-clip-text text-transparent
          pointer-events-none
          ${isHovered ? 'animate-shimmer-fast' : 'animate-shimmer-slow'}
        `}
        style={{
          backgroundSize: '200% 100%',
        }}
      >
        HAPPY
      </span>
    </span>
  );
}
