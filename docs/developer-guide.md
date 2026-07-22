# Developer Guide

**Status: DOCUMENTATION COMPLETE**

This guide provides comprehensive developer documentation for the Happy Place Platform content architecture.

---

## Architecture Overview

### Canonical Data Sources

The platform uses four canonical data sources as the single source of truth:

1. **projects.v1.json** - Project Authority (business database)
2. **media.v1.json** - Media Authority (single media database)
3. **reviews.v1.json** - Review Authority (customer feedback)
4. **Registries** - Data-driven configuration (services, cities, materials, gallery presets)

### Key Principles

- **No Direct External Access**: The website never reads Google Drive, Google Reviews, or estimate forms directly
- **Canonical Data Only**: All components read from canonical JSON files
- **Data-Driven Registries**: Services, cities, materials are configured via JSON, not hardcoded
- **Metadata-Driven Galleries**: Galleries are virtual, based on project metadata, not physical folders
- **Project-Owned Before/After**: Before/after photos are owned by projects via media IDs

---

## File Structure

```
website/
├── src/
│   ├── config/
│   │   ├── services.v1.json          # Service registry
│   │   ├── cities.v1.json            # City registry
│   │   ├── materials.v1.json         # Material registry
│   │   ├── gallery-presets.v1.json    # Gallery preset registry
│   │   ├── projects.v1.json          # Project Authority
│   │   ├── media.v1.json             # Media Authority
│   │   └── reviews.v1.json           # Review Authority
│   ├── types/
│   │   ├── registries.ts             # Registry type definitions
│   │   ├── projects.ts               # Project type definitions
│   │   ├── media.ts                  # Media type definitions
│   │   └── reviews.ts                # Review type definitions
│   ├── lib/
│   │   ├── registries.ts             # Registry adapter functions
│   │   ├── projects.ts               # Project adapter functions
│   │   ├── media.ts                  # Media adapter functions
│   │   ├── reviews.ts                # Review adapter functions
│   │   └── galleries.ts              # Virtual gallery engine
│   └── components/
│       ├── placeholder-section.tsx   # Intelligent placeholders
│       ├── before-after-slider.tsx   # Project-owned before/after
│       ├── review-card.tsx           # Review with project attachment
│       └── featured-review.tsx       # Featured review with project
```

---

## Type Definitions

### Service (from registries.ts)

```typescript
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
```

### Project (from projects.ts)

```typescript
export interface Project {
  id: string;
  title: string;
  service: ProjectService;
  status: ProjectStatus;
  location: ProjectLocation;
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
```

### Media (from media.ts)

```typescript
export interface Media {
  id: string;
  filename: string;
  type: MediaType;
  dimensions: MediaDimensions;
  variants: MediaVariants;
  alt: string;
  classification: MediaClassification;
  roles: MediaRole[];
  editorial: MediaEditorial;
  metadata?: MediaMetadata;
}
```

### Review (from reviews.ts)

```typescript
export interface Review {
  id: string;
  source: ReviewSource;
  featured: boolean;
  verified: boolean;
  reviewer: Reviewer;
  rating: number;
  date: string;
  service?: ReviewService;
  projectId?: string;
  location?: ReviewLocation;
  title?: string;
  body: string;
  ownerResponse?: OwnerResponse;
  googleReviewId?: string;
  syncStatus?: SyncStatus;
  importedAt?: string;
  lastSynced?: string;
  highlight?: boolean;
  featuredWeight?: number;
  heroEligible?: boolean;
  homepageEligible?: boolean;
}
```

---

## Adapter Functions

### Registry Adapter (lib/registries.ts)

```typescript
import { getAllServices, getServiceById, getServiceBySlug } from "@/lib/registries";

// Get all services
const services = getAllServices();

// Get service by ID
const deckService = getServiceById("decks");

// Get service by slug
const deckService = getServiceBySlug("decks");
```

### Project Adapter (lib/projects.ts)

```typescript
import { getAllProjects, getProjectById, getProjectsByService } from "@/lib/projects";

// Get all projects
const projects = getAllProjects();

// Get project by ID
const project = getProjectById("proj-001");

// Get projects by service
const deckProjects = getProjectsByService("decks");

// Get featured projects
const featuredProjects = getFeaturedProjects();
```

### Media Adapter (lib/media.ts)

```typescript
import { getMediaById } from "@/lib/media";

// Get media by ID
const media = getMediaById("media-001");

// Get image source
const src = media?.variants?.original || media?.variants?.webp;
```

### Review Adapter (lib/reviews.ts)

```typescript
import { getAllReviews, getFeaturedReviews, getReviewsByService } from "@/lib/reviews";

// Get all reviews
const reviews = getAllReviews();

// Get featured reviews
const featuredReviews = getFeaturedReviews();

// Get reviews by service
const deckReviews = getReviewsByService("decks");

// Get review statistics
const stats = getReviewStats();
```

### Gallery Engine (lib/galleries.ts)

```typescript
import { createGallery, getServiceGallery, getCityGallery } from "@/lib/galleries";

// Create custom gallery
const gallery = createGallery(
  { service: "decks", featured: true },
  "featured-decks",
  "Featured Decks",
  "Our best deck projects"
);

// Get service gallery
const deckGallery = getServiceGallery("decks");

// Get city gallery
const corvallisGallery = getCityGallery("corvallis");
```

