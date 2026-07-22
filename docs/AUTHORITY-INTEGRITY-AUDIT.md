# Constitutional Authority Integrity Audit

**Date:** 2026-07-22  
**Scope:** Evidence-driven analysis of whether the repository mechanically enforces authority integrity invariants

---

## Constitutional Model

The architecture claims:

```
UI
↓
Adapter
↓
Authority
```

**Invariants:**
- Every domain must have exactly ONE authority
- No UI may bypass adapters
- No adapter may contain authority
- No second authority may exist

**Purpose:** Determine whether these invariants are mechanically enforceable or merely socially enforced.

---

## Phase 1 — Domain Classification

### Projects Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/projects.v1.json` | Authority | JSON manifest with 4 projects |
| `lib/projects.ts` | Adapter | Loads projects.v1.json, provides query functions |
| `config/projects.ts` | Legacy Authority | Hardcoded TypeScript array with 2 projects |
| `types/projects.ts` | Type Definitions | TypeScript interfaces |

### Services Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/services.v1.json` | Authority | JSON manifest with 14 services |
| `lib/registries.ts` | Adapter | Loads services.v1.json, provides query functions |
| `config/services.ts` | Legacy Authority | Hardcoded TypeScript array with 8 services |
| `types/registries.ts` | Type Definitions | TypeScript interfaces |

### Media Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/media.v1.json` | Authority | JSON manifest with 6 media entries |
| `lib/media.ts` | Adapter | Loads media.v1.json, provides intent-based lookups |
| `types/media.ts` | Type Definitions | TypeScript interfaces |

### Brand Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/brand.v1.json` | Authority | JSON manifest with brand assets |
| `lib/brand.ts` | Adapter | Loads brand.v1.json, provides intent-based lookups |
| `types/brand.ts` | Type Definitions | TypeScript interfaces |

### Reviews Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/reviews.v1.json` | Authority | JSON manifest with review schema |
| `lib/reviews.ts` | Adapter | Loads reviews.v1.json, provides query functions |
| `config/reviews.ts` | Unused Legacy | Empty array, no imports |
| `types/reviews.ts` | Type Definitions | TypeScript interfaces |

### Cities Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/cities.v1.json` | Authority | JSON manifest with city data |
| `lib/registries.ts` | Adapter | Loads cities.v1.json, provides query functions |
| `config/counties.ts` | Shadow Authority | Hardcoded TypeScript array with 4 counties |

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

### Company Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/company.ts` | Authority | Hardcoded TypeScript object with company data |
| `types/` | Type Definitions | TypeScript interfaces |

### Navigation Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/navigation.ts` | Authority | Hardcoded TypeScript array with navigation items |

### FAQ Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/faq.ts` | Authority | Hardcoded TypeScript array with FAQ items |

### Feature Flags Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/featureFlags.ts` | Authority | Hardcoded TypeScript object with feature flags |

### SEO Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/seo.ts` | Authority | Hardcoded TypeScript object with SEO defaults |

### Before/After Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/beforeAfter.ts` | Unused Legacy | Empty array, no imports |

### Transformations Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/transformations.ts` | Shadow Authority | Hardcoded TypeScript array with transformation stories |

### Service Categories Domain
| File | Classification | Evidence |
|------|---------------|----------|
| `config/serviceCategories.ts` | Shadow Authority | Hardcoded TypeScript array with service categories |

---

## Phase 2 — Authority Mutability Analysis

### Projects Authority
**Files capable of changing runtime behavior:** 2

1. `config/projects.v1.json` - Canonical authority
2. `config/projects.ts` - Legacy authority (active on projects/[slug] page)

**Why:** Duplicate authority exists. Both files can independently change project data presented to users.

### Services Authority
**Files capable of changing runtime behavior:** 2

1. `config/services.v1.json` - Canonical authority
2. `config/services.ts` - Legacy authority (active in estimate wizard)

**Why:** Duplicate authority exists. Both files can independently change service data presented to users.

### Media Authority
**Files capable of changing runtime behavior:** 1

1. `config/media.v1.json` - Canonical authority

**Why:** Single authority. No duplicates.

### Brand Authority
**Files capable of changing runtime behavior:** 1

1. `config/brand.v1.json` - Canonical authority

