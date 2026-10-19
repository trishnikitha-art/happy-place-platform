# HPP Homepage Hero & First Impression Audit
**Date:** 2026-10-18  
**Scope:** Homepage hero section, layout, typography, animation, and first impression  
**Mode:** READ-ONLY AUDIT  
**Repository:** trishnikitha-art/happy-place-platform  
**Route:** `/` (homepage)

---

## Executive Summary

The HPP homepage hero demonstrates sophisticated architecture with media authority integration, but the visual execution has opportunities for improvement. The hero uses a workshop atmosphere particle effect, but it's extremely subtle (2-10% opacity) and may not contribute meaningfully to the first impression. The hero follows photography-first principles but could benefit from more cinematic presentation and stronger visual hierarchy.

**Score:** 3/5 (Competent)  
**Evidence:** Source code inspection of <ref_file file="/c/Users/nolan/happy-place-platform/website/src/app/page.tsx" lines="98-170" />

---

## 1. Hero Architecture

### Media Authority Integration
**Status:** ✅ Sophisticated

The hero uses the constitutional media authority system:

```typescript
// From brand.ts
export async function getHomepageHero(): Promise<BrandHero | null> {
  // 1. Check runtime assignment store (Workbench manual assignments)
  // 2. Fall back to static configuration from brand.v1.json
  // 3. Resolve through public media gate (rejects Drive references)
  // 4. Return resolved Media object with variants
}
```

**Strengths:**
- Runtime assignment support (Workbench can override hero)
- Static fallback configuration (brand.v1.json)
- Public media gate enforcement (no Drive references exposed)
- Responsive variant selection (webp, original, blur placeholders)
- Comprehensive logging for debugging

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/lib/brand.ts" lines="55-177" />

### Configuration
**From brand.v1.json:**
```json
{
  "homepageHero": {
    "id": "homepage-hero-canonical",
    "mediaId": "homepage-hero",
    "alt": "Photograph of a completed deck project showing quality carpentry work with warm wood tones and clean construction",
    "fallback": {
      "gradient": true,
      "overlay": true
    }
  }
}
```

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/config/brand.v1.json" lines="4-12" />

---

## 2. Hero Layout & Composition

### Current Implementation
**From page.tsx (lines 98-170):**

```typescript
<section className="relative isolate overflow-hidden bg-deep text-text-on-dark">
  <WorkshopAtmosphere particleCount={20} />
  <VisualSlot id="hero-background" ...>
    {heroMedia && heroSrc ? (
      <Image
        src={heroSrc}
        alt={heroMedia.alt || "..."}
        fill
        priority
        sizes="100vw"
        placeholder={heroMedia.variants?.blur ? 'blur' : 'empty'}
        blurDataURL={heroMedia.variants?.blur}
        className="object-cover"
        style={{ filter: "brightness(0.7)" }}
      />
    ) : null}
  </VisualSlot>
  <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
  
  <Container className="relative z-10 flex min-h-[75svh] sm:min-h-[82svh] lg:min-h-[88svh] flex-col justify-center">
    <div className="max-w-3xl">
      <p className="font-signature text-xl sm:text-2xl ...">
        <HappyBrandSignature /> Place Carpentry
      </p>
      <h1 className="mt-4 sm:mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold ...">
        <TextCopy textKey="homepage.hero.title" />
      </h1>
      <p className="measure mt-5 sm:mt-7 max-w-xl text-base sm:text-lg ...">
        <TextCopy textKey="homepage.hero.description" />
      </p>
      <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
        <Link href="/contact" className="cta-signature ...">
          <TextCopy textKey="homepage.hero.primaryAction" />
        </Link>
        <Link href="/our-work" className="...">
          <TextCopy textKey="homepage.hero.secondaryAction" />
        </Link>
      </div>
      <div className="mt-6 sm:mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 ...">
        {/* Trust indicators */}
      </div>
      <span className="mt-5 sm:mt-7 block font-signature text-2xl sm:text-3xl text-honey">
        <TextCopy textKey="home.copy.2" />
      </span>
    </div>
  </Container>
</section>
```

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/app/page.tsx" lines="98-170" />

### Composition Analysis

**Positive Aspects:**
1. **Full-viewport height** - Uses viewport units (75svh, 82svh, 88svh) for responsive sizing
2. **Priority loading** - Hero image has `priority` prop for immediate loading
3. **Blur placeholder** - Uses blurDataURL for progressive enhancement
4. **Gradient overlay** - Three-layer gradient (black/40 → black/20 → black/60) for text readability
5. **Brightness adjustment** - `filter: brightness(0.7)` ensures text contrast
6. **Responsive typography** - Text scales from 4xl → 5xl → 6xl across breakpoints
7. **Measure constraint** - `max-w-xl` for optimal line length (~65 characters)
8. **Signature CTA** - Honey-colored CTA with shadow-warm effect

