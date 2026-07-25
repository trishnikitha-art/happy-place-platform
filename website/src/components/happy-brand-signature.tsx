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
      
      {/* Specular highlight overlay - moving reflection like sunlight on brass */}
      <span
        className={`
          absolute inset-0 z-20 pointer-events-none
          bg-linear-gradient-r
          from-transparent
          via-white/8
          to-transparent
          opacity-0
          animate-shimmer-slow
        `}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          mixBlendMode: 'overlay',
        }}
      />
    </span>
  );
}