**Why:** Single authority. No duplicates.

### Reviews Authority
**Files capable of changing runtime behavior:** 1

1. `config/reviews.v1.json` - Canonical authority

**Why:** Single authority. Legacy config/reviews.ts is unused.

### Cities Authority
**Files capable of changing runtime behavior:** 1

1. `config/cities.v1.json` - Canonical authority

**Why:** Single authority. config/counties.ts is a shadow authority for a different domain (counties vs cities).

### Materials Authority
**Files capable of changing runtime behavior:** 1

1. `config/materials.v1.json` - Canonical authority

**Why:** Single authority. No duplicates.

### Gallery Presets Authority
**Files capable of changing runtime behavior:** 1

1. `config/gallery-presets.v1.json` - Canonical authority

**Why:** Single authority. No duplicates.

### Company Authority
**Files capable of changing runtime behavior:** 1

1. `config/company.ts` - Authority

**Why:** Single authority. No duplicates.

### Navigation Authority
**Files capable of changing runtime behavior:** 1

1. `config/navigation.ts` - Authority

**Why:** Single authority. No duplicates.

### FAQ Authority
**Files capable of changing runtime behavior:** 1

1. `config/faq.ts` - Authority

**Why:** Single authority. No duplicates.

### Feature Flags Authority
**Files capable of changing runtime behavior:** 1

1. `config/featureFlags.ts` - Authority

**Why:** Single authority. No duplicates.

### SEO Authority
**Files capable of changing runtime behavior:** 1

1. `config/seo.ts` - Authority

**Why:** Single authority. No duplicates.

---

## Phase 3 — Adapter Integrity Audit

### media.ts Adapter
- ✅ Loads exactly one authority: media.v1.json
- ✅ No fallback authority
- ✅ No embedded defaults
- ✅ Does not construct domain objects (returns from authority)
- ✅ Does not silently repair bad data
- ✅ Does not merge multiple authorities
- ✅ Does not normalize authority (passes through)
- ✅ No business logic that should belong elsewhere

**Status:** CLEAN

### projects.ts Adapter
- ✅ Loads exactly one authority: projects.v1.json
- ✅ No fallback authority
- ✅ No embedded defaults
- ✅ Does not construct domain objects (returns from authority)
- ✅ Does not silently repair bad data
- ✅ Does not merge multiple authorities
- ✅ Does not normalize authority (passes through)
- ✅ No business logic that should belong elsewhere

**Status:** CLEAN

### brand.ts Adapter
- ✅ Loads exactly one authority: brand.v1.json
- ✅ No fallback authority
- ✅ No embedded defaults
- ✅ Does not construct domain objects (returns from authority)
- ✅ Does not silently repair bad data
- ✅ Does not merge multiple authorities
- ✅ Does not normalize authority (passes through)
- ✅ No business logic that should belong elsewhere

**Status:** CLEAN

### reviews.ts Adapter
- ✅ Loads exactly one authority: reviews.v1.json
- ✅ No fallback authority
- ✅ No embedded defaults
- ✅ Does not construct domain objects (returns from authority)
- ✅ Does not silently repair bad data
- ✅ Does not merge multiple authorities
- ✅ Does not normalize authority (passes through)
- ✅ No business logic that should belong elsewhere

**Status:** CLEAN

### registries.ts Adapter
- ✅ Loads exactly one authority per domain: services.v1.json, cities.v1.json, materials.v1.json, gallery-presets.v1.json
- ✅ No fallback authority
- ✅ No embedded defaults
- ✅ Does not construct domain objects (returns from authority)
- ✅ Does not silently repair bad data
- ✅ Does not merge multiple authorities
- ✅ Does not normalize authority (passes through)
- ✅ No business logic that should belong elsewhere

**Status:** CLEAN

---

## Phase 4 — Authority Escape Analysis

### Direct Config Imports (Authority Escape)

**@/config/projects:**
- `app/projects/[slug]/page.tsx:6` - `import { getProjects, getProject } from "@/config/projects"`
  - **Classification:** Legacy Authority
  - **Bypasses adapter:** YES
  - **Status:** CONSTITUTIONAL VIOLATION

