import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display, Playball } from "next/font/google";
import "./globals.css";
import { getCompany } from "@/lib/company";
import { seo } from "@/config/seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollToTop } from "@/components/scroll-to-top";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });
const playball = Playball({ variable: "--font-playball", subsets: ["latin"], weight: "400" });

const company = getCompany();
const siteUrl = "https://happyplacecarpentry.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: seo.title,
    template: `%s · ${seo.siteName}`,
  },
  description: seo.description,
  keywords: seo.keywords,
  openGraph: {
    type: "website",
    siteName: seo.siteName,
    title: seo.title,
    description: seo.description,
    url: siteUrl,
    images: [{ url: seo.ogImage! }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: [seo.ogImage!],
  },
  alternates: { canonical: siteUrl },
  icons: { icon: "/brand/favicon.svg", apple: "/brand/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.legalName,
    image: `${siteUrl}/images/og-default.svg`,
    url: siteUrl,
    telephone: company.phone,
    email: company.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: company.address.city,
      addressRegion: company.address.region,
      addressCountry: company.address.country,
    },
    areaServed: company.serviceArea,
    priceRange: "$$",
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${playball.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <ScrollToTop />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
