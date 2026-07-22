# Authority Uniqueness Audit

**Date:** 2026-07-22  
**Scope:** Evidence-driven canonicality test for all domain authorities

---

## Phase 1 — Inventory (No Judgments)

### Projects Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/projects.v1.json` | Authority | JSON manifest with 4 projects, full schema |
| `lib/projects.ts` | Adapter | Loads projects.v1.json, provides query functions |
| `config/projects.ts` | Legacy Candidate | Hardcoded TypeScript array with 2 projects |
| `types/projects.ts` | Type Definitions | TypeScript interfaces |

### Media Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/media.v1.json` | Authority | JSON manifest with 6 media entries |
| `lib/media.ts` | Adapter | Loads media.v1.json, provides intent-based lookups |
| `types/media.ts` | Type Definitions | TypeScript interfaces |

### Services Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/services.v1.json` | Authority | JSON manifest with 14 services |
| `lib/registries.ts` | Adapter | Loads services.v1.json, provides query functions |
| `config/services.ts` | Legacy Candidate | Hardcoded TypeScript array with 8 services |
| `types/registries.ts` | Type Definitions | TypeScript interfaces |

### Reviews Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/reviews.v1.json` | Authority | JSON manifest with review schema |
| `lib/reviews.ts` | Adapter | Loads reviews.v1.json, provides query functions |
| `config/reviews.ts` | Legacy Candidate | Empty array, marked as placeholder |
| `types/reviews.ts` | Type Definitions | TypeScript interfaces |

### Brand Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/brand.v1.json` | Authority | JSON manifest with brand assets |
| `lib/brand.ts` | Adapter | Loads brand.v1.json, provides intent-based lookups |
| `types/brand.ts` | Type Definitions | TypeScript interfaces |

### Cities Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/cities.v1.json` | Authority | JSON manifest with city data |
| `lib/registries.ts` | Adapter | Loads cities.v1.json, provides query functions |

### Materials Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/materials.v1.json` | Authority | JSON manifest with material data |
| `lib/registries.ts` | Adapter | Loads materials.v1.json, provides query functions |

### Gallery Presets Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/gallery-presets.v1.json` | Authority | JSON manifest with gallery presets |
| `lib/registries.ts` | Adapter | Loads gallery-presets.v1.json, provides query functions |

---

## Phase 2 — Usage Graph

### Projects Authority Usage

```
projects.v1.json
    ↓
lib/projects.ts (adapter)
    ↓
app/page.tsx (homepage) - getFeaturedProjects()
app/our-work/page.tsx - getAllProjects(), getFeaturedProjects()
app/projects/[slug]/page.tsx - NOT USED (bypasses adapter)
```

**Projects Legacy Usage:**
```
config/projects.ts
    ↓
app/projects/[slug]/page.tsx - getProjects(), getProject() (direct import)
```

### Media Authority Usage
```
media.v1.json
    ↓
lib/media.ts (adapter)
    ↓
app/page.tsx - getMediaById(), getProjectBeforeAfter()
components/service-card.tsx - getFeaturedServiceMedia()
app/our-work/page.tsx - getMediaById()
lib/projects.ts - getMediaById() (for project media lookups)
lib/brand.ts - getMediaById() (for brand media lookups)
```

### Services Authority Usage

```
services.v1.json
    ↓
lib/registries.ts (adapter)
    ↓
app/page.tsx - getAllServices()
app/services/page.tsx - getAllServices()
components/service-card.tsx - uses Service type from adapter
lib/media.ts - getProjectsByServiceSlug() (for service media lookups)
lib/validation-engine.ts - validateServicesAuthority()
```

**Services Legacy Usage:**
```
config/services.ts
    ↓
components/estimate-wizard.tsx - services (direct import)
```

### Reviews Authority Usage
```
reviews.v1.json
    ↓
lib/reviews.ts (adapter)
    ↓
app/page.tsx - getFeaturedReviews(), getReviewStats()
app/reviews/page.tsx - getReviewStats()
```

