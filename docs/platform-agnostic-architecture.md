# Platform-Agnostic Architecture

## Overview

The platform is designed to be reusable across multiple contractor businesses (carpentry, plumbing, electrical, etc.). All Happy Place-specific assumptions are moved to configuration, making the core architecture generic and transferable.

## Architecture Principles

1. **Configuration-Driven:** Business-specific details live in configuration
2. **Generic Types:** Core types avoid business-specific assumptions
3. **Pluggable Modules:** Features can be enabled/disabled per platform
4. **Multi-Tenant Ready:** Architecture supports multiple businesses
5. **Zero Hardcoding:** No business logic embedded in core code

## Configuration Layers

### 1. Platform Configuration

```typescript
// src/config/platform.ts
export interface PlatformConfig {
  name: string;
  domain: string;
  industry: "carpentry" | "plumbing" | "electrical" | "hvac" | "general";
  features: PlatformFeatures;
  authorities: PlatformAuthorities;
  integrations: PlatformIntegrations;
  branding: PlatformBranding;
}

export interface PlatformFeatures {
  projects: boolean;
  reviews: boolean;
  estimates: boolean;
  scheduling: boolean;
  invoicing: boolean;
  blog: boolean;
  gallery: boolean;
  seo: boolean;
  analytics: boolean;
}

export interface PlatformAuthorities {
  media: boolean;
  projects: boolean;
  reviews: boolean;
  brand: boolean;
  services: boolean;
  seo: boolean;
  forms: boolean;
  users: boolean;
  analytics: boolean;
}

export interface PlatformIntegrations {
  google: {
    oauth: boolean;
    workspace: boolean;
    businessProfile: boolean;
    drive: boolean;
    calendar: boolean;
  };
  email: {
    provider: "gmail" | "sendgrid" | "mailgun" | "ses";
    enabled: boolean;
  };
  sms: {
    provider: "twilio" | "messagebird" | "custom";
    enabled: boolean;
  };
  payments: {
    provider: "stripe" | "square" | "paypal" | "custom";
    enabled: boolean;
  };
}

export interface PlatformBranding {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  logo: {
    url: string;
    alt: string;
  };
}
```

### 2. Service Registry Configuration

```typescript
// src/config/services.ts
export interface ServiceConfig {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  featured: boolean;
  homepageEligible: boolean;
  icon?: string;
}

export interface ServiceRegistryConfig {
  version: string;
  services: ServiceConfig[];
}

// Happy Place-specific services
export const happyPlaceServices: ServiceConfig = {
  version: "1.0",
  services: [
    {
      id: "decks",
      slug: "decks",
      name: "Decks",
      category: "outdoor-living",
      description: "Custom deck construction and repair",
      featured: true,
      homepageEligible: true,
    },
    {
      id: "fences",
      slug: "fences",
      name: "Fences",
      category: "outdoor-living",
      description: "Fence installation and repair",
      featured: true,
      homepageEligible: true,
    },
    // ... other services
  ],
};
```

### 3. Company Configuration

```typescript
// src/config/company.ts
export interface CompanyConfig {
  name: string;
  legalName: string;
  ccbNumber?: string; // Contractor license number
  phone: string;
  email: string;
  address: CompanyAddress;
  serviceArea: ServiceArea;
  proof: CompanyProof;
  social: SocialLinks;
}

export interface CompanyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ServiceArea {
  counties: string[];
  cities: string[];
  radius?: number; // miles from base location
}

export interface CompanyProof {
  projectsCompleted: number;
  yearsInBusiness: number;
  averageRating: number;
  totalReviews: number;
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  yelp?: string;
  googleBusiness?: string;
}

// Happy Place-specific company config
export const happyPlaceCompany: CompanyConfig = {
  name: "Happy Place Carpentry",
  legalName: "Happy Place Carpentry LLC",
  ccbNumber: "254240",
  phone: "(555) 123-4567",
  email: "info@happyplacecarpentry.com",
  address: {
    street: "123 Main St",
    city: "Salem",
    state: "OR",
    zip: "97301",
    country: "USA",
  },
  serviceArea: {
    counties: ["Marion", "Polk", "Yamhill", "Washington", "Clackamas"],
    cities: ["Salem", "Keizer", "Silverton", "Dallas", "McMinnville"],
    radius: 50,
  },
  proof: {
    projectsCompleted: 150,
    yearsInBusiness: 8,
    averageRating: 4.9,
    totalReviews: 120,
  },
  social: {
    website: "https://happyplacecarpentry.com",
    facebook: "https://facebook.com/happyplacecarpentry",
    instagram: "https://instagram.com/happyplacecarpentry",
    googleBusiness: "https://g.page/r/happyplacecarpentry",
  },
};
```

