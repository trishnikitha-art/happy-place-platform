# Visual Slot Inventory

## Complete Visual Slot Authority Path Table

| Visual Slot ID | Page | Section | currentMediaId Source | Assignment Key (if any) | Writer | Reader | Public Consumer | Status |
| -------------- | ---- | ------- | --------------------- | ------------------------ | ------ | ------ | --------------- | ------ |
| `hero-background` | Homepage | Hero | `getHomepageHero()` → runtime assignment → static fallback | `brand-hero-background` | `/api/admin/brand/hero` | `getHomepageHero()` | `page.tsx` | ✅ FIXED |
| `homepage-owner-portrait-slot` | Homepage | The Family | `getOwnerPortrait()` → runtime assignment → static fallback | `brand-portrait-homepage` | `/api/admin/brand/portrait` | `getOwnerPortrait()` | `page.tsx` | ✅ FIXED |
| `homepage-newsletter-slot` | Homepage | Newsletter | `null` (hardcoded) | None | None | None | `page.tsx` | ⚠️ NOT ASSIGNABLE |
| `homepage-cta-slot` | Homepage | CTA | `null` (hardcoded) | None | None | None | `page.tsx` | ⚠️ NOT ASSIGNABLE |
| `about-owner-portrait-slot` | About | Hero | `getOwnerPortrait()` → runtime assignment → static fallback | `brand-portrait-about` | `/api/admin/brand/portrait` | `getOwnerPortrait()` | `about/page.tsx` | ✅ FIXED |
| `about-bottom-visual-slot` | About | Bottom Visual | `getServiceCardAssignment('about-bottom-visual')` | `about-bottom-visual` | Unknown (no API found) | `getServiceCardAssignment()` | `about/page.tsx` | ⚠️ NO WRITER |
| `service-card-{slug}` | Services/[slug] | ServiceCards | `getServiceCardAssignment(serviceSlug)` | `{serviceSlug}` | `/api/workbench/assign-media` | `getServiceCardAssignment()` | `service-card.tsx` | ✅ WORKING |
| `project-hero-{project.id}` | Projects/[slug] | Hero | `project.media.heroMedia` (project authority) | None (project authority) | None | `getProjectWithResolvedMedia()` | `project-spotlight.tsx` | ⚠️ PROJECT AUTHORITY |
| `project-gallery::{project.id}::{i}` | Projects/[slug] | Gallery | `project.media.galleryMedia[i]` (project authority) | None (project authority) | None | `getProjectWithResolvedMedia()` | `project-spotlight.tsx` | ⚠️ PROJECT AUTHORITY |
| `slider-right-{project.id}` | Homepage/Projects | Featured Transformations | `project.media.afterMedia` (project authority) | None (project authority) | None | `getProjectWithResolvedMedia()` | `before-after-slider.tsx` | ⚠️ PROJECT AUTHORITY |
| `slider-left-{project.id}` | Homepage/Projects | Featured Transformations | `project.media.beforeMedia` (project authority) | None (project authority) | None | `getProjectWithResolvedMedia()` | `before-after-slider.tsx` | ⚠️ PROJECT AUTHORITY |

## Key Findings

### ✅ Working Assignment Paths
1. **Brand media (hero, portrait)** - Fixed in this session
   - Writer: `/api/admin/brand/hero` and `/api/admin/brand/portrait`
   - Reader: `getHomepageHero()` and `getOwnerPortrait()` with runtime assignment check
   - Assignment keys: `brand-hero-background`, `brand-portrait-homepage`, `brand-portrait-about`

2. **Service cards** - Already working
   - Writer: `/api/workbench/assign-media`
   - Reader: `getServiceCardAssignment()` called by service detail pages
   - Assignment keys: `{serviceSlug}` (e.g., `fences`, `painting`)

### ⚠️ Issues Identified

1. **About bottom visual slot** - Has reader but no writer
   - Assignment key: `about-bottom-visual`
   - Reader: `about/page.tsx` calls `getServiceCardAssignment('about-bottom-visual')`
   - Writer: **NO API FOUND** - cannot be assigned through Workbench

2. **Homepage newsletter/CTA slots** - Not assignable
   - These are hardcoded to `null` in `page.tsx`
   - No assignment path exists

3. **Project media** - Uses project authority, not assignment store
   - Project hero, gallery, before/after all read from `projects.v1.json`
   - No runtime assignment mechanism for project media
   - Would require project authority updates, not assignment store

### 🔍 Assignment API Coverage

The `/api/workbench/assign-media` route only handles:
- Service card assignments (normalizes `service-card-{slug}` → `{slug}`)

The `/api/admin/brand/hero` and `/api/admin/brand/portrait` routes handle:
- Brand hero (maps `hero-background` → `brand-hero-background`)
- Brand portrait (maps `about-owner-portrait-slot` → `brand-portrait-about`, `homepage-owner-portrait-slot` → `brand-portrait-homepage`)

### 📝 Missing Writers

The following slots have readers but no dedicated writer APIs:
- `about-bottom-visual` (reader exists in `about/page.tsx`, no writer found)

The following slots are not assignable at all:
- `homepage-newsletter-slot` (hardcoded null)
- `homepage-cta-slot` (hardcoded null)
- All project media slots (use project authority instead)

## Next Steps

1. Determine if `about-bottom-visual` needs a writer API
2. Determine if newsletter/CTA slots should be assignable
3. Document that project media uses project authority, not assignment store
4. Test the actual write → read loop for the fixed brand media slots
