# Content Pipeline Operations Guide

**Goal:** A new employee should be able to publish a completed project without touching the repository.

**Status: DOCUMENTATION COMPLETE**

This guide provides comprehensive operational instructions for the content pipeline. Screenshots should be added during implementation to illustrate key steps.

---

## Architecture Overview

```
Google Drive
        │
        ▼
 Photo Pipeline
        │
        ▼
 Project Authority (projects.v1.json)
        │
 ┌──────┼────────┬────────┐
 ▼      ▼        ▼        ▼
Media  Reviews  Stories  Estimates
 │       │        │        │
 └────────────┬────────────┘
              ▼
      Website Presentation
```

**Key Principle:** The website never reads Google Drive, Google Reviews, or the estimate form directly. It only reads canonical data (projects.v1.json, manifest.v1.json, presentation.v1.json, reviews.v1.json).

---

## NEW FENCE PROJECT

### 1. Upload Images to Google Drive

Navigate to:
```
Google Drive
└── Projects/
    └── Fences/
        └── cedar-fence-001/
```

Upload photos:
- `before.jpg` (before state)
- `after.jpg` (completed state)
- `build01.jpg` (construction progress)
- `gate.jpg` (details)
- `materials.jpg` (materials used)

### 2. Run Photo Pipeline

```bash
cd website
npm run sync:drive
```

This command:
- Downloads images from Google Drive
- Generates WebP/AVIF variants
- Extracts EXIF metadata
- Creates blur placeholders
- Updates manifest.v1.json

### 3. AI Creates Project Entry

The pipeline automatically creates a project entry in `projects.v1.json`:

```json
{
  "id": "cedar-fence-001",
  "title": "Cedar Fence - Corvallis",
  "service": "fences",
  "location": {
    "city": "Corvallis",
    "county": "Benton"
  },
  "completionDate": "2026-07-18",
  "media": {
    "hero": "after.jpg",
    "before": "before.jpg",
    "after": "after.jpg",
    "gallery": ["build01.jpg", "gate.jpg", "materials.jpg"]
  },
  "story": {
    "challenge": "Old fence was rotting and needed replacement",
    "solution": "Installed new cedar fence with custom gate",
    "outcome": "Client now has a beautiful, durable backyard"
  },
  "tags": ["cedar", "fence", "custom-gate", "corvallis"],
  "reviews": ["review-001"]
}
```

### 4. Manifest Updates

`manifest.v1.json` is automatically updated with:
- New photo entries
- SHA-256 content hashes
- Generated variants
- Blur data URLs

### 5. Presentation Updates

`presentation.v1.json` is automatically updated with:
- Photo roles (hero, before, after, detail)
- Media type classification
- Featured flags
- Gallery ordering

### 6. Placeholder Removed

The fence service page automatically shows real photos instead of "Project photos coming soon" placeholder.

### 7. Homepage Updates

If the project has `heroEligible: true`, it may appear in:
- Homepage hero rotation
- Featured transformations section
- Outdoor inspiration section

### 8. Fence Gallery Updates

The fence gallery automatically includes the new project. No manual gallery management needed.

### 9. Project Page Appears

A new project page is automatically created at:
```
/projects/cedar-fence-001
```

With:
- Before/after comparison
- Project story
- Photo gallery
- Related reviews
- Service details

### 10. Related Projects Update

The project page automatically shows similar projects:
- Same service (fences)
- Same location (Corvallis)
- Same materials (cedar)

### 11. Review Attaches Automatically

If a review references this `projectId`, it automatically links to the project page.

---

## NEW KITCHEN REMODEL

### 1. Upload Images to Google Drive

```
Google Drive
└── Projects/
    └── Kitchens/
        └── kitchen-remodel-002/
```

Upload:
- `before.jpg` (old kitchen)
- `after.jpg` (new kitchen)
- `cabinet.jpg` (new cabinets)
- `countertop.jpg` (new countertops)
- `backsplash.jpg` (new backsplash)

### 2. Run Photo Pipeline

```bash
npm run sync:drive
```

### 3. AI Creates Project Entry

The pipeline automatically creates:
- Project ID: `kitchen-remodel-002`
- Service: `kitchens`
- Media classification
- Story generation (from folder name + AI analysis)

### 4. All Updates Apply Automatically

Same as fence project:
- Manifest updates
- Presentation updates
- Placeholder removed
- Homepage updates
- Kitchen gallery updates
- Project page appears
- Related projects update
- Review attaches

---

## ADDING A MANUAL REVIEW

### 1. Get Review Details

