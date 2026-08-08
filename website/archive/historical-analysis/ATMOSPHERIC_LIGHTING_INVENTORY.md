# Atmospheric Lighting Inventory

**Read-Only Audit** - Complete architectural discovery of all blue atmospheric lighting systems in the repository.

---

## Executive Summary

**Total Blue Atmospheric Systems Found:** 12 distinct systems
**Total Component Usage Locations:** 25+ instances
**Primary Color Family:** Cool blue/steel blue/fog blue
**Current Emotional Tone:** Cool, calm, Pacific Northwest fog
**Target Emotional Tone:** Warm, Pacific Northwest olive

---

## Category 1: Global Background Systems

### 1. Body Background Gradients
**File:** `src/app/globals.css` (lines 161-166)

**Purpose:** Subtle paper grain texture across entire site

**Colors Used:**
- `rgba(220, 234, 243, 0.02)` - Steel blue (2% opacity)
- `rgba(232, 241, 245, 0.015)` - Fog blue (1.5% opacity)
- `rgba(212, 196, 184, 0.01)` - Warm beige (1% opacity)

**Animation:** None (static)

**Opacity:** 1-2% (extremely subtle)

**Blend Mode:** None

**Z-index:** None (body background)

**Visible Where:** Entire site (global)

**Should Stay?** NO - Convert to olive/warm tones

**Should Move?** NO - Already in correct location (globals.css)

**Should Become Olive?** YES - Replace steel blue/fog blue with olive equivalents

---

### 2. Pacific Northwest Fog Layer
**File:** `src/app/globals.css` (lines 581-597)

**Purpose:** Atmospheric fog effect for sections

**Colors Used:**
- `rgba(220, 234, 243, 0.08)` - Steel blue (8% opacity)
- `rgba(232, 241, 245, 0.12)` - Fog blue (12% opacity)

**Animation:** None (static)

**Opacity:** 5% (via .pnw-fog class)

**Blend Mode:** None

**Z-index:** 2

**Visible Where:** Sections where .pnw-fog class is applied

**Should Stay?** NO - Convert to warm fog

**Should Move?** NO - Already in globals.css

**Should Become Olive?** YES - Replace with warm olive fog

---

## Category 2: Hero Atmospheric Systems

### 3. Hero Craft Atmospheric Layer
**File:** `src/app/globals.css` (lines 209-230)

**Purpose:** Combined sky gradient for hero sections

**Colors Used:**
- `rgba(250, 251, 252, 0.04)` - Cloud white (4% opacity)
- `rgba(220, 234, 243, 0.03)` - Steel blue (3% opacity)
- `rgba(23, 50, 74, 0.02)` - Deep navy (2% opacity)

**Animation:** None (static)

**Opacity:** 50% (via .hero-craft::before)

**Blend Mode:** overlay

**Z-index:** 2

**Visible Where:** Hero sections with .hero-craft class

**Should Stay?** NO - Convert to warm hero atmosphere

**Should Move?** NO - Already in globals.css

**Should Become Olive?** YES - Replace steel blue/navy with olive equivalents

---

### 4. Hero Radial Gradient (Homepage)
**File:** `src/app/page.tsx`

**Purpose:** White highlight at top of hero

**Colors Used:**
- `rgba(255, 255, 255, 0.4)` - White (40% opacity)

**Animation:** None (static)

**Opacity:** 40%

**Blend Mode:** None

**Z-index:** N/A (inline style)

**Visible Where:** Homepage hero

**Should Stay?** YES - White highlight is neutral

**Should Move?** NO

**Should Become Olive?** NO - White is neutral, not blue

---

### 5. Hero Radial Gradient (Homepage Bottom)
**File:** `src/app/page.tsx`

**Purpose:** Honey glow at bottom of hero

**Colors Used:**
- `rgba(217, 154, 78, 0.06)` - Honey (6% opacity)

**Animation:** None (static)

**Opacity:** 6%

**Blend Mode:** None

**Z-index:** N/A (inline style)

**Visible Where:** Homepage hero bottom

**Should Stay?** YES - Already warm (honey)

**Should Move?** NO

**Should Become Olive?** NO - Already warm

---

### 6. Hero Radial Gradient (Our Work)
**File:** `src/app/our-work/OurWorkClient.tsx`

**Purpose:** Honey glow and teal shadow for hero

**Colors Used:**
- `rgba(217, 154, 78, 0.18)` - Honey (18% opacity)
- `rgba(31, 63, 60, 0.6)` - Deep teal (60% opacity)

