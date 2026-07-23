<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structures may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Standing Engineering Rules (CEO Directive 032 review)

1. **Commit only on green.** End every implementation turn by attempting a commit
   to `main` ONLY after all checks pass (`npx tsc --noEmit` + Vercel build READY).
   If the build/tests fail, fix them before committing. If they cannot be fixed in
   that turn, STOP and report the blocker — never commit a broken state.
2. **Alternate feature work with UI review passes.** Every few implementation
   turns, do a dedicated UI review instead of adding components. Review at:
   1440px desktop, ~1280px laptop, tablet, mobile (390–430px). Check header
   spacing, hero composition, typography rhythm, image cropping, button alignment,
   section transitions, empty space, visual balance, and accessibility (contrast,
   focus states, tap targets ≥44px). Feature work and polish are different
   activities — intentionally alternate them.
3. **Design for the eye, not the grid.** Apply cedar *principles* (organic rhythm,
   depth over borders, floating content, offset/overlapping images, one
   unmistakable visual signature) rather than identical boxes/dividers. The brand
   signature = cedar corner accent + evergreen gradient + warm golden light on
   photos + Playfair headings + Playball signature + honey CTA.

# Brand (Happy Place Carpentry)
- Owners: Taylor Happy (craftsmanship/build) + Lanie Happy (communication/estimates). Contact: taylor@happyplacecarpentry.com.
- Palette tokens in `globals.css @theme`: primary=evergreen #1F3F3C, honey #d99a4e, accent=taupe #B0A092, background=linen #EDEAE0, cream #E9DBC9, surface #EDEDED, deep #162b29.
- Logo: simple tape-measure mark (`/brand/logo-*.svg`), recreated faithfully — original is login-walled.
- Secrets never in repo; Google OAuth client-only (no refresh token) → Drive not readable without owner consent.

# Standing Design Directives (CEO final polish — release gates)

**A. Introduce owners ONCE.** Single "Meet Taylor & Lanie" block on homepage + full story on /about. No repeated owner name-drops elsewhere; other sections speak as "Happy Place Carpentry." Brand feels larger than two people yet personal.

**B. Preserve original voice.** The old Google Site is source material — favorite phrases, tone, local refs, testimonials, project descriptions. Modernize *presentation*, never rewrite voice.

**C. Photography leads.** Layout order = Hero photo → Composition → Typography → Copy → CTA. Never fit photos into a pre-made grid.

**D. Every image is explicitly mapped** (`photo-intake/manifest.schema.json`): hero/cover/thumbnail/before[]/after[]/details[]/homeowner/galleryOrder. Deterministic + editable. No "first file in folder."

**E. Project-centric media.** `Project → Hero/Before/After/Details/Homeowner/Timeline/Materials`. Galleries, project pages, home features all derive from the project.

**F. Never crop craftsmanship.** Each image has a `focal:{x,y}` that survives desktop/tablet/mobile (joints, trim, railings, cabinetry).

**G. Image QA is a release gate.** Before every deploy run `npm run qa:images` — hero crops, no stretch, before/after aligned, mobile/desktop crops, retina sharp, lazy-load, alt text, blur placeholders, no broken images. Fails → block deploy.

**H. Simple V1 pipeline.** Owner drops photos in `photo-intake/<Folder>/` (flat names: `Decks`, `Fences`, `Pergolas`, `Kitchen Remodeling`, `Bathroom Remodeling`, `Built-Ins`, `Repairs`, `Outdoor Living`, `Misc`) → `npm run images` archives originals, generates AVIF/WebP/thumb/blur, writes `gallery.json`, commits. No AI/db/hidden automation.

**I. Folder = source of truth.** `photo-intake/Decks/`, `photo-intake/Kitchen Remodeling/`, etc. Folder name supplies category; `CATEGORY_MAP` in the pipeline maps it to the canonical category.

