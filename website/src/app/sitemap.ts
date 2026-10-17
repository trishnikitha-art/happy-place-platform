import type { MetadataRoute } from "next";
import { getAllProjects } from "@/lib/projects";
import { getNonArchivedServices } from "@/lib/registries";
import { BLOG_COPY_RECORDS } from "@/lib/blog-copy";

const siteUrl = "https://happyplacecarpentry.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/services", "/our-work", "/about", "/reviews", "/faq", "/contact", "/estimate", "/newsletter", "/resources", "/blog", "/privacy"];
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${siteUrl}${r}`,
    lastModified: now,
    changeFrequency: r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : 0.7,
  }));
  const projectEntries: MetadataRoute.Sitemap = getAllProjects().map((p) => ({
    url: `${siteUrl}/projects/${p.slug || p.id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));
  const serviceEntries: MetadataRoute.Sitemap = getNonArchivedServices().map(service => ({ url: `${siteUrl}/services/${service.slug}`, changeFrequency: 'monthly', priority: 0.7 }));
  const articleEntries: MetadataRoute.Sitemap = BLOG_COPY_RECORDS.map(article => ({ url: `${siteUrl}/blog/${article.slug}`, changeFrequency: 'yearly', priority: 0.5 }));
  return [...staticEntries, ...projectEntries, ...serviceEntries, ...articleEntries];
}