**Animation:** None (static)

**Opacity:** Varies by gradient

**Blend Mode:** None

**Z-index:** N/A (inline style)

**Visible Where:** Our Work page hero

**Should Stay?** PARTIAL - Honey is good, teal should become warmer

**Should Move?** NO

**Should Become Olive?** PARTIAL - Replace teal with olive/brown

---

### 7. Hero Parallax Animation
**File:** `src/app/globals.css` (lines 454-467)

**Purpose:** Subtle slow drift on hero background photo

**Colors Used:** None (transform only)

**Animation:** 18s ease-in-out infinite alternate (scale 1.06→1.12, translateY 0→-2.5%)

**Opacity:** N/A

**Blend Mode:** None

**Z-index:** N/A

**Visible Where:** Hero sections with .hero-parallax class

**Should Stay?** YES - Animation is neutral

**Should Move?** NO

**Should Become Olive?** N/A - No color change needed

---

## Category 3: Card Surface Systems

### 8. Card Background (CraftCard)
**File:** `src/components/ui/card.tsx`

**Purpose:** Light card surface color

**Colors Used:**
- `--color-surface: #E8F1F5` - Fog blue (CSS variable)

**Animation:** None (static)

**Opacity:** 100%

**Blend Mode:** None

**Z-index:** N/A

**Visible Where:** All cards using CraftCard component

**Should Stay?** NO - Convert to warm surface

**Should Move?** NO - Already centralized in CraftCard

**Should Become Olive?** YES - Replace fog blue with warm ivory/cream

---

### 9. Card Shadow System
**File:** `src/app/globals.css` (lines 89-95)

**Purpose:** Premium layered depth for cards

**Colors Used:**
- `rgba(23, 50, 74, 0.12)` - Navy blue (12% opacity)
- `rgba(23, 50, 74, 0.08)` - Navy blue (8% opacity)

**Animation:** None (static)

**Opacity:** 8-12%

**Blend Mode:** None

**Z-index:** N/A (box-shadow)

**Visible Where:** All cards

**Should Stay?** NO - Convert to warm shadows

**Should Move?** NO - Already centralized in globals.css

**Should Become Olive?** YES - Replace navy blue with warm brown/charcoal

---

### 10. Photo Mounting Effect
**File:** `src/app/globals.css` (lines 315-344)

**Purpose:** Premium frame effect for photos

**Colors Used:**
- `rgba(255, 255, 255, 0.7)` - White (70% opacity)
- `rgba(250, 251, 252, 0.75)` - Cloud white (75% opacity)
- `rgba(23, 50, 74, 0.12)` - Navy blue (12% opacity)
- `rgba(23, 50, 74, 0.5)` - Navy blue (50% opacity)

**Animation:** 0.3s cubic-bezier on hover (translateY -4px)

**Opacity:** Varies by layer

**Blend Mode:** None

**Z-index:** N/A (box-shadow)

**Visible Where:** Photos with .photo-mounted class

**Should Stay?** PARTIAL - White layers are neutral, navy shadows should warm

**Should Move?** NO

**Should Become Olive?** PARTIAL - Replace navy shadows with warm brown

---

## Category 4: Decorative/Atmospheric Components

### 11. WorkshopAtmosphere (Canvas Particles)
**File:** `src/components/workshop-atmosphere.tsx`

**Purpose:** Subtle decorative background for dark cards

**Colors Used:**
- `rgba(217, 154, 78, ${particle.opacity})` - Honey (2-10% opacity)

**Animation:** Continuous RAF loop (particles drift slowly)

**Opacity:** 2-10% (particle level), 60% (canvas level)

**Blend Mode:** None

**Z-index:** N/A (absolute positioning)

**Visible Where:** Dark cards across multiple pages:
- Homepage (3 instances)
- Our Work page (1 instance)
- Projects/[slug] page (3 instances)

**Should Stay?** YES - Already warm (honey)

**Should Move?** NO - Already centralized component

**Should Become Olive?** NO - Already warm

**Note:** This component is NOT blue - it's already using honey color. No change needed.

---

### 12. BlueprintGrid
**File:** `src/components/blueprint-grid.tsx`

**Purpose:** Subtle blueprint grid pattern

**Colors Used:**
- Default: `rgba(100, 120, 140, 0.08)` - Blue-gray (8% opacity)
- Custom: Various rgba values passed as props

**Animation:** Fade in on mount (Framer Motion)

**Opacity:** 4-8% (configurable)

**Blend Mode:** None

