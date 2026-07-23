import type { MetadataRoute } from "next";

const siteUrl = "https://happyplacecarpentry.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/customers", "/projects", "/estimates", "/photos", "/settings", "/logs", "/integrations"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
