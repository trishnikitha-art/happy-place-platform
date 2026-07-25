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
      
      {/* Gold shimmer overlay - same text with gradient */}
      <span className="absolute inset-0 z-20 pointer-events-none happy-gold-shine animate-happy-gold-idle font-display font-bold tracking-tight">
        Happy
      </span>
    </span>
  );
}
