import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/company";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/services", "/gallery", "/about", "/reviews", "/faq", "/contact", "/estimate", "/privacy"];
  const now = new Date();
  return routes.map((r) => ({
    url: `${siteUrl}${r}`,
    lastModified: now,
    changeFrequency: r === "/estimate" || r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : 0.7,
  }));
}