**Areas for Improvement:**
1. **WorkshopAtmosphere particle effect** - Extremely subtle (2-10% opacity), slow movement, may not contribute meaningfully to first impression
2. **Text hierarchy** - Brand signature appears above main heading, may compete for attention
3. **Mobile spacing** - Typography scaling could be more aggressive on small screens
4. **Cascading trust indicators** - Multiple elements below CTAs may dilute focus
5. **No parallax or subtle motion** - Hero image is static (no parallax drift)
6. **No visual slot animation** - VisualSlot is present but no entry animation

---

## 3. Animation & Motion System

### WorkshopAtmosphere Component
**Analysis:**

```typescript
// Particle configuration
particleCount = 20
vx = (Math.random() - 0.5) * 0.2  // Very slow horizontal
vy = (Math.random() - 0.5) * 0.15 // Very slow vertical
size = Math.random() * 2 + 0.5    // Small particles (0.5-2.5px)
opacity = Math.random() * 0.08 + 0.02  // Extremely low (2-10%)
color = rgba(217, 154, 78, opacity)  // Honey color
```

**Characteristics:**
- **Very subtle** - 2-10% opacity means particles are barely visible
- **Slow movement** - 0.15-0.2 velocity means minimal drift
- **Small size** - 0.5-2.5px particles
- **Honey color** - Brand accent color, warm
- **Reduced motion support** - Respects `prefers-reduced-motion`

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/components/workshop-atmosphere.tsx" lines="1-131" />

**Assessment:**
The WorkshopAtmosphere is so subtle that it may not be noticeable to most users. While this aligns with the "quiet, confident" design principle, it may not contribute meaningfully to the first impression. For a "10,000x animations" goal, this effect could be:

1. **Made more visible** - Increase opacity to 8-15% range
2. **Larger particles** - Increase size to 2-4px
3. **More movement** - Increase velocity slightly
4. **Layered depth** - Add a second layer with different speeds for parallax
5. **Context-aware** - Different particle effects for different sections

### Global CSS Animations
**From globals.css:**

```css
/* Hero parallax layer - subtle slow drift on the background photo */
@media (prefers-reduced-motion: no-preference) {
  .hero-parallax {
    will-change: transform;
    animation: heroDrift 37s ease-in-out infinite alternate;
  }
  @keyframes heroDrift {
    from { transform: scale(1.06) translateY(0); }
    to { transform: scale(1.12) translateY(-2.5%); }
  }
}
```

**Finding:** The `.hero-parallax` class is defined in CSS but **not applied** to the hero image in page.tsx. The hero image is static.

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/app/globals.css" lines="539-552" />

### NavShimmer Effect
**From site-header.tsx:**

```typescript
<NavShimmer>
  {navigationTextKey(item.href) ? <TextCopy ... /> : item.label}
</NavShimmer>
```

**Characteristics:**
- Gold gradient text (A67C00 → D99A4E → E7AD63 → F0C070)
- Hover state: scale-[1.01], brightness increase
- Shimmer sweep animation (white/15 traveling left to right)
- Slow shimmer (53s) when not hovered
- Fast shimmer (1s) when hovered

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/components/site-header.tsx" lines="20-62" />

**Assessment:** This is a well-executed, subtle animation that adds premium feel without distraction. The slow idle shimmer creates a "living" brand signature, while the fast hover shimmer provides immediate feedback.

---

## 4. Typography & Visual Hierarchy

### Typography Scale
**Hero section:**
- Brand signature: text-xl (desktop) → text-2xl (mobile)
- Main heading: text-4xl (mobile) → text-5xl (tablet) → text-6xl (desktop)
- Description: text-base (mobile) → text-lg (desktop)
- Trust indicators: text-xs (mobile) → text-sm (desktop)
- Bottom signature: text-2xl (mobile) → text-3xl (desktop)

**Typography variables:**
```css
--font-display: "Playfair Display", Georgia, "Times New Roman", serif;
--font-signature: "Playball", cursive;
--leading-display: 1.15;
--leading-body: 1.6;
--tracking-display: -0.02em;
--tracking-body: 0.01em;
```

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/app/globals.css" lines="122-135" />

**Assessment:**
Typography is well-considered with:
- Distinctive display font (Playfair Display)
- Signature font for brand (Playball)
- Tight leading for headings (1.15)
- Comfortable leading for body (1.6)
- Slight letter-spacing reduction for display (-0.02em)
- Slight increase for body readability (0.01em)

