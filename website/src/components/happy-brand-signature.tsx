"use client";

import * as React from "react";

interface HappyBrandSignatureProps {
  className?: string;
}

export function HappyBrandSignature({ className }: HappyBrandSignatureProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Normal text - same typography as surrounding text */}
      <span className="relative z-10">Happy</span>
      
      {/* Specular highlight overlay - light moving across like sunlight on brass */}
      <span
        className={`
          absolute inset-0 bg-gradient-to-r 
          from-transparent 
          via-white/10 
          to-transparent
          bg-clip-text text-transparent
          pointer-events-none
          z-20
          ${isHovered ? 'animate-shimmer-fast' : 'animate-shimmer-slow'}
        `}
        style={{
          backgroundSize: '300% 100%',
        }}
      >
        Happy
      </span>
    </span>
  );
}
