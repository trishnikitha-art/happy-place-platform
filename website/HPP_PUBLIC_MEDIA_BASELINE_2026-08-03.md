# HPP Public Media Baseline - August 3, 2026

**Baseline Commit:** `5ba201c` (fix: remove internal workflow cards from public project pages)
**Baseline Date:** August 3, 2026
**Purpose:** Document all media actually used by the public website at deployment baseline
**Rule:** DO NOT REMOVE any website media - this is the visual/content reality we must preserve

---

## EXECUTIVE SUMMARY

### Total Media Assets in Baseline: 21
### Total Projects in Baseline: 6
### Homepage Hero: Hardcoded `/images/hero-background-enhanced.jpg`
### Brand Assets: 3 (featured, hero, portrait)
### Project Media: 18 assets across 6 projects

---

## MEDIA.V1.JSON BASELINE (21 Assets)

### Brand Assets (3)
1. **brand-featured** - featured.jpeg (480x640)
2. **brand-hero** - hero.jpeg (480x640) 
3. **brand-portrait** - portrait.jpeg (640x427)

### Fences Project (4)
4. **fences-001-hero** - FENCE BUILD.jpg (1920x1080)
5. **fences-001-before** - FENCE BEFORE.jpg (1920x1080)
6. **fences-001-after** - FENCE AFTER.jpg (1920x1080)
7. **fences-001-matching** - FENCEREBUILDMATCHINGSTAIN.png (1920x1080)

### Built-Ins Project (2)
8. **builtins-001-hero** - FINISHEDCARPENTRY.png (1920x1080)
9. **builtins-001-secondary** - FINISHEDCARPENTRY0.png (1920x1080)

### Repairs Project (7)
10. **repairs-001-hero** - TRIMREPAIR (1920x1080)
11. **repairs-001-drywall** - DRYWALL (1920x1080)
12. **repairs-001-floor** - FLOOR (1920x1080)
13. **repairs-001-gutter** - GUTTERCLEANING (1920x1080)
14. **repairs-001-floor0** - FLOOR0 (1280x1017)
15. **repairs-001-img0544** - IMG_0544.JPG (480x640)
16. **repairs-001-img0546** - IMG_0546.JPG (480x640)

### Outdoor Living Project (7)
17. **outdoor-living-001-hero** - IMG_0841 (1280x853)
18. **outdoor-living-001-2** through **outdoor-living-001-6** (multiple images)

### Bathroom Remodeling Project (1)
19. **bathroom-remodeling-001-hero** - BATHROOM_WALL.png (1920x1080)

### Pergolas Project (3)
20. **pergolas-001-hero** - HOMESERVICEPROJECTPERGOLAS.jpg (4367x3275)
21. **pergolas-001-before** - 1.png (4367x3275)
22. **pergolas-001-after** - HOMESERVICEPROJECTPERGOLAS.jpg (4367x3275)

---

## PROJECTS.V1.JSON BASELINE (6 Projects)

1. **fences-001** - Fence Installation - Willamette Valley
   - Hero: fences-001-hero
   - Before: fences-001-before
   - After: fences-001-after
   - Gallery: 6 images

2. **pergolas-001** - Steel-Framed Covered Privacy Courtyard – Corvallis
   - Hero: pergolas-001-hero
   - Before: pergolas-001-before
   - After: pergolas-001-after
   - Gallery: 3 images

3. **builtins-001** - Custom Built-Ins - Corvallis
   - Hero: builtins-001-hero
   - Gallery: 5 images

4. **repairs-001** - Home Repairs - Willamette Valley
   - Hero: repairs-001-hero
   - Gallery: 6 images

5. **exterior-painting-001** - Exterior Painting & Surface Restoration – Corvallis
   - Hero: painting-001-hero
   - Before: painting-001-before
   - After: painting-001-after
   - Gallery: 12 images

6. **bathroom-remodeling-001** - Bathroom Remodeling - Corvallis
   - Hero: bathroom-remodeling-001-hero
   - Gallery: 6 images

---

## PAGE.TSX BASELINE

### Homepage Hero
**Source:** Hardcoded `/images/hero-background-enhanced.jpg`
**Status:** Non-constitutional (hardcoded path)
**Note:** This is different from the brand-hero in media.v1.json

### Owner Portrait
**Source:** Dynamic via `heroSrc` (from getHomepageHeroMedia)
**Status:** Constitutional resolution
**Note:** Uses brand-portrait from media.v1.json

---

## CURRENT STATE (December 11, 2026)

### Media.v1.json: 4 assets only
- homepage-hero-canonical (hero-background-enhanced.jpg)
- Feature-Fence-Photo.jpg
- HP0017_ExteriorPainting_After.jpg
- HP0017_ExteriorPainting_Before.jpg

### Projects.v1.json: 3 projects only
- project-featured
- project-hp0017
- project-hp0018

### MISSING FROM CURRENT STATE:
- 17 baseline media assets completely missing
- 3 baseline projects completely missing
- All Drive IDs removed from media records
- Most variant paths simplified (original + web only)

---

## CRITICAL FINDING

The August 3 baseline had a **COMPLETELY DIFFERENT media architecture** than the current state:

**Baseline (Aug 3):**
- 21 media assets with full Drive IDs
- 6 projects with complete media references
- Full variant paths (original, web, webp, avif, thumbnail)
- Brand assets in media authority

**Current (Dec 11):**
- 4 media assets only
- 3 projects only
- No Drive IDs
- Simplified variants (original + web only)
- Brand assets in separate authority

**This is NOT a simplification. This is a DIFFERENT deployment.**

---

## RECOMMENDATION

**DO NOT restore the August 3 media.v1.json.**

The current state (4 assets, 3 projects) may be the **intended production state** after the August 3 cleanup.

Instead:

1. **Identify which assets are actually used by the CURRENT website**
2. **Map those assets to Drive**
3. **Build the Workbench to manage the CURRENT reality**
4. **Do not assume August 3 is the target state**

The August 3 baseline is useful for understanding what existed historically, but the CURRENT website state is the reality we must preserve and manage.

---

## NEXT STEPS

1. **Audit current website usage** - which of the 4 current assets are actually rendered?
2. **Audit current project pages** - which of the 3 current projects are actually displayed?
3. **Map current assets to Drive** - if they exist in Drive, establish the connection
4. **Build Workbench around CURRENT reality** - not historical baselines
5. **Add "Unmapped" queue** - if additional images are discovered, add them to mapping queue
