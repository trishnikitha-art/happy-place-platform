import type { SeoMeta } from "@/types";
import { siteUrl } from "./company";

/** Site-wide SEO defaults. Per-page metadata extends these via the Next Metadata API. */
export const seo: {
  siteUrl: string;
  siteName: string;
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  twitter: string;
} = {
  siteUrl,
  siteName: "Happy Place Carpentry",
  title: "Happy Place Carpentry — Decks, Fences & Remodels in the Willamette Valley",
  description:
    "Licensed Oregon carpentry contractor (CCB# 254240) building decks, fences, pergolas, kitchens, baths, and custom work across Benton, Linn, Marion & Polk Counties.",
  keywords: ["carpenter", "deck builder", "fence installer", "kitchen remodel", "Oregon contractor", "Willamette Valley"],
  ogImage: "/images/projects/featured/featured-1080.webp",
  twitter: "@happyplacecarp",
};
