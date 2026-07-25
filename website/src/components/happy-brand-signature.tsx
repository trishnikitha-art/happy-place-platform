"use client";

import * as React from "react";

interface HappyBrandSignatureProps {
  className?: string;
}

export function HappyBrandSignature({ className }: HappyBrandSignatureProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      {/* Normal text - inherits all typography from parent */}
      <span className="relative z-10">Happy</span>
      
      {/* Gold specular highlight overlay - moving reflection like sunlight on brass */}
      <span
        className={`
          absolute inset-0 z-20 pointer-events-none
          happy-gold-shine
          animate-happy-gold-idle
        `}
      />
    </span>
  );
}