**@/config/services:**
- `components/estimate-wizard.tsx:7` - `import { services } from "@/config/services"`
  - **Classification:** Legacy Authority
  - **Bypasses adapter:** YES
  - **Status:** CONSTITUTIONAL VIOLATION

**@/config/company:**
- `app/page.tsx:12` - `import { company } from "@/config/company"`
  - **Classification:** Constitutional (no adapter exists)
  - **Bypasses adapter:** N/A
  - **Status:** CONSTITUTIONAL

**@/config/counties:**
- `components/estimate-wizard.tsx:8` - `import { counties } from "@/config/counties"`
  - **Classification:** Shadow Authority
  - **Bypasses adapter:** YES (cities.v1.json exists but not used)
  - **Status:** CONSTITUTIONAL VIOLATION

**@/config/navigation:**
- `components/layout.tsx` - `import { navigation } from "@/config/navigation"`
  - **Classification:** Constitutional (no adapter exists)
  - **Bypasses adapter:** N/A
  - **Status:** CONSTITUTIONAL

**@/config/faq:**
- `app/faq/page.tsx` - `import { faqItems } from "@/config/faq"`
  - **Classification:** Constitutional (no adapter exists)
  - **Bypasses adapter:** N/A
  - **Status:** CONSTITUTIONAL

**@/config/featureFlags:**
- Multiple components - `import { features } from "@/config/featureFlags"`
  - **Classification:** Constitutional (no adapter exists)
  - **Bypasses adapter:** N/A
  - **Status:** CONSTITUTIONAL

**@/config/seo:**
- `app/layout.tsx` - `import { seo } from "@/config/seo"`
  - **Classification:** Constitutional (no adapter exists)
  - **Bypasses adapter:** N/A
  - **Status:** CONSTITUTIONAL

**@/config/transformations:**
- `app/page.tsx` - `import { Transformation } from "@/config/transformations"`
  - **Classification:** Shadow Authority
  - **Bypasses adapter:** YES (should use media authority)
  - **Status:** CONSTITUTIONAL VIOLATION

**@/config/serviceCategories:**
- No direct imports found (unused)

### Embedded Domain Data

**Hardcoded Arrays:**
- `config/projects.ts` - Hardcoded project array
- `config/services.ts` - Hardcoded service array
- `config/counties.ts` - Hardcoded county array
- `config/transformations.ts` - Hardcoded transformation array
- `config/serviceCategories.ts` - Hardcoded service category array
- `config/navigation.ts` - Hardcoded navigation array
- `config/faq.ts` - Hardcoded FAQ array
- `config/company.ts` - Hardcoded company object
- `config/featureFlags.ts` - Hardcoded feature flags object
- `config/seo.ts` - Hardcoded SEO object

**Classification:**
- Projects, Services: Legacy Authorities (constitutional violations)
- Counties, Transformations: Shadow Authorities (constitutional violations)
- Navigation, FAQ, Company, Feature Flags, SEO: Constitutional (no adapter exists)

---

## Phase 5 — Invariant Enforcement Audit

### Multiple Authorities
**Prevention:** NONE

**Failure Mode:** No mechanism prevents creating a second authority file. A developer can create `config/projects2.json` and import it anywhere. No build-time or runtime check detects this.

**Evidence:** Duplicate authorities already exist (projects.ts vs projects.v1.json, services.ts vs services.v1.json) without detection.

### Adapter Bypass
**Prevention:** NONE

**Failure Mode:** No mechanism prevents direct imports of config files. TypeScript allows any import. No lint rule prevents `@/config/...` imports. No build-time check detects adapter bypass.

**Evidence:** Adapter bypasses already exist (projects/[slug] imports config/projects.ts, estimate-wizard imports config/services.ts) without detection.

### Authority Duplication
**Prevention:** NONE

**Failure Mode:** No mechanism prevents duplicating authority data across files. A developer can copy data from projects.v1.json to projects.ts. No validation detects this duplication.

**Evidence:** Data duplication already exists (projects.ts duplicates data from projects.v1.json) without detection.

### Authority Drift
**Prevention:** NONE

**Failure Mode:** No mechanism prevents authorities from drifting apart. A developer can update projects.v1.json without updating projects.ts. No validation detects drift.

