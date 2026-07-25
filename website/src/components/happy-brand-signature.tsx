"use client";

import * as React from "react";

interface HappyBrandSignatureProps {
  className?: string;
  autoPlay?: boolean;
}

export function HappyBrandSignature({ className, autoPlay = false }: HappyBrandSignatureProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={() => !autoPlay && setIsHovered(true)}
      onMouseLeave={() => !autoPlay && setIsHovered(false)}
    >
      {/* Base gold text with layered gradients */}
      <span
        className={`
          relative z-10
          bg-gradient-to-br from-[#A67C00] via-[#D99A4E] via-[#E7AD63] to-[#F0C070]
          bg-clip-text text-transparent
          transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${!autoPlay && isHovered ? 'scale-[1.01]' : 'scale-100'}
        `}
        style={{
          filter: !autoPlay && isHovered ? 'brightness(1.08) saturate(1.1)' : 'brightness(1) saturate(1)',
        }}
      >
        Happy
      </span>
      
      {/* Animated shimmer sweep - warm light traveling left to right */}
      <span
        className={`
          absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/15 via-white/10 to-transparent
          bg-clip-text text-transparent
          pointer-events-none
          ${autoPlay ? 'animate-shimmer-slow' : (isHovered ? 'animate-shimmer-fast' : 'animate-shimmer-slow')}
        `}
        style={{
          backgroundSize: '200% 100%',
        }}
      >
        Happy
      </span>
    </span>
  );
}
