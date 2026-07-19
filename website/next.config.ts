import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // MVP uses committed SVG placeholders. SVG optimization is disabled for
    // safety by default; we explicitly allow our own SVGs and sandbox them.
    // Remove this (and swap to real JPG/WebP) when client photos are dropped in.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
