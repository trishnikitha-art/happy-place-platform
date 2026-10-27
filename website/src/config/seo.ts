import type { Metadata } from "next";
import { getCompany } from "@/lib/company";

const company = getCompany();

/**
 * Site-wide SEO defaults. Per-page metadata extends these via the Next Metadata API.
 * Project photography must arrive through the existing public media resolver.
 * The fixed brand logo is the fallback when no published image is available.
 */
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
  title: "Willamette Valley Carpentry & Repairs · Happy Place Carpentry",
  // Oregon CCB's official active-license snapshot was verified on 2026-10-27.
  description:
    `Licensed Oregon contractor (${company.ccbNumber}). Painting, home repairs, fences, decks, restoration and drywall in the Mid-Willamette Valley.`,
  keywords: ["carpenter", "painting", "home repairs", "fence installation", "drywall", "Willamette Valley"],
  ogImage: "/brand/logo.png",
  twitter: "@happyplacecarp",
};

/** Format existing page/content authority for every sharing channel. No copy is stored here. */
export function pageMetadata({ title, description, path, image, imageAlt, absoluteTitle = false, type = 'website' }: {
  title: string;
  description: string;
  path: string;
  /** Only fixed brand assets or URLs already approved by the public media gate. */
  image?: string;
  imageAlt?: string;
  absoluteTitle?: boolean;
  type?: 'website' | 'article';
}): Metadata {
  const shareTitle = absoluteTitle ? title : `${title} · ${seo.siteName}`;
  const imageUrl = new URL(image || seo.ogImage, seo.siteUrl).toString();
  const alt = image ? imageAlt || title : `${seo.siteName} logo`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: seo.siteName,
      title: shareTitle,
      description,
      url: new URL(path, seo.siteUrl).toString(),
      images: [{ url: imageUrl, alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: [{ url: imageUrl, alt }],
    },
  };
}
