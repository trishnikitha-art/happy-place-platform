/**
 * Registry Types - Data-Driven Configuration
 */

export interface ServiceCapabilities {
  paintableSurface?: boolean;
  surfaceType?: string;
  paintingType?: string;
  estimationAuthority: "building" | "painting";
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  featured: boolean;
  homepageEligible: boolean;
  order: number;
  capabilities: ServiceCapabilities;
  estimateQuestions?: EstimateQuestion[];
  /** If true, skip the wizard's "Tell us about your project" intent step */
  skipsIntentStep?: boolean;
  /** Default project intent for services that skip the intent step */
  defaultProjectIntent?: string;
}

export interface EstimateQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "boolean";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
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