## Generic Type System

### Project Types (Generic)

```typescript
// src/types/projects.ts
export type ProjectStatus = "completed" | "in-progress" | "planned" | "on-hold" | "archived";

export interface ProjectLocation {
  city: string;
  county: string;
  state: string;
  zip?: string;
  neighborhood?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ProjectMedia {
  hero: string;
  before?: string;
  after?: string;
  gallery: string[];
  details?: string[];
  progress?: string[];
  documents?: string[];
}

export interface ProjectStory {
  challenge: string;
  solution: string;
  outcome: string;
  clientGoals?: string;
  specialFeatures?: string[];
  timeline?: string;
  designNotes?: string;
  challenges?: string[];
}

export interface ProjectEstimate {
  estimatedRange: {
    low: number;
    high: number;
  };
  finalCost?: number;
  services: string[]; // Generic service IDs
  materials?: string[];
  timeline?: string;
  estimateDate?: string;
  acceptedDate?: string;
  notes?: string;
}

export interface ProjectWarranty {
  hasWarranty: boolean;
  warrantyType?: string;
  warrantyYears?: number;
  warrantyDetails?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
}

export interface ProjectSEO {
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  sitemapPriority?: number;
  sitemapChangeFreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
}

export interface ProjectServices {
  primary: string; // Generic service ID
  secondary?: string[];
  customServices?: string[];
}

export interface ProjectMaterials {
  primary?: string;
  secondary?: string[];
  customMaterials?: string[];
  suppliers?: string[];
}

export interface ProjectFeatures {
  custom?: string[];
  accessibility?: string[];
  sustainability?: string[];
  smartHome?: string[];
}

export interface ProjectTimeline {
  estimatedStart?: string;
  estimatedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  phases?: Array<{
    name: string;
    start?: string;
    end?: string;
    status?: "pending" | "in-progress" | "completed";
  }>;
}

export interface ProjectTeam {
  leadCarpenter?: string;
  crew?: string[];
  designer?: string;
  architect?: string;
  subcontractors?: Array<{
    role: string;
    company: string;
  }>;
}

export interface ProjectClient {
  name?: string;
  contactMethod?: string;
  referralSource?: string;
  firstTimeClient?: boolean;
}

export interface ProjectRelated {
  relatedProjectIds?: string[];
  similarProjects?: string[];
  beforeAfterPair?: string;
}

export interface Project {
  id: string;
  title: string;
  service: string; // Generic service ID
  status: ProjectStatus;
  location: ProjectLocation;
  completionDate?: string;
  startDate?: string;
  media: ProjectMedia;
  story?: ProjectStory;
  estimate?: ProjectEstimate;
  warranty?: ProjectWarranty;
  tags: string[];
  reviews: string[];
  featured?: boolean;
  heroEligible?: boolean;
  homepageEligible?: boolean;
  seo?: ProjectSEO;
  services?: ProjectServices;
  materials?: ProjectMaterials;
  features?: ProjectFeatures;
  timeline?: ProjectTimeline;
  team?: ProjectTeam;
  client?: ProjectClient;
  related?: ProjectRelated;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  archivedAt?: string;
  version?: number;
  lastModifiedBy?: string;
}

export interface ProjectsManifest {
  version: string;
  generatedAt: string;
  projects: Project[];
}
```

### Media Types (Already Generic)

Media types are already generic and don't require changes.

### Review Types (Generic)

```typescript
// src/types/reviews.ts
export interface Review {
  id: string;
  projectId?: string;
  reviewer: {
    name: string;
    email?: string;
    location?: string;
  };
  rating: number; // 1-5
  title?: string;
  body: string;
  response?: string;
  featured?: boolean;
  verified?: boolean;
  source?: "google" | "yelp" | "facebook" | "website" | "other";
  sourceUrl?: string;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface ReviewsManifest {
  version: string;
  generatedAt: string;
  reviews: Review[];
}
```

## Configuration Loader