**Reviews Legacy Usage:**
```
config/reviews.ts
    ↓
UNUSED (empty array, no imports found)
```

### Brand Authority Usage
```
brand.v1.json
    ↓
lib/brand.ts (adapter)
    ↓
app/page.tsx - getHomepageHero(), getOwnerPortrait()
app/about/page.tsx - getHomepageHero(), getOwnerPortrait()
```

### Cities Authority Usage
```
cities.v1.json
    ↓
lib/registries.ts (adapter)
    ↓
No direct page usage found (used by estimate wizard via config/counties.ts)
```

### Materials Authority Usage
```
materials.v1.json
    ↓
lib/registries.ts (adapter)
    ↓
No direct page usage found
```

### Gallery Presets Authority Usage
```
gallery-presets.v1.json
    ↓
lib/registries.ts (adapter)
    ↓
No direct page usage found
```

---

## Phase 3 — Canonicality Test

### Projects Domain
**Question:** Is this the single source of truth?

**projects.v1.json:**
- ✅ Single source of truth FOR: homepage, our-work page
- ❌ NOT single source for: projects/[slug] page
- ✅ No duplication in JSON authorities
- ❌ Can be overridden by: config/projects.ts (on one page)
- ✅ Editing this file changes: homepage, our-work behavior
- ❌ Code path bypasses: projects/[slug]/page.tsx imports config/projects.ts directly

**Result:** **DUPLICATE AUTHORITY** - Both projects.v1.json and config/projects.ts are active

**config/projects.ts:**
- ❌ NOT single source of truth (only used on one page)
- ✅ Duplicates: projects.v1.json
- ✅ Can override: projects.v1.json on projects/[slug] page
- ✅ Editing this file changes: projects/[slug] page behavior
- ❌ Code path bypasses: lib/projects.ts adapter

**Result:** **DUPLICATE AUTHORITY** - Legacy authority still in use

### Services Domain
**Question:** Is this the single source of truth?

**services.v1.json:**
- ✅ Single source of truth FOR: homepage, services page, service cards
- ❌ NOT single source for: estimate wizard
- ✅ No duplication in JSON authorities
- ❌ Can be overridden by: config/services.ts (in estimate wizard)
- ✅ Editing this file changes: homepage, services page behavior
- ❌ Code path bypasses: estimate-wizard.tsx imports config/services.ts directly

**Result:** **DUPLICATE AUTHORITY** - Both services.v1.json and config/services.ts are active

**config/services.ts:**
- ❌ NOT single source of truth (only used in estimate wizard)
- ✅ Duplicates: services.v1.json
- ✅ Can override: services.v1.json in estimate wizard
- ✅ Editing this file changes: estimate wizard behavior
- ❌ Code path bypasses: lib/registries.ts adapter

**Result:** **DUPLICATE AUTHORITY** - Legacy authority still in use

### Reviews Domain
**Question:** Is this the single source of truth?

**reviews.v1.json:**
- ✅ Single source of truth FOR: homepage, reviews page
- ✅ No duplication in JSON authorities
- ✅ Cannot be overridden
- ✅ Editing this file changes: homepage, reviews page behavior
- ✅ No code path bypasses

**Result:** **CANONICAL AUTHORITY**

**config/reviews.ts:**
- ❌ NOT single source of truth (unused)
- ❌ Does not duplicate (empty array)
- ❌ Cannot override
- ❌ Editing this file changes: nothing
- ❌ No code path uses it

**Result:** **UNUSED LEGACY**

### Brand Domain
**Question:** Is this the single source of truth?

**brand.v1.json:**
- ✅ Single source of truth FOR: homepage, about page
- ✅ No duplication in JSON authorities
- ✅ Cannot be overridden
- ✅ Editing this file changes: homepage, about page behavior
- ✅ No code path bypasses

**Result:** **CANONICAL AUTHORITY**

### Media Domain
**Question:** Is this the single source of truth?