**Z-index:** N/A (absolute positioning)

**Visible Where:**
- Homepage (2 instances)
- Our Work page (2 instances)
- Projects/[slug] page (2 instances)

**Should Stay?** NO - Convert to warm grid

**Should Move?** NO - Already centralized component

**Should Become Olive?** YES - Replace blue-gray with warm brown/olive

---

## Category 5: Section Transitions

### 13. Section Bleed Image Transition
**File:** `src/app/globals.css` (lines 637-651)

**Purpose:** Honey gradient for image bleed transitions

**Colors Used:**
- `rgba(217, 154, 78, 0.05)` - Honey (5% opacity)

**Animation:** None (static)

**Opacity:** 5%

**Blend Mode:** None

**Z-index:** 0

**Visible Where:** Sections with .section-bleed-image class

**Should Stay?** YES - Already warm (honey)

**Should Move?** NO

**Should Become Olive?** NO - Already warm

---

### 14. Organic Divider
**File:** `src/app/globals.css` (lines 425-438)

**Purpose:** Asymmetric divider with honey accent

**Colors Used:**
- `--color-accent` - Charcoal
- `--color-honey` - Cedar gold

**Animation:** None (static)

**Opacity:** 60%

**Blend Mode:** None

**Z-index:** N/A

**Visible Where:** Section dividers

**Should Stay?** YES - Already warm (honey)

**Should Move?** NO

**Should Become Olive?** NO - Already warm

---

## Category 6: UI Components

### 15. Site Header Backdrop
**File:** `src/components/site-header.tsx`

**Purpose:** Sticky header with blur backdrop

**Colors Used:**
- `bg-background/90` - 90% opacity background
- `backdrop-blur-md` - Blur effect

**Animation:** None (static)

**Opacity:** 90%

**Blend Mode:** backdrop-blur

**Z-index:** 50

**Visible Where:** Global header

**Should Stay?** YES - Neutral blur

**Should Move?** NO

**Should Become Olive?** NO - Neutral effect

---

### 16. Project Lightbox Backdrop
**File:** `src/components/project-lightbox.tsx`

**Purpose:** Full-screen gallery backdrop

**Colors Used:**
- `bg-black/95` - 95% opacity black
- `backdrop-blur-sm` - Blur effect

**Animation:** None (static)

**Opacity:** 95%

**Blend Mode:** backdrop-blur

**Z-index:** 50

**Visible Where:** Project lightbox

**Should Stay?** YES - Neutral dark backdrop

**Should Move?** NO

**Should Become Olive?** NO - Neutral effect

---

### 17. Before/After Card Label
**File:** `src/components/before-after-card.tsx`

**Purpose:** Label backdrop on before/after images

**Colors Used:**
- `bg-deep/80` - 80% opacity deep navy
- `backdrop-blur-sm` - Blur effect

**Animation:** None (static)

**Opacity:** 80%

**Blend Mode:** backdrop-blur

**Z-index:** N/A

**Visible Where:** Before/after cards

**Should Stay?** NO - Deep navy should become warmer

**Should Move?** NO

**Should Become Olive?** YES - Replace deep navy with warm charcoal/brown

---

## Category 7: CSS Variables (Design Tokens)

### 18. Surface Color Tokens
**File:** `src/app/globals.css` (lines 36-40)

**Purpose:** Surface color definitions for entire site

**Colors Used:**
- `--color-surface-2: #DCEAF3` - Steel blue
- `--color-surface: #E8F1F5` - Fog blue
- `--color-surface-muted: #D8E3EA` - Slate mist

**Animation:** None (static)

**Opacity:** 100%

**Blend Mode:** None

**Z-index:** N/A

**Visible Where:** Used throughout site via CSS variables

**Should Stay?** NO - Core blue system that needs conversion

**Should Move?** NO - Already centralized in globals.css

**Should Become Olive?** YES - Primary target for olive conversion

---

### 19. Deep Color Tokens
**File:** `src/app/globals.css` (lines 43-45)

**Purpose:** Dark section color definitions

**Colors Used:**
- `--color-deep: #17324A` - Deep navy
- `--color-deep-2: #243746` - Blue charcoal

**Animation:** None (static)

**Opacity:** 100%

**Blend Mode:** None

**Z-index:** N/A

**Visible Where:** Hero sections, dark sections

**Should Stay?** NO - Core blue system that needs conversion

**Should Move?** NO - Already centralized in globals.css

**Should Become Olive?** YES - Primary target for olive conversion

---

