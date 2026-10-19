import type { MetadataRoute } from "next";
import { getAllProjects } from "@/lib/projects";
import { getNonArchivedServices } from "@/lib/registries";

const siteUrl = "https://happyplacecarpentry.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/services", "/our-work", "/about", "/reviews", "/faq", "/contact", "/privacy"];
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${siteUrl}${r}`,
    lastModified: now,
    changeFrequency: r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : 0.7,
  }));
  const projectEntries: MetadataRoute.Sitemap = getAllProjects().map((p) => ({
    url: `${siteUrl}/projects/${p.seo?.slug || p.id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));
  // P1 FIX: Add service pages to sitemap from the same registry used by public listing
  // Service type does not have updatedAt field, so omit lastModified
  const serviceEntries: MetadataRoute.Sitemap = getNonArchivedServices().map((s) => ({
    url: `${siteUrl}/services/${s.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...staticEntries, ...projectEntries, ...serviceEntries];
}