**Evidence:** Authorities have already drifted (projects.v1.json has 4 projects, projects.ts has 2 projects) without detection.

### Shadow Registries
**Prevention:** NONE

**Failure Mode:** No mechanism prevents creating shadow registries. A developer can create config/counties.ts alongside cities.v1.json. No validation detects shadow registries.

**Evidence:** Shadow registries already exist (counties.ts, transformations.ts, serviceCategories.ts) without detection.

### Manual Caches
**Prevention:** PARTIAL

**Failure Mode:** Adapters use manual caching (let cache = null). No mechanism prevents cache invalidation issues. No validation detects stale cache.

**Evidence:** All adapters use manual caching without cache invalidation strategy.

### Embedded Domain Data
**Prevention:** NONE

**Failure Mode:** No mechanism prevents embedding domain data in components. A developer can hardcode service lists in components. No validation detects embedded domain data.

**Evidence:** Embedded domain data exists in multiple config files without detection.

---

## Phase 6 — Validation Coverage Audit

### Validation Engine (validation-engine.ts)

**Checks:**
- ✅ Schema validity (required fields, types)
- ✅ Referential integrity (media IDs, project IDs)
- ✅ Broken links (missing media references)
- ✅ Missing media (orphaned media)
- ✅ Missing IDs
- ✅ Duplicate IDs (media, projects)
- ❌ Adapter correctness (NOT CHECKED)
- ❌ Authority uniqueness (NOT CHECKED)
- ❌ Adapter bypass (NOT CHECKED)
- ❌ Shadow authorities (NOT CHECKED)
- ❌ Legacy authorities (NOT CHECKED)
- ❌ Embedded domain data (NOT CHECKED)

**Missing Constitutional Invariants:**
1. Authority uniqueness - No validation checks for duplicate authority files
2. Adapter bypass - No validation checks for direct config imports
3. Shadow authorities - No validation checks for shadow registries
4. Legacy authorities - No validation checks for legacy config files
5. Embedded domain data - No validation checks for hardcoded domain data

### Other Validators

**No other constitutional validators found.**

---

## Phase 7 — Compiler Trust Audit

### projects.v1.json Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** NO

**What updates:**
- Homepage (uses lib/projects.ts → projects.v1.json) ✅
- Our Work page (uses lib/projects.ts → projects.v1.json) ✅

**What does not:**
- projects/[slug] page (uses config/projects.ts directly) ❌

**What bypasses:**
- projects/[slug] page bypasses the adapter and uses legacy authority

**Conclusion:** Cannot prove all pages render the edit.

### services.v1.json Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** NO

**What updates:**
- Homepage (uses lib/registries.ts → services.v1.json) ✅
- Services page (uses lib/registries.ts → services.v1.json) ✅
- Service cards (uses lib/registries.ts → services.v1.json) ✅

**What does not:**
- Estimate wizard (uses config/services.ts directly) ❌

**What bypasses:**
- Estimate wizard bypasses the adapter and uses legacy authority

**Conclusion:** Cannot prove all pages render the edit.

### brand.v1.json Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** YES

**What updates:**
- Homepage (uses lib/brand.ts → brand.v1.json) ✅
- About page (uses lib/brand.ts → brand.v1.json) ✅

**What does not:** None

**What bypasses:** None

**Conclusion:** Can prove all pages render the edit.

### media.v1.json Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** YES

**What updates:**
- Homepage (uses lib/media.ts → media.v1.json) ✅
- Our Work page (uses lib/media.ts → media.v1.json) ✅
- Service cards (uses lib/media.ts → media.v1.json) ✅
- All components using media (use lib/media.ts → media.v1.json) ✅

**What does not:** None

**What bypasses:** None

**Conclusion:** Can prove all pages render the edit.

### reviews.v1.json Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** YES

**What updates:**
- Homepage (uses lib/reviews.ts → reviews.v1.json) ✅
- Reviews page (uses lib/reviews.ts → reviews.v1.json) ✅

**What does not:** None

**What bypasses:** None

**Conclusion:** Can prove all pages render the edit.

### cities.v1.json Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** NO

**What updates:**
- No pages directly use cities.v1.json

**What does not:**
- Estimate wizard (uses config/counties.ts directly) ❌

