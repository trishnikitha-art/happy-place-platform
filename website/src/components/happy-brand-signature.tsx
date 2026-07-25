"use client";

import * as React from "react";

interface HappyBrandSignatureProps {
  className?: string;
}

export function HappyBrandSignature({ className }: HappyBrandSignatureProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      {/* Normal text - same typography as surrounding text */}
      <span className="relative z-10">Happy</span>
      
      {/* Specular highlight overlay - light moving across like sunlight on brass */}
      <span
        className={`
          absolute inset-0 bg-gradient-to-r 
          from-transparent 
          via-white/5 
          to-transparent
          bg-clip-text text-transparent
          pointer-events-none
          z-20
          animate-shimmer-slow
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
