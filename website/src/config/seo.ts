import type { SeoMeta } from "@/types";
import { getMediaById } from "@/lib/media";

/**
 * Site-wide SEO defaults. Per-page metadata extends these via the Next Metadata API.
 * ogImage resolves through Media Authority (media.v1.json) — never hardcoded.
 */
const _featuredMedia = getMediaById("brand-featured");

export const seo: {
  siteUrl: string;
  siteName: string;
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  twitter: string;
} = {
  siteUrl: "https://happyplacecarpentry.com",
  siteName: "Happy Place Carpentry",
  title: "Happy Place Carpentry — Decks, Fences & Remodels in the Willamette Valley",
  description:
    "Licensed Oregon carpentry contractor (CCB# 254240) building decks, fences, pergolas, bathrooms, and custom work across Benton, Linn, Marion & Polk Counties.",
  keywords: ["carpenter", "deck builder", "fence installer", "bathroom remodel", "Oregon contractor", "Willamette Valley"],
  ogImage: _featuredMedia?.variants?.web || "/images/projects/featured/featured-480.webp",
  twitter: "@happyplacecarp",
};