**What bypasses:**
- Estimate wizard bypasses the cities authority and uses shadow authority

**Conclusion:** Cannot prove any pages render the edit (underutilized authority).

### materials.v1.json Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** NO

**What updates:**
- No pages directly use materials.v1.json

**What does not:** All pages

**What bypasses:** None (underutilized authority)

**Conclusion:** Cannot prove any pages render the edit (underutilized authority).

### gallery-presets.v1.json Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** NO

**What updates:**
- No pages directly use gallery-presets.v1.json

**What does not:** All pages

**What bypasses:** None (underutilized authority)

**Conclusion:** Cannot prove any pages render the edit (underutilized authority).

### company.ts Edit

**Question:** Can they prove every page now renders that edit?

**Answer:** YES

**What updates:**
- All pages using company data (direct import) ✅

**What does not:** None

**What bypasses:** None (no adapter exists)

**Conclusion:** Can prove all pages render the edit.

---

## Phase 8 — Architectural Failure Analysis

### Pattern: Legacy Authority

**Definition:** Old hardcoded config files that duplicate JSON authority data.

**Files:**
- config/projects.ts
- config/services.ts
- config/reviews.ts (unused)

**Severity:** CRITICAL

**Root Cause:** Migration from hardcoded config to JSON authorities was incomplete. Legacy files were not removed after migration.

**Potential Runtime Effect:** Data inconsistency between authorities. Different pages show different data. Edits to canonical authority don't propagate to all pages.

### Pattern: Shadow Authority

**Definition:** Hardcoded config files that duplicate or shadow JSON authority data for related domains.

**Files:**
- config/counties.ts (shadows cities.v1.json)
- config/transformations.ts (shadows media.v1.json)
- config/serviceCategories.ts (shadows services.v1.json)

**Severity:** HIGH

**Root Cause:** Domain boundaries unclear. Related domains (counties/cities, transformations/media, categories/services) created separate authorities instead of unified approach.

**Potential Runtime Effect:** Data inconsistency. Duplicate maintenance burden. Confusion about which source is canonical.

### Pattern: Authority Bypass

**Definition:** Direct imports of config files that bypass adapter layer.

**Files:**
- app/projects/[slug]/page.tsx (imports config/projects.ts)
- components/estimate-wizard.tsx (imports config/services.ts, config/counties.ts)
- app/page.tsx (imports config/transformations.ts)

**Severity:** CRITICAL

**Root Cause:** No mechanism prevents direct imports. Developers can bypass adapters without detection. Migration incomplete.

**Potential Runtime Effect:** Breaks adapter abstraction. Future adapter changes won't affect bypassing code. Validation engine can't detect usage.

### Pattern: Adapter Leakage

**Definition:** Adapters that contain business logic or domain knowledge.

**Files:** None found

**Severity:** N/A

**Root Cause:** N/A

**Potential Runtime Effect:** N/A

### Pattern: Embedded Domain Knowledge

**Definition:** Domain data embedded in components or config files instead of authorities.

**Files:**
- config/navigation.ts (navigation structure)
- config/faq.ts (FAQ content)
- config/featureFlags.ts (feature flags)
- config/seo.ts (SEO defaults)
- config/company.ts (company data)

**Severity:** MEDIUM

**Root Cause:** Some domains don't have JSON authorities. Hardcoded config is the authority.

**Potential Runtime Effect:** No adapter abstraction. Direct imports required. Harder to migrate to external data sources.

### Pattern: Mutable Constants

**Definition:** Constants exported from config files that can be mutated at runtime.

**Files:** None found (all exports are const)

**Severity:** N/A

**Root Cause:** N/A

**Potential Runtime Effect:** N/A

### Pattern: Configuration Drift

**Definition:** Related config files that can drift apart without detection.

**Files:**
- config/projects.ts vs config/projects.v1.json
- config/services.ts vs config/services.v1.json
- config/counties.ts vs config/cities.v1.json
- config/serviceCategories.ts vs config/services.v1.json

**Severity:** HIGH

**Root Cause:** No validation checks for consistency between related config files. No single source of truth enforcement.

**Potential Runtime Effect:** Data inconsistency. Confusion about which source is correct. Maintenance burden.

### Pattern: Implicit Defaults