**media.v1.json:**
- ✅ Single source of truth FOR: all media lookups
- ✅ No duplication in JSON authorities
- ✅ Cannot be overridden
- ✅ Editing this file changes: all media behavior
- ✅ No code path bypasses

**Result:** **CANONICAL AUTHORITY**

### Cities Domain
**Question:** Is this the single source of truth?

**cities.v1.json:**
- ✅ Single source of truth FOR: city data
- ✅ No duplication in JSON authorities
- ✅ Cannot be overridden
- ✅ Editing this file changes: city data behavior
- ⚠️ Limited usage (not directly used by pages)

**Result:** **CANONICAL AUTHORITY** (but underutilized)

### Materials Domain
**Question:** Is this the single source of truth?

**materials.v1.json:**
- ✅ Single source of truth FOR: material data
- ✅ No duplication in JSON authorities
- ✅ Cannot be overridden
- ✅ Editing this file changes: material data behavior
- ⚠️ Limited usage (not directly used by pages)

**Result:** **CANONICAL AUTHORITY** (but underutilized)

### Gallery Presets Domain
**Question:** Is this the single source of truth?

**gallery-presets.v1.json:**
- ✅ Single source of truth FOR: gallery presets
- ✅ No duplication in JSON authorities
- ✅ Cannot be overridden
- ✅ Editing this file changes: gallery preset behavior
- ⚠️ Limited usage (not directly used by pages)

**Result:** **CANONICAL AUTHORITY** (but underutilized)

---

## Phase 4 — Authority Bypass Audit

### Direct Config Imports Found

**@/config/projects:**
- `app/projects/[slug]/page.tsx:6` - `import { getProjects, getProject } from "@/config/projects"`
  - **Reason:** Legacy project detail page
  - **Bypasses adapter:** YES - bypasses lib/projects.ts
  - **Status:** ARCHITECTURAL VIOLATION

**@/config/services:**
- `components/estimate-wizard.tsx:7` - `import { services } from "@/config/services"`
  - **Reason:** Estimate wizard needs service questions
  - **Bypasses adapter:** YES - bypasses lib/registries.ts
  - **Status:** ARCHITECTURAL VIOLATION

**@/config/reviews:**
- No imports found (unused)

**@/config/brand:**
- No direct imports found (uses adapter)

**@/config/cities:**
- No direct imports found (uses adapter via config/counties.ts)

**@/config/materials:**
- No direct imports found (uses adapter)

### Summary of Bypasses
- **Total bypasses found:** 2
- **Architectural violations:** 2
- **Pages affected:** 1 (projects/[slug])
- **Components affected:** 1 (estimate-wizard)

---

## Phase 5 — Adapter Integrity

### media.ts Adapter
- ✅ Exactly one backing authority: media.v1.json
- ✅ No fallback authority
- ✅ No embedded domain data
- ✅ No hardcoded defaults masquerading as authority
- **Status:** CLEAN

### projects.ts Adapter
- ✅ Exactly one backing authority: projects.v1.json
- ✅ No fallback authority
- ✅ No embedded domain data
- ✅ No hardcoded defaults masquerading as authority
- **Status:** CLEAN

### brand.ts Adapter
- ✅ Exactly one backing authority: brand.v1.json
- ✅ No fallback authority
- ✅ No embedded domain data
- ✅ No hardcoded defaults masquerading as authority
- **Status:** CLEAN

### reviews.ts Adapter
- ✅ Exactly one backing authority: reviews.v1.json
- ✅ No fallback authority
- ✅ No embedded domain data
- ✅ No hardcoded defaults masquerading as authority
- **Status:** CLEAN

### registries.ts Adapter
- ✅ Exactly one backing authority per domain: services.v1.json, cities.v1.json, materials.v1.json, gallery-presets.v1.json
- ✅ No fallback authority
- ✅ No embedded domain data
- ✅ No hardcoded defaults masquerading as authority
- **Status:** CLEAN

---

