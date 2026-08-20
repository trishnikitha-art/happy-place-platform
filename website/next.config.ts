import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // next/image will serve AVIF/WebP automatically for raster images.
    formats: ["image/avif", "image/webp"],
    // MVP uses committed SVG placeholders. SVG optimization is disabled for
    // safety by default; we explicitly allow our own SVGs and sandbox them.
    // Remove this (and swap to real JPG/WebP) when client photos are dropped in.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    // Allow Drive thumbnail URLs with query strings for dynamic Drive media
    // Allow local project images (including filenames with spaces)
    // Allow brand assets (logo, favicon, etc.)
    localPatterns: [
      {
        pathname: '/api/drive/files/**',
      },
      {
        pathname: '/images/**',
      },
      {
        pathname: '/brand/**',
      },
    ],
  },
  // Allow browser preview for development
  allowedDevOrigins: ['127.0.0.1'],
  async redirects() {
    return [
      {
        source: '/services/built-ins',
        destination: '/services/finish-carpentry',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