**Definition:** Default values embedded in adapters or components instead of authorities.

**Files:** None found

**Severity:** N/A

**Root Cause:** N/A

**Potential Runtime Effect:** N/A

### Pattern: Silent Fallback

**Definition:** Adapters that silently fall back to defaults when authority fails.

**Files:** All adapters (lib/projects.ts, lib/media.ts, lib/reviews.ts, lib/brand.ts, lib/registries.ts)

**Severity:** LOW

**Root Cause:** Error handling in adapters returns empty arrays/objects instead of throwing errors.

**Potential Runtime Effect:** Silent failures. Authority errors masked. Harder to detect data issues.

### Pattern: Generated Authority

**Definition:** Authority files that are generated from other sources.

**Files:** None found

**Severity:** N/A

**Root Cause:** N/A

**Potential Runtime Effect:** N/A

---

## Phase 9 — Constitutional Findings

### Finding 1: Authority Uniqueness Not Enforced

**ID:** CON-001  
**Title:** Authority uniqueness invariant not mechanically enforced  
**Evidence:** Duplicate authorities exist (projects.ts vs projects.v1.json, services.ts vs services.v1.json) without detection  
**Invariant Violated:** Every domain must have exactly ONE authority  
**Severity:** CRITICAL  
**Impact:** Data inconsistency, edit propagation failure, confusion about canonical source  
**Confidence:** HIGH  
**Files:** config/projects.ts, config/services.ts, config/projects.v1.json, config/services.v1.json

### Finding 2: Adapter Bypass Not Prevented

**ID:** CON-002  
**Title:** Adapter bypass not prevented by architecture  
**Evidence:** Direct imports of config files bypass adapters (projects/[slug] imports config/projects.ts, estimate-wizard imports config/services.ts)  
**Invariant Violated:** No UI may bypass adapters  
**Severity:** CRITICAL  
**Impact:** Breaks adapter abstraction, validation cannot detect usage, future adapter changes won't affect bypassing code  
**Confidence:** HIGH  
**Files:** app/projects/[slug]/page.tsx, components/estimate-wizard.tsx

### Finding 3: Shadow Authorities Not Detected

**ID:** CON-003  
**Title:** Shadow authorities not detected by validation  
**Evidence:** Shadow authorities exist (counties.ts shadows cities.v1.json, transformations.ts shadows media.v1.json) without detection  
**Invariant Violated:** No second authority may exist  
**Severity:** HIGH  
**Impact:** Data inconsistency, duplicate maintenance burden, confusion about canonical source  
**Confidence:** HIGH  
**Files:** config/counties.ts, config/transformations.ts, config/serviceCategories.ts

### Finding 4: Compiler Trust Broken

**ID:** CON-004  
**Title:** Cannot prove authority edits render on all pages  
**Evidence:** Editing projects.v1.json does not update projects/[slug] page (uses config/projects.ts). Editing services.v1.json does not update estimate wizard (uses config/services.ts)  
**Invariant Violated:** Authority is the only mutable source of domain truth  
**Severity:** CRITICAL  
**Impact:** Edit propagation failure, data inconsistency, developer confusion  
**Confidence:** HIGH  
**Files:** config/projects.v1.json, config/services.v1.json

### Finding 5: Validation Missing Constitutional Checks

**ID:** CON-005  
**Title:** Validation engine does not check constitutional invariants  
**Evidence:** Validation engine checks schema and referential integrity but does not check authority uniqueness, adapter bypass, shadow authorities, or legacy authorities  
**Invariant Violated:** Constitutional invariants not validated  
**Severity:** HIGH  
**Impact:** Violations go undetected, architectural drift accumulates  
**Confidence:** HIGH  
**Files:** lib/validation-engine.ts

### Finding 6: No Build-Time Enforcement

**ID:** CON-006  
**Title:** No build-time enforcement of architectural rules  
**Evidence:** TypeScript allows any import. No lint rule prevents @/config/... imports. No build-time check detects adapter bypass or duplicate authorities  
**Invariant Violated:** Architectural invariants not mechanically enforced  
**Severity:** CRITICAL  
**Impact:** Violations can be introduced without detection, relies on developer discipline  
**Confidence:** HIGH  
**Files:** All config files