## Phase 6 — Final Authority Matrix

| Domain | Canonical Authority | Duplicate? | Direct UI Access? | Status |
|--------|-------------------|------------|-------------------|---------|
| Projects | projects.v1.json | YES (config/projects.ts) | YES (projects/[slug]) | **DUPLICATE ACTIVE** |
| Media | media.v1.json | NO | NO | **CANONICAL** |
| Brand | brand.v1.json | NO | NO | **CANONICAL** |
| Services | services.v1.json | YES (config/services.ts) | YES (estimate wizard) | **DUPLICATE ACTIVE** |
| Reviews | reviews.v1.json | NO (config/reviews.ts unused) | NO | **CANONICAL** |
| Cities | cities.v1.json | NO | NO | **CANONICAL (underutilized)** |
| Materials | materials.v1.json | NO | NO | **CANONICAL (underutilized)** |
| Gallery Presets | gallery-presets.v1.json | NO | NO | **CANONICAL (underutilized)** |

---

## Core Question Answered

**"Which project authority is the real one today, and are there any others?"**

**Answer:** Both projects.v1.json and config/projects.ts are active authorities.

**Evidence:**
- projects.v1.json is used by: homepage, our-work page (via lib/projects.ts adapter)
- config/projects.ts is used by: projects/[slug] page (direct import, bypasses adapter)
- This is an **ARCHITECTURAL VIOLATION** - two authorities for the same domain

**State:** Both are active (architectural violation)

---

## Additional Findings

### Services Domain
**Answer:** Both services.v1.json and config/services.ts are active authorities.

**Evidence:**
- services.v1.json is used by: homepage, services page, service cards (via lib/registries.ts adapter)
- config/services.ts is used by: estimate wizard (direct import, bypasses adapter)
- This is an **ARCHITECTURAL VIOLATION** - two authorities for the same domain

**State:** Both are active (architectural violation)

### Reviews Domain
**Answer:** reviews.v1.json is the canonical authority.

**Evidence:**
- reviews.v1.json is used by: homepage, reviews page (via lib/reviews.ts adapter)
- config/reviews.ts is unused (empty array)
- No architectural violation

**State:** Canonical authority with unused legacy

### Other Domains
**Media, Brand, Cities, Materials, Gallery Presets:** All have canonical authorities with no duplicates or bypasses.

---

## Recommendations

### Immediate Actions Required

1. **Migrate projects/[slug] page to use Projects Authority**
   - Change `app/projects/[slug]/page.tsx` to import from `lib/projects.ts` instead of `config/projects.ts`
   - Use `getProjectById()` instead of `getProject()`
   - This will eliminate the duplicate project authority

2. **Migrate estimate wizard to use Services Authority**
   - Change `components/estimate-wizard.tsx` to import from `lib/registries.ts` instead of `config/services.ts`
   - Use `getAllServices()` or `getServiceBySlug()` instead of `services` array
   - This will eliminate the duplicate service authority

3. **Remove unused legacy files**
   - Delete `config/reviews.ts` (unused)
   - After migration, delete `config/projects.ts`
   - After migration, delete `config/services.ts`

### Medium-Term Actions

1. **Utilize underutilized authorities**
   - Integrate cities.v1.json into estimate wizard
   - Integrate materials.v1.json into estimate wizard
   - Integrate gallery-presets.v1.json into gallery page

2. **Add validation for architectural violations**
   - Extend validation engine to detect direct config imports
   - Emit findings for bypassing adapters
   - Prevent future architectural violations

---

## Conclusion

**The repository has TWO architectural violations:**

1. **Projects Domain:** Both projects.v1.json and config/projects.ts are active authorities
2. **Services Domain:** Both services.v1.json and config/services.ts are active authorities

**All other domains (Media, Brand, Reviews, Cities, Materials, Gallery Presets) have canonical authorities with no violations.**

**The audit was evidence-driven** - canonicality was determined from actual imports and call graphs, not from architectural intent.
