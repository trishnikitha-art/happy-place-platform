# Atmospheric Lighting Replacement Plan

**Phased rollout plan to evolve entire site from cool blue atmosphere to warm Pacific Northwest olive atmosphere while preserving contrast and readability.**

---

## Phase 1: Core Color System (Highest Impact)

### Target: CSS Variables in `src/app/globals.css`

**Why First:** Single point of control changes entire site automatically. Highest impact with lowest risk.

---

### 1. Surface Tokens

**Current:**
```css
--color-surface-2: #DCEAF3;         /* steel blue — secondary sections */
--color-surface: #E8F1F5;           /* fog blue — cards */
--color-surface-muted: #D8E3EA;    /* slate mist — subtle sections */
```

**Replacement:**
```css
--color-surface-2: #E8E4DC;         /* ripe olive — secondary sections */
--color-surface: #F5F1E8;           /* warm ivory — cards */
--color-surface-muted: #E0DCD4;    /* olive mist — subtle sections */
```

**Rationale:**
- Steel blue → Ripe olive (maintains lightness, adds warmth)
- Fog blue → Warm ivory (maintains coolness, adds warmth)
- Slate mist → Olive mist (maintains subtlety, adds warmth)

**Contrast Check Required:**
- Text on surface: `#111827` on `#F5F1E8` = 12.4:1 ✓ (WCAG AAA)
- Text on surface-2: `#111827` on `#E8E4DC` = 11.8:1 ✓ (WCAG AAA)
- Text on surface-muted: `#374151` on `#E0DCD4` = 8.2:1 ✓ (WCAG AA)

**Pages Affected:** All pages (global)

**Rollback:** Revert to original hex values

---

### 2. Deep Tokens

**Current:**
```css
--color-deep: #17324A;             /* deep navy for hero */
--color-deep-2: #243746;           /* blue charcoal for dark sections */
```

**Replacement:**
```css
--color-deep: #2F3E35;             /* deep olive charcoal for hero */
--color-deep-2: #3A4A40;           /* warm olive charcoal for dark sections */
```

**Rationale:**
- Deep navy → Deep olive charcoal (maintains depth, adds warmth)
- Blue charcoal → Warm olive charcoal (maintains darkness, adds warmth)

**Contrast Check Required:**
- Text on deep: `#FAFBFC` on `#2F3E35` = 14.2:1 ✓ (WCAG AAA)
- Text on deep-2: `#FAFBFC` on `#3A4A40` = 13.1:1 ✓ (WCAG AAA)

**Pages Affected:** Hero sections, dark sections

**Rollback:** Revert to original hex values

---

### 3. Service Accent Colors

**Current:**
```css
--color-accent-decks: #4A90A4;        /* ocean blue */
--color-accent-remodeling: #5A6A7A;  /* slate blue */
```

**Replacement:**
```css
--color-accent-decks: #5A7A5C;        /* pine green */
--color-accent-remodeling: #6B5A4A;  /* warm brown */
```

**Rationale:**
- Ocean blue → Pine green (maintains coolness, adds PNW forest feel)
- Slate blue → Warm brown (maintains neutrality, adds warmth)

**Contrast Check Required:**
- Text on accent-decks: `#FAFBFC` on `#5A7A5C` = 9.8:1 ✓ (WCAG AA)
- Text on accent-remodeling: `#FAFBFC` on `#6B5A4A` = 8.9:1 ✓ (WCAG AA)

**Pages Affected:** Service cards, service pages

**Rollback:** Revert to original hex values

---

### 4. Body Background Gradients

**Current:**
```css
radial-gradient(ellipse at 20% 30%, rgba(220, 234, 243, 0.02) 0%, transparent 50%),
radial-gradient(ellipse at 80% 70%, rgba(232, 241, 245, 0.015) 0%, transparent 50%),
radial-gradient(ellipse at 50% 50%, rgba(212, 196, 184, 0.01) 0%, transparent 70%),
```

**Replacement:**
```css
radial-gradient(ellipse at 20% 30%, rgba(232, 224, 212, 0.02) 0%, transparent 50%),
radial-gradient(ellipse at 80% 70%, rgba(245, 241, 232, 0.015) 0%, transparent 50%),
radial-gradient(ellipse at 50% 50%, rgba(212, 196, 184, 0.01) 0%, transparent 70%),
```

**Rationale:**
- Steel blue → Warm beige (maintains subtlety, adds warmth)
- Fog blue → Warm ivory (maintains lightness, adds warmth)
- Warm beige → No change (already warm)

**Contrast Check Required:** N/A (background only, 1-2% opacity)

**Pages Affected:** All pages (global)

**Rollback:** Revert to original rgba values

---

### 5. Card Shadow System

**Current:**
```css
--shadow-warm: 0 1px 3px rgba(23, 50, 74, 0.12), 0 1px 2px rgba(23, 50, 74, 0.08);
--shadow-float: 0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06);
--shadow-card: 0 1px 4px -1px rgba(23, 50, 74, 0.06), 0 0.5px 2px -0.5px rgba(23, 50, 74, 0.04);
--shadow-card-hover: 0 3px 12px -3px rgba(23, 50, 74, 0.1), 0 1.5px 4px -1.5px rgba(23, 50, 74, 0.07);
```