### Finding 7: Adapter Silent Fallback

**ID:** CON-007  
**Title:** Adapters silently fall back to empty data on error  
**Evidence:** All adapters return empty arrays/objects when authority fails to load instead of throwing errors  
**Invariant Violated:** Authority failures should be visible  
**Severity:** LOW  
**Impact:** Silent failures, authority errors masked, harder to detect data issues  
**Confidence:** HIGH  
**Files:** lib/projects.ts, lib/media.ts, lib/reviews.ts, lib/brand.ts, lib/registries.ts

### Finding 8: Underutilized Authorities

**ID:** CON-008  
**Title:** JSON authorities exist but are not used by pages  
**Evidence:** cities.v1.json, materials.v1.json, gallery-presets.v1.json exist but no pages use them. Related shadow authorities (counties.ts) are used instead  
**Invariant Violated:** Authority should be the single source of truth  
**Severity:** MEDIUM  
**Impact:** Dead code, confusion about which source to use, migration incomplete  
**Confidence:** HIGH  
**Files:** config/cities.v1.json, config/materials.v1.json, config/gallery-presets.v1.json

---

## Phase 10 — Meta Analysis

### 1. Is authority uniqueness currently guaranteed by architecture, or only maintained by developer discipline?

**Answer:** Only maintained by developer discipline.

**Evidence:** Duplicate authorities exist (projects.ts vs projects.v1.json, services.ts vs services.v1.json) without detection. No build-time or runtime check prevents creating a second authority. TypeScript allows any import. No lint rule prevents duplicate authority files.

### 2. Could another duplicate authority be introduced tomorrow without detection?

**Answer:** YES

**Evidence:** A developer can create `config/projects2.json` and import it anywhere. No validation checks for duplicate authority files. No build-time check detects this. No lint rule prevents it.

### 3. Could a page silently bypass canonical authority?

**Answer:** YES

**Evidence:** Pages already bypass canonical authority (projects/[slug] bypasses projects.v1.json, estimate-wizard bypasses services.v1.json). No mechanism prevents direct imports of config files. No validation checks for adapter bypass.

### 4. Could adapters drift independently?

**Answer:** NO

**Evidence:** Adapters are clean and load exactly one authority each. No adapter contains embedded domain data. No adapter falls back to multiple authorities. Adapters cannot drift independently because they have no embedded data.

### 5. Is constitutional integrity mechanically enforced, or socially enforced?

**Answer:** Socially enforced

**Evidence:** No mechanical enforcement exists for any constitutional invariant. No build-time checks, no runtime validation, no lint rules. All invariants rely on developer discipline to follow architectural rules.

### 6. What invariant is most responsible for the current architectural fragility?

**Answer:** Authority uniqueness not mechanically enforced

**Evidence:** This is the root cause of multiple failure modes:
- Duplicate authorities exist (projects.ts vs projects.v1.json, services.ts vs services.v1.json)
- Adapter bypass is possible because duplicate authorities exist
- Compiler trust is broken because duplicate authorities exist
- Shadow authorities exist because authority uniqueness is not enforced
- Validation does not check authority uniqueness

If authority uniqueness were mechanically enforced, most other violations would be prevented or detected.

---

## Conclusion

**Constitutional Integrity Status:** NOT MECHANICALLY ENFORCED

**Key Finding:** The repository relies entirely on developer discipline to maintain architectural invariants. No mechanical enforcement exists for any constitutional rule.

**Root Cause:** Authority uniqueness invariant is not mechanically enforced. This single failure enables multiple architectural violations:
- Duplicate authorities can exist without detection
- Adapter bypass is possible without detection
- Shadow authorities can exist without detection
- Compiler trust cannot be guaranteed

**Architectural Fragility:** HIGH. The architecture is socially enforced, not mechanically enforced. This means architectural drift will accumulate over time as developer discipline varies.

**Recommendation:** Implement mechanical enforcement of constitutional invariants through:
1. Build-time validation of authority uniqueness
2. Lint rules preventing direct config imports
3. Validation engine checks for constitutional violations
4. Compiler-level enforcement of adapter-only access

**Without mechanical enforcement, the architecture will continue to accumulate drift and violations.**
