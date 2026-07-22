/**
 * Registry Types - Data-Driven Configuration
 */

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  featured: boolean;
  homepageEligible: boolean;
  order: number;
}

export interface ServicesRegistry {
  version: string;
  generatedAt: string;
  services: Service[];
}

export interface City {
  id: string;
  name: string;
  county: string;
  state: string;
  zipCodes: string[];
  featured: boolean;
  homepageEligible: boolean;
  order: number;
}

export interface CitiesRegistry {
  version: string;
  generatedAt: string;
  cities: City[];
}

export interface Material {
  id: string;
  name: string;
  description: string;
  icon: string;
  featured: boolean;
  order: number;
}

export interface MaterialsRegistry {
  version: string;
  generatedAt: string;
  materials: Material[];
}

export interface GalleryPresetFilter {
  hasBefore?: boolean;
  hasAfter?: boolean;
  featured?: boolean;
  services?: string[];
  tags?: string[];
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
}

export interface GalleryPreset {
  id: string;
  name: string;
  description: string;
  filter: GalleryPresetFilter;
  featured: boolean;
  order: number;
}

export interface GalleryPresetsRegistry {
  version: string;
  generatedAt: string;
  presets: GalleryPreset[];
}