From client conversation:
- Name: "Sarah M."
- Rating: 5 stars
- Service: "fences"
- Project: "cedar-fence-001"
- Review text
- Location: "Corvallis, Benton"

### 2. Add to reviews.v1.json

```json
{
  "id": "review-001",
  "source": "manual",
  "featured": true,
  "verified": true,
  "reviewer": {
    "name": "Sarah M.",
    "initials": "SM"
  },
  "rating": 5,
  "date": "2026-07-18",
  "service": "fences",
  "projectId": "cedar-fence-001",
  "location": {
    "city": "Corvallis",
    "county": "Benton"
  },
  "title": "Beautiful cedar fence",
  "body": "Taylor and Lanie built us the most beautiful cedar fence...",
  "ownerResponse": {
    "author": "Taylor",
    "body": "Thank you, Sarah! We loved working on your fence project..."
  },
  "syncStatus": "manual",
  "highlight": true,
  "featuredWeight": 95,
  "heroEligible": true,
  "homepageEligible": true
}
```

### 3. Run Build

```bash
npm run build
```

### 4. Review Appears In:
- Reviews page
- Project page (if projectId matches)
- Homepage (if homepageEligible: true)
- Featured review section (if featured: true)

---

## GOOGLE REVIEW SYNC (Future)

### 1. Enable Google Integration

When Google credentials are configured:

```bash
npm run sync:google-reviews
```

### 2. Reviews Import Automatically

Google reviews are imported with:
- `googleReviewId` (Google's review ID)
- `syncStatus: "synced"`
- `importedAt` (timestamp)
- `lastSynced` (timestamp)
- `originalUrl` (Google review URL)

### 3. Manual + Google Reviews Become Identical

Both sources use the same canonical schema. The UI doesn't care where the review came from.

---

## EDITORIAL CONTROL

### Hero Eligible Reviews

Only reviews with `heroEligible: true` can become the giant hero review.

**Example:**
- A 5-star review with great photos and detailed story → `heroEligible: true`
- A simple "Great job!" review → `heroEligible: false`

### Featured Weight

Sort featured reviews by `featuredWeight` (0-100):
- 95-100: Top featured
- 80-94: High priority
- 60-79: Medium priority
- Below 60: Low priority

### Homepage Eligible

Only reviews with `homepageEligible: true` appear on the homepage.

### Highlight

Reviews with `highlight: true` get special treatment in the UI (larger cards, special styling).

---

## VIRTUAL GALLERIES

Galleries are metadata-based, not physical folders.

### By Service
```
Gallery: Service = Fence
→ Returns all projects with service: "fences"
```

### By Location
```
Gallery: City = Albany
→ Returns all projects with location.city: "Albany"
```

### By Material
```
Gallery: Material = Cedar
→ Returns all projects with tags containing "cedar"
```

**Same photos. Different gallery. No duplicate folders.**

---

## TROUBLESHOOTING

### Photos Not Appearing

1. Check Google Drive folder structure
2. Run `npm run sync:drive`
3. Check manifest.v1.json for photo entries
4. Check presentation.v1.json for photo roles

### Review Not Linking to Project

1. Verify `projectId` matches a project in projects.v1.json
2. Check project has media entries
3. Run `npm run build`

### Gallery Not Updating

1. Verify project has correct service/location/tags
2. Check virtual gallery query
3. Clear cache: `npm run build`

---

## BEST PRACTICES

### Folder Naming

Use consistent naming:
```
Projects/
└── {Service}/
    └── {location}-{material}-{year}/
```

Examples:
- `Fences/corvallis-cedar-2026/`
- `Kitchens/albany-quartz-2026/`
- `Decks/philomath-composite-2026/`

### Photo Naming

Use descriptive names:
- `before.jpg` (before state)
- `after.jpg` (after state)
- `detail-{feature}.jpg` (specific details)
- `progress-{step}.jpg` (construction progress)

### Review Management

- Add reviews as soon as received
- Set `heroEligible: true` only for exceptional reviews
- Use `featuredWeight` to prioritize important reviews
- Always respond to reviews with `ownerResponse`

---

## LONG-TERM VISION

The platform naturally becomes:

```
Google Drive
        │
        ▼
 Photo Pipeline
        │
        ▼
 Project Authority
        │
 ┌──────┼────────┬────────┐
 ▼      ▼        ▼        ▼
Media  Reviews  Stories  Estimates
 │       │        │        │
 └────────────┬────────────┘
              ▼
      Website Presentation
```

**Benefits:**
- Easy to test (canonical data only)
- Cacheable (no external dependencies)
- Future-proof (any integration updates canonical data)
- Employee-friendly (no code changes needed)