---

## Component Usage

### Placeholder Section

```typescript
import { PlaceholderSection } from "@/components/placeholder-section";

<PlaceholderSection
  type="gallery"
  title="Project Photos Coming Soon"
  description="We're currently building our portfolio."
  count={0}
  action={{
    label: "Get a Free Estimate",
    href: "/estimate",
  }}
/>
```

### Before/After Slider

```typescript
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getProjectById } from "@/lib/projects";

const project = getProjectById("proj-001");

<BeforeAfterSlider project={project} />
```

### Review Card with Project Attachment

```typescript
import { ReviewCard } from "@/components/review-card";

<ReviewCard review={review} />
// Automatically shows project photo if projectId exists
```

### Featured Review with Project Attachment

```typescript
import { FeaturedReview } from "@/components/featured-review";

<FeaturedReview review={review} />
// Automatically shows project photo if projectId exists
```

---

## Adding a New Service

### Step 1: Update services.v1.json

```json
{
  "version": "1.0.0",
  "services": [
    {
      "id": "new-service",
      "name": "New Service",
      "slug": "new-service",
      "description": "Description of the new service",
      "icon": "hammer",
      "featured": true,
      "homepageEligible": true,
      "order": 10
    }
  ]
}
```

### Step 2: Update ProjectService Type

```typescript
// src/types/projects.ts
export type ProjectService = 
  | "decks" 
  | "fences" 
  | "new-service"  // Add here
  | "other";
```

### Step 3: Update ReviewService Type

```typescript
// src/types/reviews.ts
export type ReviewService = 
  | "decks" 
  | "fences" 
  | "new-service"  // Add here
  | "other";
```

### Step 4: Service Page Automatically Generated

The service landing page at `/services/new-service` is automatically generated from the registry.

---

## Adding a New City

### Step 1: Update cities.v1.json

```json
{
  "version": "1.0.0",
  "cities": [
    {
      "id": "new-city",
      "name": "New City",
      "county": "County Name",
      "state": "OR",
      "zipCodes": ["97XXX"],
      "featured": true,
      "homepageEligible": false
    }
  ]
}
```

### Step 2: City Gallery Automatically Available

```typescript
import {	getCityGallery } from "@/lib/galleries";

const newCityGallery = getCityGallery("new-city");
```

---

## Adding a New Material

### Step 1: Update materials.v1.json

```json
{
  "version": "1.0.0",
  "materials": [
    {
      "id": "new-material",
      "name": "New Material",
      "description": "Description of the material",
      "icon": "box",
      "featured": true
    }
  ]
}
```

### Step 2: Material Gallery Automatically Available

```typescript
import { getMaterialGallery } from "@/lib/galleries";

const newMaterialGallery = getMaterialGallery("new-material");
```

---

## Creating a Virtual Gallery Preset

### Step 1: Update gallery-presets.v1.json

```json
{
  "version": "1.0.0",
  "presets": [
    {
      "id": "custom-preset",
      "name": "Custom Gallery",
      "description": "Custom gallery description",
      "filter": {
        "service": "decks",
        "featured": true,
        "hasBefore": true,
        "hasAfter": true
      },
      "sort": "featuredWeight",
      "limit": 10
    }
  ]
}
```

### Step 2: Use Preset Gallery

```typescript
import { getPresetGallery } from "@/lib/galleries";

const customGallery = getPresetGallery("custom-preset");
```

---

## Testing

### Unit Tests

```typescript
// Example: Test project adapter
import { getProjectById } from "@/lib/projects";

test("getProjectById returns correct project", () => {
  const project = getProjectById("proj-001");
  expect(project).toBeDefined();
  expect(project?.id).toBe("proj-001");
});
```

### Integration Tests

```typescript
// Example: Test gallery engine
import { createGallery } from "@/lib/galleries";

test("createGallery filters by service", () => {
  const gallery = createGallery({ service: "decks" }, "test", "Test", "Test");
  expect(gallery.projects.every(p => p.service === "decks")).toBe(true);
});
```

---

## Deployment

### Build Process

```bash
# Build for production
npm run build

# Run locally
npm run dev
```

### Environment Variables

Required environment variables:
- `GOOGLE_DRIVE_CLIENT_ID` (for photo pipeline)
- `GOOGLE_DRIVE_CLIENT_SECRET` (for photo pipeline)
- `GOOGLE_REVIEWS_API_KEY` (for review sync)

---

## Troubleshooting

### Type Errors

If you get type errors after adding a new service:
1. Update `ProjectService` type in `src/types/projects.ts`
2. Update `ReviewService` type in `src/types/reviews.ts`
3. Update service count in `src/lib/projects.ts`

### Missing Media

If media doesn't appear:
1. Check `media.v1.json` for the media ID
2. Verify the media ID in `projects.v1.json` matches
3. Check that media variants are generated

### Gallery Not Updating

If galleries don't show new projects:
1. Verify project has correct service/location/tags
2. Check virtual gallery filter matches project metadata
3. Clear cache: `npm run build`

---

## Future Enhancements

- **Photo Pipeline**: Automated Google Drive photo sync
- **Project Form**: Admin form for creating projects without code
- **Review Sync**: Automated Google review import
- **AI Tagging**: AI-powered project tagging
- **Before/After Detection**: Automatic before/after pairing