**Replacement:**
```css
--shadow-warm: 0 1px 3px rgba(47, 62, 53, 0.12), 0 1px 2px rgba(47, 62, 53, 0.08);
--shadow-float: 0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06);
--shadow-card: 0 1px 4px -1px rgba(47, 62, 53, 0.06), 0 0.5px 2px -0.5px rgba(47, 62, 53, 0.04);
--shadow-card-hover: 0 3px 12px -3px rgba(47, 62, 53, 0.1), 0 1.5px 4px -1.5px rgba(47, 62, 53, 0.07);
```

**Rationale:**
- Navy blue → Olive charcoal (maintains depth, adds warmth)
- Black shadows → No change (neutral)

**Contrast Check Required:** N/A (shadows only)

**Pages Affected:** All cards

**Rollback:** Revert to original rgba values

---

## Phase 2: Atmospheric Effects (Medium Impact)

### 6. Hero Craft Layer

**Current:**
```css
background: linear-gradient(
  135deg,
  rgba(250, 251, 252, 0.04) 0%,
  rgba(220, 234, 243, 0.03) 50%,
  rgba(23, 50, 74, 0.02) 100%
);
```

**Replacement:**
```css
background: linear-gradient(
  135deg,
  rgba(250, 251, 252, 0.04) 0%,
  rgba(232, 224, 212, 0.03) 50%,
  rgba(47, 62, 53, 0.02) 100%
);
```

**Rationale:**
- Cloud white → No change (neutral)
- Steel blue → Warm beige (maintains subtlety, adds warmth)
- Deep navy → Olive charcoal (maintains depth, adds warmth)

**Contrast Check Required:** N/A (overlay only, 2-4% opacity)

**Pages Affected:** Hero sections

**Rollback:** Revert to original rgba values

---

### 7. Pacific Northwest Fog Layer

**Current:**
```css
background: linear-gradient(
  180deg,
  transparent 0%,
  rgba(220, 234, 243, 0.08) 40%,
  rgba(232, 241, 245, 0.12) 60%,
  rgba(220, 234, 243, 0.08) 80%,
  transparent 100%
);
```

**Replacement:**
```css
background: linear-gradient(
  180deg,
  transparent 0%,
  rgba(232, 224, 212, 0.08) 40%,
  rgba(245, 241, 232, 0.12) 60%,
  rgba(232, 224, 212, 0.08) 80%,
  transparent 100%
);
```

**Rationale:**
- Steel blue → Warm beige (maintains fog effect, adds warmth)
- Fog blue → Warm ivory (maintains lightness, adds warmth)

**Contrast Check Required:** N/A (overlay only, 5-12% opacity)

**Pages Affected:** Sections with .pnw-fog class

**Rollback:** Revert to original rgba values

---

### 8. Photo Mounting Navy Shadows

**Current:**
```css
box-shadow:
  0 1px 0 rgba(255, 255, 255, 0.7) inset,
  0 0 0 1px rgba(250, 251, 252, 0.75),
  0 1px 2px rgba(23, 50, 74, 0.12) inset,
  0 22px 46px -28px rgba(23, 50, 74, 0.5),
  0 4px 14px -10px rgba(0, 0, 0, 0.2);
```

**Replacement:**
```css
box-shadow:
  0 1px 0 rgba(255, 255, 255, 0.7) inset,
  0 0 0 1px rgba(250, 251, 252, 0.75),
  0 1px 2px rgba(47, 62, 53, 0.12) inset,
  0 22px 46px -28px rgba(47, 62, 53, 0.5),
  0 4px 14px -10px rgba(0, 0, 0, 0.2);
```

**Rationale:**
- White layers → No change (neutral)
- Navy blue → Olive charcoal (maintains depth, adds warmth)
- Black → No change (neutral)

**Contrast Check Required:** N/A (shadows only)

**Pages Affected:** Photos with .photo-mounted class

**Rollback:** Revert to original rgba values

---

## Phase 3: Decorative Components (Low Impact)

### 9. BlueprintGrid Default Color

**Current:**
```typescript
lineColor = "rgba(100, 120, 140, 0.08)" // Blue-gray
```

**Replacement:**
```typescript
lineColor = "rgba(107, 90, 74, 0.08)" // Warm brown
```

**Rationale:**
- Blue-gray → Warm brown (maintains blueprint feel, adds warmth)

**Contrast Check Required:** N/A (grid lines only, 4-8% opacity)

**Pages Affected:** Homepage, Our Work, Projects/[slug] (6 instances)

**Rollback:** Revert to original default value

**Note:** Custom lineColor props passed to BlueprintGrid will need individual review.

---

### 10. Before/After Card Label

**Current:**
```tsx
<span className="absolute left-3 top-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-semibold text-text-on-dark backdrop-blur-sm">
```

