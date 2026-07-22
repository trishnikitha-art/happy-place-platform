# Architecture Archaeology Report

**Date:** 2026-07-21
**Scope:** Full repository archaeology — build flow, git history, deployment state, generated authorities, bug tracing

---

## 1. Build Artifact Flow

```
photo-intake/<project>/<file>.jpeg
    │
    ▼  npm run images (scripts/image-pipeline.mjs)
    │
    ├── public/images/projects/<project>/<name>-{480,768,1080,1600,2000}.{webp,avif}
    ├── src/config/gallery.json (124KB, machine-generated)
    ├── generated/gallery.manifest.json (pipeline metadata)
    ├── generated/golden-manifest.json (regression test baseline)
    └── generated/rebuild-cache.json (1935 lines, incremental build cache)
    │
    ▼  npm run build (next build)
    │
    └── .next/ (BUILD_ID: XSZn-0lUq66iaHAX2g9DY, built 7/21 12:16 PM) [gitignored]
```

---

## 2. Seven Generated Authorities

| # | Authority | Location | Deterministic | Necessary | Verdict |
|---|-----------|----------|---------------|-----------|---------|
| 1 | `pipelineVersion` | gallery.manifest.json:2 | Yes (hardcoded "1.0.0") | No — never changes | **Fixed** → extracted to `PIPELINE_VERSION` constant |
| 2 | `generatedAt` | gallery.manifest.json:3 | No (non-deterministic timestamp) | Yes — audit trail | Keep |
| 3 | `pipelineCommit` | gallery.manifest.json:8 | Broken ("unknown") | Yes — links to source commit | **Fixed** → `cwd: ROOT` added to `execSync` |
| 4 | `galleryHash` | gallery.manifest.json:6 | Yes (SHA-256 of gallery.json) | Yes — detects config changes | Keep |
| 5 | `presentationHash` | gallery.manifest.json:7 | Buggy (hashes manifest.v1.json) | Yes — should detect curation changes | **Fixed** → now hashes presentation.v1.json |
| 6 | `rebuild-cache.json` | generated/ | Yes (per-image content hash) | Yes — incremental build optimization | Keep |
| 7 | `golden-manifest.json` | generated/ | Yes (per-image SHA-256 + gallery hash) | Yes — regression test baseline | Keep |

**Redundancy assessment:** Only `pipelineVersion` was redundant (hardcoded, never changes). The other six serve distinct purposes. `rebuild-cache.json` is an optimization cache, not an authority — it and `golden-manifest.json` are not redundant (one optimizes speed, the other verifies correctness).

---

## 3. Branch & Deployment State

| Check | Result |
|-------|--------|
| Local HEAD | `87db0ac` |
| origin/main | `87db0ac` (in sync) |
| Unstaged changes | 3 files (planning-context.ts, planning-range.ts, planning-strategies/index.ts) |
| `.vercel/` directory | **Missing** — never linked from this machine |
| `vercel.json` | Present — `framework: "nextjs"`, `region: "iad1"` |
| GitHub remote | `trishnikitha-art/happy-place-platform.git` |

**Conclusion:** Vercel deployment exists (vercel.json present), but the linking configuration is absent from this machine. The Vercel dashboard is the authority for deployment state.

---

## 4. Duplicate Outputs

| Artifact | Copies | Verdict |
|----------|--------|---------|
| `public/` | 1 | Clean |
| `gallery.json` | 1 | Clean |
| `.next/` | 1 | Clean |

Zero duplicate output directories found.

---

## 5. Taylor Happy L. Source Trace

### Root Cause: Stale Deployment

Git history confirms the "L." is a **historical artifact already fixed**:

| Commit | Owner Names | Footer | Status |
|--------|-------------|--------|--------|
| `676ccd4` | "Taylor", "Lanie" | `{taylor.name} L.` hardcoded | Bug present |
| `1495308` | "Taylor Happy", "Lanie Happy" | "L." removed | **Bug fixed** |
| Current | "Taylor Happy", "Lanie Happy" | No "L." | Working |

**If someone sees "Taylor Happy L." today, the deployed site is running code from before commit `1495308`.** The fix exists but hasn't been deployed to the production instance they're viewing.

---

## 6. Bugs Found

### Fixed in This Session

| # | Bug | File:Line | Commit | Fix |
|---|-----|-----------|--------|-----|
| 1 | `presentationHash` hashes `manifest.v1.json` instead of `presentation.v1.json` | `image-pipeline.mjs:261` | `75dde7c` | Changed `hashFile(MANIFEST)` → `hashFile(PRESENTATION)` |
| 2 | `pipelineCommit` always "unknown" — `git rev-parse HEAD` runs from wrong cwd | `image-pipeline.mjs:282-286` | `75dde7c` | Added `cwd: ROOT` to `execSync` options |
| 3 | `pipelineVersion` hardcoded "1.0.0" in two places — no single source of truth | `image-pipeline.mjs:269,461` | `75dde7c` | Extracted to `PIPELINE_VERSION` constant at top of file |

### Already Fixed (Prior Session)

| # | Bug | Fixed In | Details |
|---|-----|----------|---------|
| 4 | Hero shows abstract gradient instead of photo | `c727705` | `presentation.v1.json` hero/hero changed from `gallery: false` → `gallery: true` |

### Known, Not Yet Fixed

| # | Bug | Severity | Location |
|---|-----|----------|----------|
| 5 | `layout.tsx` JSON-LD has hardcoded `aggregateRating` with `reviewCount: "40"` | Medium | `src/app/layout.tsx` |
| 6 | Stale deployment showing "Taylor Happy L." | High (deployment) | Requires Vercel redeploy |
| 7 | 3 unstaged files not committed | Low | planning-context/range/strategies |

---

## 7. Pipeline Architecture Summary

### Source Files (tracked in git)
- `photo-intake/` — raw photos (4 projects: featured, hero, outdoor-living, portrait + bathroom-remodeling, fences, built-ins, repairs)
- `scripts/image-pipeline.mjs` — deterministic pipeline (564 lines)
- `scripts/image-source/` — ImageSource abstraction (filesystem adapter)
- `scripts/image-qa.mjs` — constitutional validation (9 checks)
- `scripts/pipeline/` — context, stages, validators
- `src/config/presentation.v1.json` — human curation (roles, quality gates, homepage selection)
- `src/config/gallery.json` — machine-generated photo catalog (124KB)
- `src/config/manifest.v1.json` — machine-generated identity manifest
- `src/lib/media.ts` — presentation merger (photoFor, heroBackground, featuredTransformation, etc.)
- `src/lib/presentation-authority.ts` — constitutional index for human decisions

### Generated Files (tracked in git)
- `generated/gallery.manifest.json` — pipeline metadata (7 authorities)
- `generated/golden-manifest.json` — regression test baseline (21 image hashes)
- `generated/rebuild-cache.json` — incremental build cache (1935 lines)
- `public/images/projects/` — processed WebP + AVIF responsive images

### Build Output (gitignored)
- `.next/` — Next.js build output (last built 7/21 12:16 PM)

---

## 8. Deployment Surface

- **Platform:** Vercel
- **Framework:** Next.js 16.2.10
- **Region:** iad1
- **GitHub:** `trishnikitha-art/happy-place-platform`
- **Local linking:** Not present (`.vercel/` missing)
- **Environment variables:** Unknown (no `.env.local` exists on this machine)
