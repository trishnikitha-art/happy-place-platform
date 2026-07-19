import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/company";
import { getProjects } from "@/config/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/services", "/gallery", "/projects", "/about", "/reviews", "/faq", "/contact", "/estimate", "/privacy"];
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${siteUrl}${r}`,
    lastModified: now,
    changeFrequency: r === "/estimate" || r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : 0.7,
  }));
  const projectEntries: MetadataRoute.Sitemap = getProjects().map((p) => ({
    url: `${siteUrl}/projects/${p.slug}`,
    lastModified: p.completedAt ? new Date(p.completedAt) : now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));
  return [...staticEntries, ...projectEntries];
}