```typescript
// src/lib/config/loader.ts
import { PlatformConfig } from '@/config/platform';
import { ServiceRegistryConfig } from '@/config/services';
import { CompanyConfig } from '@/config/company';

export class ConfigLoader {
  private platformConfig: PlatformConfig | null = null;
  private serviceConfig: ServiceRegistryConfig | null = null;
  private companyConfig: CompanyConfig | null = null;

  loadPlatformConfig(): PlatformConfig {
    if (!this.platformConfig) {
      // Load from environment or config file
      this.platformConfig = {
        name: process.env.PLATFORM_NAME || "Happy Place Carpentry",
        domain: process.env.PLATFORM_DOMAIN || "happyplacecarpentry.com",
        industry: (process.env.PLATFORM_INDUSTRY as any) || "carpentry",
        features: {
          projects: true,
          reviews: true,
          estimates: false,
          scheduling: false,
          invoicing: false,
          blog: false,
          gallery: true,
          seo: true,
          analytics: false,
        },
        authorities: {
          media: true,
          projects: true,
          reviews: true,
          brand: true,
          services: true,
          seo: true,
          forms: false,
          users: false,
          analytics: false,
        },
        integrations: {
          google: {
            oauth: true,
            workspace: false,
            businessProfile: true,
            drive: false,
            calendar: false,
          },
          email: {
            provider: "gmail",
            enabled: true,
          },
          sms: {
            provider: "twilio",
            enabled: false,
          },
          payments: {
            provider: "stripe",
            enabled: false,
          },
        },
        branding: {
          colors: {
            primary: "#D99A4E",
            secondary: "#1F3F3C",
            accent: "#D99A4E",
            background: "#FAF7F2",
            text: "#1F3F3C",
          },
          typography: {
            heading: "Inter",
            body: "Inter",
          },
          logo: {
            url: "/logo.svg",
            alt: "Happy Place Carpentry Logo",
          },
        },
      };
    }
    return this.platformConfig;
  }

  loadServiceConfig(): ServiceRegistryConfig {
    if (!this.serviceConfig) {
      // Load from config file based on platform
      this.serviceConfig = happyPlaceServices;
    }
    return this.serviceConfig;
  }

  loadCompanyConfig(): CompanyConfig {
    if (!this.companyConfig) {
      // Load from config file based on platform
      this.companyConfig = happyPlaceCompany;
    }
    return this.companyConfig;
  }
}

// Singleton instance
export const configLoader = new ConfigLoader();
```

## Adapter Layer Updates

### Service Adapter (Generic)

```typescript
// src/lib/services.ts
import { configLoader } from './config/loader';
import type { ServiceConfig } from '@/config/services';

export function getAllServices(): ServiceConfig[] {
  const config = configLoader.loadServiceConfig();
  return config.services;
}

export function getServiceById(id: string): ServiceConfig | undefined {
  const services = getAllServices();
  return services.find(s => s.id === id);
}

export function getServiceBySlug(slug: string): ServiceConfig | undefined {
  const services = getAllServices();
  return services.find(s => s.slug === slug);
}

export function getFeaturedServices(): ServiceConfig[] {
  const services = getAllServices();
  return services.filter(s => s.featured);
}

export function getHomepageEligibleServices(): ServiceConfig[] {
  const services = getAllServices();
  return services.filter(s => s.homepageEligible);
}
```

### Company Adapter (Generic)

```typescript
// src/lib/company.ts
import { configLoader } from './config/loader';
import type { CompanyConfig } from '@/config/company';

export function getCompanyConfig(): CompanyConfig {
  return configLoader.loadCompanyConfig();
}

export function getCompanyName(): string {
  return getCompanyConfig().name;
}

export function getCompanyProof() {
  return getCompanyConfig().proof;
}

export function getServiceArea() {
  return getCompanyConfig().serviceArea;
}
```

## Component Updates

### ServiceCard Component (Generic)

```typescript
// src/components/service-card.tsx
import { getServiceById } from '@/lib/services';
import { getFeaturedServiceMedia } from '@/lib/media';

interface ServiceCardProps {
  serviceId: string;
}

export function ServiceCard({ serviceId }: ServiceCardProps) {
  const service = getServiceById(serviceId);
  const media = getFeaturedServiceMedia(service?.slug || '');

  if (!service) return null;

  return (
    <div className="service-card">
      {/* Render service card using generic service data */}
    </div>
  );
}
```

## Migration Path

### Step 1: Extract Configuration

- Move Happy Place-specific data to config files
- Create generic type definitions
- Build configuration loader

### Step 2: Update Adapters

- Make adapters use configuration instead of hardcoded values
- Remove business-specific assumptions

### Step 3: Update Components

- Pass service IDs instead of service objects
- Use configuration for branding

### Step 4: Test with New Platform

- Create test configuration for different business
- Verify all components work generically

### Step 5: Documentation

- Document configuration schema
- Create setup guide for new platforms

## Multi-Tenant Considerations

Future multi-tenant support would require:

1. **Tenant Configuration:** Per-tenant config loaded from database
2. **Tenant Routing:** Subdomain or path-based tenant routing
3. **Tenant Isolation:** Data isolation between tenants
4. **Tenant Billing:** Per-tenant billing and limits

## Benefits

1. **Reusable:** Same codebase for multiple businesses
2. **Transferable:** Easy ownership transfer
3. **Maintainable:** Single codebase to maintain
4. **Scalable:** Can support many platforms
5. **Testable:** Generic architecture easier to test
