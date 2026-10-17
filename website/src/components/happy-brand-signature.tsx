"use client";

import * as React from "react";

interface HappyBrandSignatureProps {
  className?: string;
}

export function HappyBrandSignature({ className }: HappyBrandSignatureProps) {
  return (
    <span className={`relative inline-block ${className || ''}`}>
      <span className="relative z-10">Happy</span>
      <span aria-hidden="true" className="absolute inset-0 z-20 pointer-events-none happy-gold-shine" style={{ font: 'inherit', letterSpacing: 'inherit' }}>
        Happy
      </span>
    </span>
  );
}