**J. Every commit refines visuals** (Directive #10): each near-end commit adds ≥1 polish (spacing/type/alignment/composition/mobile rhythm/hover/loading) — site gets visibly better each commit, not just more features.

**Priority rule:** When a feature conflicts with making the experience more trustworthy/beautiful/effortless, prioritize the experience. This is a premium marketing experience for craftsmanship, not a software project.

## Standing rule — Photography has authority over copy (Directive 033)

If a strong photo communicates what a paragraph says, shorten or remove the paragraph. Never keep explanatory text that exists only because photography was previously missing. Every commit from here should make the site feel more premium in under five seconds — larger photography, stronger hierarchy, better contrast, improved section rhythm, quieter copy — not more engineering. Owner portrait appears exactly once (homepage owner section + About, same source). Hero never uses the owner photo; hero = best transformation, else best exterior, else fence, else bathroom.

---

# Repository State (Session 17 — Archaeology Complete)

## Git Status
- **Branch:** `main` — synced with `origin/main` at `87db0ac`
- **Remote:** `trishnikitha-art/happy-place-platform.git`
- **Unstaged:** 3 files (planning-context.ts, planning-range.ts, planning-strategies/index.ts)
- **Last build:** `.next/` built 7/21 12:16 PM (BUILD_ID: `XSZn-0lUq66iaHAX2g9DY`), gitignored

## Build Flow
```
photo-intake/ → npm run images → public/images/ + gallery.json + generated/
                                        ↓
                                  npm run build → .next/ (gitignored)
```

## Generated Authorities (audited — 3 fixed, 1 clean, 3 kept)
| Authority | Status | Notes |
|-----------|--------|-------|
| `pipelineVersion` | **Fixed** | Was hardcoded "1.0.0" in 2 places → extracted to `PIPELINE_VERSION` constant |
| `pipelineCommit` | **Fixed** | Was always "unknown" → added `cwd: ROOT` to `execSync` |
| `presentationHash` | **Fixed** | Was hashing `manifest.v1.json` → now hashes `presentation.v1.json` |
| `generatedAt` | Clean | Non-deterministic timestamp, serves audit trail |
| `galleryHash` | Clean | SHA-256 of `gallery.json`, detects config changes |
| `rebuild-cache.json` | Clean | Incremental build optimization (not an authority) |
| `golden-manifest.json` | Clean | Regression test baseline (21 image hashes) |

## Known Issues (not blocking)
| Issue | Severity | Status |
|-------|----------|--------|
| `layout.tsx` JSON-LD has hardcoded `aggregateRating` with `reviewCount: "40"` | Medium | Not fixed |
| Stale deployment showing "Taylor Happy L." — fix exists at `1495308` but not deployed | High (deployment) | Requires Vercel redeploy |
| 3 unstaged files not committed | Low | Pending review |

## Investigation: "Taylor Happy L."
- Commit `676ccd4` had hardcoded `{taylor.name} L.` in footer — names were "Taylor" and "Lanie" → showed "Taylor L."
- Commit `1495308` fixed: names → "Taylor Happy" / "Lanie Happy", "L." removed
- Current source: `"Taylor Happy"` and `"Lanie Happy"` — no "L." anywhere
- If someone sees "Taylor Happy L." today → **deployed site is running stale code** from before `1495308`

## Google Workspace (Directives 038/040/041)
- **Activation path:** 4 env vars + 1 feature flag flip → ~20 min to working Gmail estimates
- **Required vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`
- **Status:** Zero credentials on this machine. No `.env.local`. Unknown Vercel env var state.
- **Capability:** Only Gmail Send is ready-to-activate (zero new code needed). Other capabilities need additional code.
- **Report:** `DIRECTIVE_038_GOOGLE_WORKSPACE_AUDIT.md`, `DIRECTIVE_041_OPERATIONAL_RECOVERY_AUDIT.md`

## Image Authority Reconciliation (Session 18 — Filesystem Audit)

**Root cause confirmed:** Commit `33b82e7` deleted `gallery.json` (21 entries) + `presentation.v1.json`, created `media.v1.json` (16 entries). 6 source images lost authority records. Physical files never deleted.

### Physical Files: ALL PRESENT
- 21 source originals in `photo-intake/` (active, non-archive)
- 103 optimized variants in `public/images/projects/`
- 21 redundant copies in `photo-intake/_archive/`

### Authority Gap: 6 ORPHANED IMAGES
Source files exist on disk + in `manifest.v1.json` but NOT in `media.v1.json`:

| Source File | On Disk | manifest | media | Status |
|------------|---------|----------|-------|--------|
| featured/featured.jpeg | YES (3 variants) | YES | **NO** | ORPHANED |
| hero/hero.jpeg | YES (3 variants) | YES | **NO** | ORPHANED |
| portrait/portrait.jpeg | YES (3 variants) | YES | **NO** | ORPHANED |
| Repairs/FLOOR0.jpg | YES (7 variants) | YES | **NO** | ORPHANED |
| Repairs/IMG_0544.JPG | YES (3 variants) | YES | **NO** | ORPHANED |
| Repairs/IMG_0546.JPG | YES (3 variants) | YES | **NO** | ORPHANED |

### brand.v1.json: ALL mediaIds ARE NULL
- `homepageHero.mediaId: null` → homepage hero renders nothing
- `ownerPortrait.mediaId: null` → owner portrait renders nothing
- `logo.mediaId: null` → logo not rendered

### Variant Key Mismatch
- Components access `variants.web` (`page.tsx:26,29`)
- media.v1.json uses key `webp`
- Result: even if mediaIds were set, images wouldn't render

### What Renders Today
- Hero section: EMPTY (brand mediaId null)
- Owner portrait: EMPTY (brand mediaId null)
- Before/after slider: EMPTY (cedar-fence-001 project doesn't exist)
- Service cards: WORKING (projects.v1.json → media.v1.json → disk)
- Reviews: "Building our review portfolio" (empty by design)

### Fix Order (RESOLVED — see Session 19)

## Session 19 — Git Archaeology + Geographic Simplification

### What was done
- **Git archaeology (3 parallel agents):** Proved 21 unique photographic originals were EVER committed to this repository. Zero photographs lost from git. The ~13 "missing" originals never existed as files in this repo — they are on Google Drive only.
- **Pergola image forensics:** `HOMESERVICEPROJECTPERGOLAS.jpg` was referenced in media.v1.json at commit `abf5740` with `driveId: "H:\\My Drive\\..."` but the actual file was never committed. Fabricated variant paths never existed on disk. Record was correctly removed in `6bc8ed9`.
- **Phase E — Geographic simplification:** Reduced `cities.v1.json` from 10 cities to 4 closest: Philomath, Albany, Monmouth, Independence. Updated `faq.v1.json` service area answer to match. County references in project/media records preserved.
- **MISSING_ORIGINALS_REPORT.md** written — documents honest 21/21 count with full git archaeology evidence.
- **PHOTO_RECONSTRUCTION_REPORT.md** updated with pergola finding, geographic phase, and archaeology summary.

### Key files changed
- `src/config/cities.v1.json`: 10 cities → 4 (Philomath, Albany, Monmouth, Independence)
- `src/config/faq.v1.json`: service area answer updated
- `MISSING_ORIGINALS_REPORT.md`: new file
- `PHOTO_RECONSTRUCTION_REPORT.md`: updated

### Commit
- `eaacbd2` — pushed to origin/main

### Current State
- media.v1.json: 21 entries (all verified on disk)
- brand.v1.json: mediaIds connected (brand-hero, brand-featured, brand-portrait)
- projects.v1.json: 5 projects with hero + gallery refs, all resolving
- cities.v1.json: 4 cities (closest to business)
- About page renders 4-city grid in 4-column layout
- Build: 53 pages, zero TypeScript errors
- Deployment: Vercel production at https://website-plum-three-68.vercel.app

### What's NOT in this repo
- ~13 additional project photos (decks, pergolas, painting, kitchens, ADUs, pole barns, flooring) — these exist only on Google Drive, never committed to git
- Higher-resolution source photos (hero 480×640, portrait 640×427, featured 480×640) — need manual sourcing
- The `cities.v1.json` is NOT imported by any component except through `registries.ts` → `getAllCities()` → about page

### Remaining work
- To add more project photos: copy from Google Drive to `photo-intake/`, run pipeline, create canonical records
- Phase E geographic simplification is complete — 4 cities on about page
- All other image authority chains verified end-to-end
