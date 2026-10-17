import type { MetadataRoute } from "next";

const siteUrl = "https://happyplacecarpentry.com";

// Crawl preferences only; route authentication remains the access boundary.
const privatePaths = [
  "/admin",
  "/workbench",
  "/api",
  "/dashboard",
  "/customers",
  "/estimates",
  "/photos",
  "/settings",
  "/logs",
  "/integrations",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        // Explicit groups do not inherit the wildcard group's exclusions.
        userAgent: ["OAI-SearchBot", "PerplexityBot"],
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