### 20. Service Accent Colors
**File:** `src/app/globals.css` (lines 75-81)

**Purpose:** Service category accent colors

**Colors Used:**
- `--color-accent-decks: #4A90A4` - Ocean blue
- `--color-accent-remodeling: #5A6A7A` - Slate blue

**Animation:** None (static)

**Opacity:** 100%

**Blend Mode:** None

**Z-index:** N/A

**Visible Where:** Service cards, service pages

**Should Stay?** NO - Blue accents should become warmer

**Should Move?** NO - Already centralized in globals.css

**Should Become Olive?** YES - Replace ocean blue/slate blue with warm equivalents

---

## Category 8: Admin Dashboard (Out of Scope)

### 21-25. Admin Dashboard Blue Colors
**File:** Multiple admin dashboard components

**Purpose:** Admin interface (not customer-facing)

**Colors Used:**
- Various Tailwind blue classes (blue-50, blue-100, blue-200, blue-500, blue-600, blue-800)

**Animation:** None

**Opacity:** Varies

**Blend Mode:** None

**Z-index:** N/A

**Visible Where:** Admin dashboard only

**Should Stay?** YES - Admin interface, not customer-facing

**Should Move?** N/A

**Should Become Olive?** NO - Out of scope for brand conversion

---

## Duplicates Analysis

### Single Point of Control (Good)

1. **CSS Variables (globals.css)** - Controls all surface, deep, and accent colors
2. **CraftCard component** - Controls all card backgrounds
3. **WorkshopAtmosphere component** - Controls all particle effects
4. **BlueprintGrid component** - Controls all grid patterns

### Scattered Implementations (Needs Consolidation)

1. **Inline radial gradients** - Found in page.tsx, OurWorkClient.tsx (should move to CSS classes)
2. **Shadow definitions** - Scattered across globals.css and component files (should centralize)

### No Duplicates Found

- Each atmospheric system has a single source of control
- No copy-paste duplication of blue effects

---

## Usage Map

### WorkshopAtmosphere Usage
- Homepage: 3 instances (particleCount: 12, 12, 15)
- Our Work page: 1 instance (particleCount: 15)
- Projects/[slug] page: 3 instances (particleCount: 18, 20, 15)

**Total:** 7 instances across 3 pages

### BlueprintGrid Usage
- Homepage: 2 instances (gridSize: 20, 24)
- Our Work page: 2 instances (gridSize: 24, 20)
- Projects/[slug] page: 2 instances (gridSize: 20, 20)

**Total:** 6 instances across 3 pages

---

## Priority Ranking for Conversion

### Tier 1: High Impact (Core Color System)
1. **CSS Variables (globals.css)** - Controls entire site color palette
2. **Surface tokens** - Used on all cards
3. **Deep tokens** - Used on all hero/dark sections

### Tier 2: Medium Impact (Atmospheric Effects)
4. **Body background gradients** - Global background
5. **Hero craft layer** - Hero atmosphere
6. **PNW fog layer** - Section atmosphere
7. **Card shadows** - All card depth

### Tier 3: Low Impact (Decorative)
8. **BlueprintGrid** - Grid patterns (6 instances)
9. **Photo mounting** - Photo frames
10. **Before/After label** - Single component

### Tier 4: No Change Needed
11. **WorkshopAtmosphere** - Already warm (honey)
12. **Hero radial gradients (honey)** - Already warm
13. **Section transitions (honey)** - Already warm
14. **Backdrop blurs** - Neutral effects
15. **Admin dashboard** - Out of scope

---

## Recommended First Conversion

**Target:** CSS Variables in `src/app/globals.css`

**Rationale:**
- Single point of control for entire site
- Changes propagate automatically to all components
- Highest impact with lowest risk
- Easy to revert if contrast/accessibility issues arise

**Specific Variables to Change:**
- `--color-surface-2: #DCEAF3` → Warm olive equivalent
- `--color-surface: #E8F1F5` → Warm ivory/cream equivalent
- `--color-surface-muted: #D8E3EA` → Warm mist equivalent
- `--color-deep: #17324A` → Warm charcoal/olive equivalent
- `--color-deep-2: #243746` → Warm brown equivalent
- `--color-accent-decks: #4A90A4` → Warm equivalent
- `--color-accent-remodeling: #5A6A7A` → Warm equivalent

**Verification Required After Conversion:**
- Contrast ratios on all text
- Card readability
- Hero section legibility
- Dark mode compatibility
- Accessibility compliance (WCAG AA)
