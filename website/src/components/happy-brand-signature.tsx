"use client";

import * as React from "react";

interface HappyBrandSignatureProps {
  className?: string;
}

export function HappyBrandSignature({ className }: HappyBrandSignatureProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      {/* Base text - always visible */}
      <span className="relative z-10">Happy</span>
      
      {/* Shimmer overlay - traces letters closely */}
      <span
        className="absolute inset-0 z-20 pointer-events-none animate-shimmer-slow"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(231,173,99,0.4) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          mixBlendMode: 'overlay',
        }}
      />
    </span>
  );
}
