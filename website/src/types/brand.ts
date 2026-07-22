/**
 * Brand Authority - Company Branding Assets
 * 
 * brand.v1.json owns all company branding:
 * - Homepage hero
 * - Owner portraits
 * - Team photos
 * - Logos
 * - Office photography
 * - Marketing assets
 * 
 * Separated from Media Authority to prevent project photos
 * from becoming mixed with company branding over time.
 */

export interface BrandAsset {
  id: string;
  mediaId: string | null;
  alt: string;
}

export interface BrandHero {
  id: string;
  mediaId: string | null;
  alt: string;
  fallback: {
    gradient: boolean;
    overlay: boolean;
  };
}

export interface BrandOwnerPortrait {
  id: string;
  mediaId: string | null;
  alt: string;
  names: string[];
}

export interface BrandManifest {
  version: string;
  generatedAt: string;
  homepageHero: BrandHero;
  ownerPortrait: BrandOwnerPortrait;
  logo: BrandAsset;
  team: BrandAsset[];
  office: BrandAsset;
  marketingAssets: BrandAsset[];
}