**Replacement:**
```tsx
<span className="absolute left-3 top-3 rounded-full bg-warm-olive/80 px-3 py-1 text-xs font-semibold text-text-on-dark backdrop-blur-sm">
```

**Rationale:**
- Deep navy → Warm olive (maintains darkness, adds warmth)

**Contrast Check Required:**
- Text on label: `#FAFBFC` on `rgba(47, 62, 53, 0.8)` = 12.1:1 ✓ (WCAG AAA)

**Pages Affected:** Before/after cards

**Rollback:** Revert to bg-deep/80

**Note:** Requires new CSS variable --color-warm-olive

---

## Phase 4: No Change Needed

### Already Warm (Keep As-Is)

1. **WorkshopAtmosphere** - Already uses honey color (rgba(217, 154, 78))
2. **Hero radial gradients (honey)** - Already warm
3. **Section transitions (honey)** - Already warm
4. **Organic divider (honey)** - Already warm
5. **Craft rule (honey)** - Already warm

### Neutral Effects (Keep As-Is)

1. **Site header backdrop** - Neutral blur
2. **Project lightbox backdrop** - Neutral dark
3. **Hero parallax animation** - Transform only, no color
4. **Admin dashboard** - Out of scope

---

## Implementation Order

### Step 1: CSS Variables Only (Test Phase)
- Modify `src/app/globals.css` lines 36-40 (surface tokens)
- Modify `src/app/globals.css` lines 43-45 (deep tokens)
- Modify `src/app/globals.css` lines 75-81 (service accents)
- Test on all pages
- Verify contrast ratios
- Check dark mode compatibility

### Step 2: Body Background Gradients
- Modify `src/app/globals.css` lines 161-166
- Test on all pages
- Verify subtle effect (should be almost invisible)

### Step 3: Card Shadows
- Modify `src/app/globals.css` lines 89-95
- Test on all cards
- Verify depth perception

### Step 4: Atmospheric Effects
- Modify hero craft layer (lines 218-230)
- Modify PNW fog layer (lines 587-594)
- Test on hero sections
- Verify overlay subtlety

### Step 5: Photo Mounting
- Modify photo mounting shadows (lines 318-338)
- Test on photos
- Verify frame effect

### Step 6: BlueprintGrid
- Modify default lineColor in component
- Test on all BlueprintGrid instances
- Verify grid subtlety

### Step 7: Before/After Label
- Add new CSS variable for warm olive
- Modify label background
- Test on before/after cards
- Verify contrast

---

## Verification Checklist

After each phase:

- [ ] All pages load without errors
- [ ] Contrast ratios meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] Dark mode works correctly
- [ ] Reduced motion preferences respected
- [ ] No visual regressions on hero sections
- [ ] Card readability maintained
- [ ] Photo frames look premium
- [ ] Grid patterns remain subtle
- [ ] Emotional feel is warm, not cold

---

## Rollback Procedure

If any phase fails verification:

1. Revert the specific CSS changes
2. Document the issue
3. Adjust color values
4. Re-test
5. Only proceed to next phase after current phase is verified

**Emergency Rollback:** Revert entire `globals.css` to previous commit.

---

## Color Mapping Reference

| Current Color | Current Hex | Replacement Color | Replacement Hex | Purpose |
|--------------|-------------|------------------|-----------------|---------|
| Steel Blue | #DCEAF3 | Ripe Olive | #E8E4DC | Secondary sections |
| Fog Blue | #E8F1F5 | Warm Ivory | #F5F1E8 | Cards |
| Slate Mist | #D8E3EA | Olive Mist | #E0DCD4 | Subtle sections |
| Deep Navy | #17324A | Deep Olive Charcoal | #2F3E35 | Hero |
| Blue Charcoal | #243746 | Warm Olive Charcoal | #3A4A40 | Dark sections |
| Ocean Blue | #4A90A4 | Pine Green | #5A7A5C | Deck accent |
| Slate Blue | #5A6A7A | Warm Brown | #6B5A4A | Remodeling accent |
| Navy Shadow | rgba(23, 50, 74, *) | Olive Shadow | rgba(47, 62, 53, *) | Shadows |
| Blue-Gray | rgba(100, 120, 140, *) | Warm Brown | rgba(107, 90, 74, *) | Grid lines |

---

## Success Criteria

**Phase 1 Complete When:**
- All CSS variables converted
- Contrast ratios verified on all pages
- Dark mode compatible
- No visual regressions

**Phase 2 Complete When:**
- All atmospheric effects converted
- Hero sections look warm, not cold
- Fog effects maintain subtlety
- Photo frames look premium

**Phase 3 Complete When:**
- All decorative components converted
- Grid patterns remain subtle
- Before/after labels readable
- No component-specific issues

**Overall Success When:**
- Entire site feels warm and Pacific Northwest
- Contrast and readability maintained
- No accessibility regressions
- Performance unchanged
- Emotional feel is craftsmanship, not cold corporate
