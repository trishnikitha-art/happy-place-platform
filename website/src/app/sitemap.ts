import type { MetadataRoute } from "next";
import { getAllProjects } from "@/lib/projects";
import { getNonArchivedServices } from "@/lib/registries";
import { BLOG_COPY_RECORDS } from "@/lib/blog-copy";
import { seo } from "@/config/seo";

const siteUrl = seo.siteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/services", "/our-work", "/about", "/reviews", "/faq", "/contact", "/privacy", "/blog"];
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${siteUrl}${r}`,
    changeFrequency: r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : 0.7,
  }));
  const projectEntries: MetadataRoute.Sitemap = getAllProjects().map((p) => ({
    // Match generateStaticParams, project links and page canonical URLs.
    url: `${siteUrl}/projects/${p.slug || p.id}`,
    ...(p.updatedAt ? { lastModified: new Date(p.updatedAt) } : {}),
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
  const blogEntries: MetadataRoute.Sitemap = BLOG_COPY_RECORDS.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    changeFrequency: "yearly",
    priority: 0.5,
  }));
  return [...staticEntries, ...projectEntries, ...serviceEntries, ...blogEntries];
}
