import type { MetadataRoute } from "next";
import { getAllProjects } from "@/lib/projects";

const siteUrl = "https://happyplacecarpentry.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/services", "/gallery", "/about", "/reviews", "/faq", "/contact", "/estimate", "/privacy"];
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${siteUrl}${r}`,
    lastModified: now,
    changeFrequency: r === "/estimate" || r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : 0.7,
  }));
  const projectEntries: MetadataRoute.Sitemap = getAllProjects().map((p) => ({
    url: `${siteUrl}/projects/${p.seo?.slug || p.id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));
  return [...staticEntries, ...projectEntries];
}