**Improvement opportunity:**
- The brand signature ("Happy Place Carpentry") appears **above** the main heading, which may compete for attention
- Consider moving brand signature below heading or making it more subtle
- Main heading could be larger on mobile (currently 4xl, could be 5xl)

---

## 5. Color & Contrast

### Hero Background
```css
bg-deep: #44483D (ripe olive)
text-text-on-dark: #FAFBFC (near-white)
```

### Gradient Overlay
```css
from-black/40 via-black/20 to-black/60
```

### CTA Colors
```css
cta-signature:
  background: var(--color-honey) #d99a4e
  color: var(--color-honey-foreground) #1c1917
  shadow-warm: 0 1px 6px -2px rgba(217, 154, 78, 0.25)
```

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/app/globals.css" lines="31-39, 58-60, 94-96" />

**Assessment:**
Color contrast is well-executed:
- Dark background (#44483D) with near-white text (#FAFBFC)
- Gradient overlay ensures text readability over any photo
- Honey CTA (#d99a4e) provides warm accent with good contrast
- Warm shadow adds depth without distraction

**Improvement opportunity:**
- Hero image has `filter: brightness(0.7)` which may be too dark
- Consider `brightness(0.8)` or `brightness(0.85)` for more vibrant hero
- Test contrast ratios against WCAG AA/AAA standards

---

## 6. Mobile Experience

### Responsive Breakpoints
**Viewport height:**
- Mobile: 75svh
- Tablet: 82svh
- Desktop: 88svh

**Typography:**
- Brand signature: text-xl → text-2xl
- Main heading: text-4xl → text-5xl → text-6xl
- Description: text-base → text-lg

**Container:**
- `max-w-3xl` for text content
- Full-width for background image

**Evidence:** <ref_file file="/c/Users/nolan/happy-place-platform/website/src/app/page.tsx" lines="128-169" />

**Assessment:**
Mobile experience is competent:
- Viewport-based sizing (svh) adapts to screen height
- Typography scales appropriately
- Text remains constrained to readable line length
- Full-width background image works well on mobile

**Improvement opportunity:**
- Main heading could be larger on mobile (4xl → 5xl)
- CTA buttons could be larger on mobile (currently min-h-11 could be min-h-12)
- Trust indicators may be too small on mobile (text-xs)

---

## 7. First Impression Analysis

### What Visitors See First
1. **Full-screen hero image** (with 0.7 brightness filter)
2. **Brand signature** ("Happy Place Carpentry" in Playball font)
3. **Main heading** (in Playfair Display)
4. **Description** (measure-constrained, ~65 characters)
5. **Two CTAs** (primary honey, secondary outlined)
6. **Trust indicators** (projects completed, CCB number, service area)
7. **Bottom signature** (in Playball)

### Current Strengths
1. **Photography-first** - Hero image dominates the screen
2. **Clear CTAs** - Primary honey CTA stands out
3. **Trust signals** - Projects completed, CCB number, service area visible
4. **Brand identity** - Signature fonts, honey accent, cedar corner
5. **Responsive design** - Adapts well to different screen sizes

### Current Weaknesses
1. **Brand signature placement** - Appears above heading, may compete for attention
2. **Subtle particle effect** - WorkshopAtmosphere too subtle to notice
3. **No hero motion** - Hero image is static (parallax not applied)
4. **Cascading elements** - Multiple trust indicators may dilute focus
5. **Brightness filter** - May be too dark (0.7 brightness)

---

## 8. Comparison with External References

### Reference: Apple.com
**What Apple does:**
- Cinematic product hero with large, high-quality imagery
- Subtle scroll-triggered animations
- Clear hierarchy: product name → tagline → CTAs
- Minimal text, maximum visual impact

**What HPP can learn:**
- Increase hero image brightness for more vibrant presentation
- Reduce number of elements below CTAs (simplify trust indicators)
- Consider scroll-triggered hero reveal animation
- Make brand signature more subtle or move below heading

### Reference: Stripe.com
**What Stripe does:**
- Bold typography with tight leading
- Clear information hierarchy
- Subtle gradients and shadows
- Purposeful motion (not excessive)

**What HPP can learn:**
- Typography is already well-executed (similar approach)
- Could benefit from bolder heading on mobile
- Gradient overlay is good, could be more refined
- Purposeful motion aligns with HPP philosophy

### Reference: Awwwards winners (contractor category)
**What award-winning contractor sites do:**
- Before/after hero transformation
- Project-led hero (best transformation first)
- Cinematic video backgrounds
- Immersive 3D elements (occasionally)

**What HPP can learn:**
- Consider before/after hero transformation
- Ensure hero photo is the absolute best transformation
- Video background could be option (but may not suit brand)
- 3D is likely overkill for carpentry

---

## 9. Specific Recommendations

### P0 (Critical) - None
The hero is functional and accessible. No critical blockers.

### P1 (High Value)

**1. Increase Hero Image Brightness**
- **Current:** `filter: brightness(0.7)`
- **Proposed:** `filter: brightness(0.85)`
- **Rationale:** More vibrant hero, better showcases craftsmanship
- **Risk:** May reduce text contrast (test with gradient overlay)
- **Implementation:** Single line change in page.tsx line 122
- **Acceptance:** Text remains readable, hero more vibrant

**2. Apply Hero Parallax Animation**
- **Current:** Hero image static
- **Proposed:** Add `.hero-parallax` class to hero image
- **Rationale:** Subtle motion adds polish without distraction
- **Risk:** May cause performance issues on low-end devices
- **Implementation:** Add className to Image component in page.tsx
- **Acceptance:** Smooth parallax effect, respects reduced-motion preference

**3. Simplify Trust Indicators**
- **Current:** Projects completed, CCB number, service area all visible
- **Proposed:** Show projects completed + CCB number, hide service area
- **Rationale:** Reduce visual noise, focus on most important signals
- **Risk:** May reduce local relevance signal
- **Implementation:** Modify lines 161-165 in page.tsx
- **Acceptance:** Trust indicators remain prominent, cleaner layout

### P2 (Differentiation)

**4. Enhance WorkshopAtmosphere**
- **Current:** 2-10% opacity, 0.5-2.5px particles, very slow movement
- **Proposed:** 8-15% opacity, 2-4px particles, slightly faster movement
- **Rationale:** Make effect more noticeable, contribute to "workshop" atmosphere
- **Risk:** May become distracting if too visible
- **Implementation:** Modify particle configuration in workshop-atmosphere.tsx
- **Acceptance:** Particles visible but subtle, adds atmosphere without distraction

**5. Add Hero Entry Animation**
- **Current:** Hero fades in immediately
- **Proposed:** Staggered entry (image → heading → description → CTAs)
- **Rationale:** More cinematic first impression
- **Risk:** May delay ability to scroll or interact
- **Implementation:** Add Framer Motion or CSS animations to hero section
- **Acceptance:** Smooth entry, respects reduced-motion preference

**6. Rebrand Signature Placement**
- **Current:** Brand signature above main heading
- **Proposed:** Move brand signature below heading or make more subtle
- **Rationale:** Reduce competition for attention, emphasize main heading
- **Risk:** May reduce brand recognition
- **Implementation:** Reorder DOM elements in page.tsx or adjust styling
- **Acceptance:** Brand identity remains clear, heading more prominent

### P3 (Experimental)

**7. Before/After Hero Transformation**
- **Current:** Static hero image
- **Proposed:** Interactive before/after slider in hero
- **Rationale:** Dramatic showcase of craftsmanship
- **Risk:** May complicate hero, reduce CTA clarity
- **Implementation:** Integrate BeforeAfterSlider component into hero
- **Acceptance:** Transformation clear, CTAs remain accessible

**8. Video Background**
- **Current:** Static image
- **Proposed:** Short video loop of project
- **Rationale:** More dynamic, shows craftsmanship in action
- **Risk:** Large file size, performance impact, may not suit brand
- **Implementation:** Replace Image with video element
- **Acceptance:** Video loads quickly, respects reduced-motion preference

---

## 10. Implementation Dependencies

### P1 Recommendations
- **Increase brightness:** No dependencies, single line change
- **Apply parallax:** No dependencies, class already defined in CSS
- **Simplify trust indicators:** No dependencies, DOM modification

### P2 Recommendations
- **Enhance WorkshopAtmosphere:** No dependencies, config change
- **Add hero entry animation:** May require Framer Motion (already installed)
- **Rebrand signature placement:** No dependencies, DOM/styling change

### P3 Recommendations
- **Before/After hero:** Uses existing BeforeAfterSlider component
- **Video background:** Requires video production, not currently available

---

## 11. Expected Benefits & Measurement

### P1 Benefits
- **Increased brightness:** More vibrant hero, better showcases craftsmanship
  - **Measurement:** Visual inspection, user feedback
- **Applied parallax:** Subtle motion adds polish
  - **Measurement:** User perception, motion preference respect
- **Simplified trust indicators:** Cleaner layout, better focus
  - **Measurement:** CTA click-through rate, user testing

### P2 Benefits
- **Enhanced WorkshopAtmosphere:** More noticeable atmosphere effect
  - **Measurement:** User perception, brand perception
- **Hero entry animation:** More cinematic first impression
  - **Measurement:** Time to first CTA, user engagement
- **Rebranded signature placement:** Better hierarchy
  - **Measurement:** User attention heatmap, brand recognition

### P3 Benefits
- **Before/After hero:** Dramatic transformation showcase
  - **Measurement:** Engagement time, social shares
- **Video background:** Dynamic presentation
  - **Measurement:** Engagement time, bounce rate

---

## 12. Accessibility, Performance, Maintenance, Content Risks

### Accessibility Risks
- **Increased brightness:** May reduce text contrast (test with gradient overlay)
- **Hero entry animation:** May delay keyboard navigation (respect reduced-motion)
- **Before/After hero:** Must ensure keyboard-accessible controls

### Performance Risks
- **Hero parallax:** May cause layout shift or jank on low-end devices
- **Enhanced WorkshopAtmosphere:** More particles = more CPU
- **Video background:** Large file size, bandwidth impact

### Maintenance Risks
- **Hero entry animation:** Adds complexity to hero component
- **Before/After hero:** Requires maintaining before/after assets
- **Video background:** Requires video production, encoding, optimization

### Content Risks
- **Simplified trust indicators:** May reduce local relevance signal
- **Rebranded signature placement:** May reduce brand recognition
- **Before/After hero:** Requires high-quality before/after assets

---

## 13. Acceptance Criteria

### P1 Recommendations
- [ ] Hero image brightness increased to 0.85
- [ ] Text remains readable with new brightness
- [ ] Hero parallax animation applied and smooth
- [ ] Trust indicators simplified (projects + CCB only)
- [ ] Reduced-motion preference respected

### P2 Recommendations
- [ ] WorkshopAtmosphere particles more visible (8-15% opacity)
- [ ] Hero entry animation smooth and staggered
- [ ] Brand signature placement optimized
- [ ] All animations respect reduced-motion preference

### P3 Recommendations
- [ ] Before/After hero transformation functional
- [ ] Video background loads quickly and respects reduced-motion
- [ ] All experimental features have performance budgets

---

## 14. Independent vs Dependent

### Independent Changes
- Increase hero brightness (independent)
- Apply hero parallax (independent)
- Simplify trust indicators (independent)
- Enhance WorkshopAtmosphere (independent)
- Rebrand signature placement (independent)

### Dependent Changes
- Hero entry animation (may depend on Framer Motion configuration)
- Before/After hero (depends on BeforeAfterSlider component)
- Video background (depends on video production, encoding pipeline)

---

## 15. Next Steps

1. **Immediate:** Implement P1 recommendations (brightness, parallax, trust indicators)
2. **Short-term:** Implement P2 recommendations (WorkshopAtmosphere, entry animation, signature placement)
3. **Medium-term:** Evaluate P3 recommendations (before/after hero, video background)
4. **Ongoing:** Monitor performance, accessibility, and user feedback

---

## 16. Scorecard

| Dimension | Score | Evidence | Confidence | Highest-Value Improvement |
|-----------|-------|----------|------------|---------------------------|
| Visual identity | 4/5 | Brand tokens, typography system | High | Rebrand signature placement |
| Hero quality | 3/5 | Source inspection, CSS analysis | High | Increase brightness, apply parallax |
| Photography | 3/5 | Media authority integration | High | Increase brightness for vibrancy |
| First impression | 3/5 | Composition analysis | Medium | Simplify trust indicators |
| Animation | 2/5 | WorkshopAtmosphere too subtle | High | Enhance particles, add entry animation |
| Mobile experience | 3/5 | Responsive breakpoints | High | Larger heading on mobile |
| Accessibility | 4/5 | Reduced-motion support | High | Test contrast with new brightness |
| Performance | 4/5 | Priority loading, blur placeholders | High | Monitor parallax performance |

**Overall Score:** 3.25/5 (Competent)

---

## 17. Conclusion

The HPP homepage hero demonstrates sophisticated architecture with media authority integration, but the visual execution has opportunities for improvement. The hero follows photography-first principles but could benefit from:

1. **More vibrant presentation** (increase brightness from 0.7 to 0.85)
2. **Subtle motion** (apply parallax animation, enhance WorkshopAtmosphere)
3. **Better hierarchy** (simplify trust indicators, rebrand signature placement)
4. **Cinematic entry** (add staggered entry animation)

The hero is functional and accessible (no P0 issues), but P1 and P2 improvements would significantly enhance the first impression and contribute to the "10,000x animations" goal while preserving business outcomes.

**Next:** Continue with project gallery audit.
