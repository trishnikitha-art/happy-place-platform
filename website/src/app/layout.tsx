import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display, Playball } from "next/font/google";
import "./globals.css";
import { getCompany } from "@/lib/company";
import { seo } from "@/config/seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getHomepageHero } from "@/lib/brand";
import { getMediaById } from "@/lib/media";
import { ThemeProvider } from "@/components/theme-provider";
import { LenisProvider } from "@/components/lenis-provider";
import { MotionProvider } from "@/components/motion-provider";
import { SpeculationRules } from "@/components/speculation-rules";

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const heroBrand = await getHomepageHero();
  // P1 FIX: Use pre-validated resolvedMedia from brand function (passed public media gate)
  // This prevents bypassing the public media gate by calling getMediaById directly
  const heroMedia = heroBrand?.resolvedMedia || null;
  const ogImageUrl = heroMedia?.variants?.web || `${siteUrl}/brand/logo.png`;
  const logoUrl = `${siteUrl}/brand/logo.png`;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.legalName,
    logo: logoUrl,
    image: ogImageUrl.startsWith("http") ? ogImageUrl : `${siteUrl}${ogImageUrl}`,
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${playball.variable} h-full antialiased`} style={{ colorScheme: 'dark light' }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('hpp-theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider defaultTheme="system" storageKey="hpp-theme">
          <MotionProvider>
            <LenisProvider>
            <SpeculationRules />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
            >
              Skip to main content
            </a>
            <ScrollToTop />
            <SiteHeader />
            <main id="main-content" className="flex-1">{children}</main>
            <SiteFooter />
            </LenisProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
