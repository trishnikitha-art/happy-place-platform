# PHASE 1A: GIT FORENSIC ANALYSIS — SCROLL-RELATED COMMITS

## CEO MODE: SYSTEMATIC DEBUGGING INVESTIGATION

**Status:** ⚠️ ARCHITECTURAL CONFLICTS IDENTIFIED

---

## GIT FORENSIC FINDINGS

### Scroll-Related Commit History (Selected Commits)

| Commit | Date | Change | Assessment |
|--------|------|--------|------------|
| 9844e5f | 2026-07-20 | Work-page gate investigation | 🔴 IDENTIFIED COMPETING SYSTEMS |
| 39163bc | 2026-07-27 | Fix touchpad scroll bug - adjust Lenis configuration | ⚠️ ANOTHER LENIS PATCH |
| e5fbcf7 | 2026-07-26 | Remove Lenis wheel/touch multipliers | ⚠️ REVERTED PREVIOUS FIX |
| a18392b | Phase X: Animation Lifecycle Audit - Fix LenisProvider RAF leak | ⚠️ RAF LEAK FIXED |
| decc7ab | Disable Lenis to test if it's the root cause of scroll lag | ⚠️ NATIVE SCROLL TEST |
| 305d901 | Remove all CSS gradients to confirm they are the root cause of scroll lag | ⚠️ GRADIENT ELIMINATION |
| b27331b | Disable html scroll-behavior smooth to avoid Lenis conflict | ⚠️ SCROLL CONFLICT ACKNOWLEDGED |
| 36dab3e | Fix touchpad scroll + enforce one pending assignment per slot + disable Lenis touch handling | ⚠️ TOUCH HANDLING PATCH |
| c2cf5a1 | Complete Drive and Shared Drive media workbench + exclude Workbench from Lenis | ⚠️ WORKBENCH EXCLUSION |

### Pattern Analysis

**Pattern:** Repeated Lenis tuning without architectural resolution

**Evidence:**
- 39163bc: Adjusted duration (1.2 → 0.8)
- e5fbcf7: Removed multipliers (removed, then re-added in 39163bc)
- 36dab3e: Disabled Lenis touch handling
- Multiple commits: Lenis enabled/disabled for testing
- Multiple commits: Gradient adjustments for scroll lag

**Assessment:** ⚠️ SYMPTOMATIC TUNING
- Repository has been tuning Lenis repeatedly
- No architectural resolution of scroll ownership
- Pattern suggests competing scroll systems

---

## CURRENT ARCHITECTURAL STATE

### Competing Scroll Systems Identified

**System 1: Lenis (Global smooth scroll)**
- Component: `src/components/lenis-provider.tsx`
- Configuration: lerp 0.25, duration 0.8, wheelMultiplier 1.0, touchMultiplier 1.0
- Exclusion: Disabled for `/workbench` routes
- Scope: Global application (except workbench)

**System 2: ScrollToTop (Route transition scroll reset)**
- Component: `src/components/scroll-to-top.tsx`
- Implementation: `window.scrollTo({ top: 0, left: 0, behavior: "instant" })`
- Trigger: `useEffect` on pathname change
- Scope: Global application
- **CONFLICT:** Writes native scroll state while Lenis owns virtual scroll state

**System 3: ScrollReveal (Viewport-based reveal animations)**
- Component: `src/components/scroll-reveal.tsx`
- Implementation: Framer Motion `whileInView` with `motion.div`
- Configuration: `viewport={{ once: true, margin: "-50px" }}`
- Scope: Used in `/our-work` page (5 instances)
- **CONFLICT:** Establishes viewport observers independent of Lenis

**System 4: BeforeAfterSlider (Interactive touch surface)**
- Component: `src/components/before-after-slider.tsx`
- Location: First section after hero in `/our-work`
- Implementation: `onMouseDown`, `onTouchStart`, `onTouchMove`
- Scope: First interactive content in scroll path
- **CONFLICT:** Interactive pointer surface at scroll initialization

---

## ARCHITECTURAL CONFLICT ANALYSIS

### 🔴 CONFLICT 1: ScrollToTop + Lenis Ownership

**ScrollToTop Implementation:**
```typescript
// src/components/scroll-to-top.tsx
useEffect(() => {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}, [pathname]);
```

**Lenis Initialization:**
```typescript
// src/components/lenis-provider.tsx
useEffect(() => {
  const lenisInstance = new Lenis({
    lerp: 0.25,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.0,
    duration: 0.8,
  });
  // ... RAF loop
}, [pathname]);
```

**Conflict:**
- ScrollToTop writes native scroll position directly
- Lenis owns virtual scroll position and interpolation
- Both triggered on pathname change
- Race condition: Which one wins the first scroll?

**Assessment:** 🔴 HIGH RISK
- Architectural contradiction with "only one system may control page scroll"
- Most likely root cause of first-scroll failure
- CEO directive: "prove whether ScrollToTop is writing native scroll state while Lenis owns virtual scroll state"

---

### 🔴 CONFLICT 2: ScrollReveal Overuse in /our-work

**Usage Count:** 5 ScrollReveal instances in `/our-work`

**Featured Transformations:**
```typescript
{featuredProjects.slice(0, 4).map((project, i) => (
  <ScrollReveal key={project.id} delay={i * 60}>
    <BeforeAfterSlider project={project} />
  </ScrollReveal>
))}
```

**Recent Projects:**
```typescript
{allProjects.map((project, i) => (
  <ScrollReveal key={project.id} delay={i * 60}>
    // Project card
  </ScrollReveal>
))}
```

**ScrollReveal Implementation:**
```typescript
// src/components/scroll-reveal.tsx
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: "-50px" }}
  variants={variants[direction]}
  transition={{ delay }}
  onAnimationStart={() => console.log('[SCROLL-REVEAL] ANIMATION_START')}
  onAnimationComplete={() => console.log('[SCROLL-REVEAL] ANIMATION_COMPLETE')}
>
```

**Conflict:**
- Establishes 5 independent Framer Motion viewport observers
- Each observer triggers on scroll
- Heavy console logging in production
- Creates scroll-dependent system independent of Lenis

**Assessment:** 🔴 MEDIUM RISK
- Overuse of ScrollReveal creates many viewport observers
- Production console logging is terrible for scroll-sensitive page
- Synchronizes with Lenis implicitly

---

### 🔴 CONFLICT 3: BeforeAfterSlider at First Scroll Position

**Location:** First section after hero in `/our-work`

**Implementation:**
```typescript
// src/components/before-after-slider.tsx
// Has pointer/touch handlers
```

**Conflict:**
- First interactive surface in scroll path
- Maintains drag state
- Does not call preventDefault()
- Creates gesture ambiguity at scroll initialization

**Assessment:** 🔴 MEDIUM RISK
- First scrollable content is interactive
- Lenis + first viewport + Framer Motion + interactive surface = too many scroll-adjacent owners
- CEO directive: "Before/After pointer surface at the exact top of the scroll path"

---

## HISTORICAL REGRESSION PATTERN

### Lenis Tuning History

| Commit | Change | Reason | Result |
|--------|--------|--------|--------|
| e5fbcf7 | Removed multipliers | Touchpad stopping at cards | Reverted in 39163bc |
| 39163bc | Re-added multipliers + reduced duration | Touchpad stopping at cards | Current state |
| 36dab3e | Disabled Lenis touch handling | Touchpad conflict | Current state? |
| decc7ab | Disabled Lenis entirely | Test native scroll | Re-enabled |

**Assessment:** ⚠️ SYMPTOMATIC TUNING
- Repository has been repeatedly tuning Lenis configuration
- No architectural resolution of scroll ownership
- Pattern suggests root cause is architectural, not configuration

---

## WORK-PAGE GATE STATUS

### Previous Audit (9844e5f)

**Status:** 🔴 NOT PASSED

**Findings:**
- Issue 1: Outdated Lenis package (@studio-freight/lenis 1.0.42 vs modern lenis)
- Issue 2: Competing scroll/animation systems (Lenis, ScrollReveal, IntersectionObserver, Framer Motion, etc.)
- Issue 3: ScrollReveal suspicious - substantial client work for image galleries
- Issue 4: Framer Motion + Lenis ownership model conflict
- Issue 5: ScrollToTop transition conflict with Lenis internal state
- Issue 6: Before/after slider touch/drag collision with Lenis
- Issue 7: Masonry + lazy images layout shift during scroll

**Conclusion:** "Work-page gate: NOT PASSED - requires architectural unification before Lenis fixes."

**Current Status:** ⚠️ NEVER FOLLOWED THROUGH
- Audit was documented but not executed
- No architectural unification occurred
- Scroll bug remains unresolved

---

## CEO MODE ASSESSMENT

**Git Forensic Status:** 🔴 COMPETING SCROLL SYSTEMS CONFIRMED

**Evidence:**
- ScrollToTop writes native scroll state while Lenis owns virtual scroll state
- ScrollReveal establishes 5 independent viewport observers
- BeforeAfterSlider is interactive surface at first scroll position
- Historical pattern of Lenis tuning without architectural resolution
- Work-page gate was marked NOT PASSED and never followed through

**Most Likely Root Cause:** 🔴 SCROLLTOTOP + LENIS OWNERSHIP CONFLICT

**CEO Directive:** "prove whether ScrollToTop is writing native scroll state while Lenis owns virtual scroll state. If yes, determine whether that race explains the first-scroll failure rather than merely correlating with it."

---

## NEXT PHASE: SYSTEMATIC DEBUGGING PLAN

### Phase 1B: Instrument Boundaries

**Goal:** Record scroll state before changing behavior

**Instrumentation Required:**
- window.scrollY
- Lenis scroll
- Lenis animatedScroll
- Lenis targetScroll
- Lenis limit
- document scrollHeight
- document.documentElement.clientHeight
- main height
- First wheel event timestamp/delta
- Whether ScrollToTop fires before or after Lenis initialization
- Whether pathname navigation recreates Lenis
- Whether streamed page changes document height after initialization
- Whether first wheel event reaches Lenis
- Whether browser's native scroll position changes

### Phase 1C: Test Competing Hypotheses

**Hypothesis A — Native scroll with Lenis disabled**
- Disable Lenis
- Test /our-work scroll behavior
- Result: If native scroll works, Lenis is involved

**Hypothesis B — Lenis enabled but ScrollToTop disabled**
- Remove ScrollToTop component
- Test /our-work scroll behavior
- Result: If scroll works, ScrollToTop is the conflict

**Hypothesis C — Lenis enabled with ScrollReveal disabled**
- Remove ScrollReveal from /our-work
- Test /our-work scroll behavior
- Result: If scroll works, ScrollReveal is involved

**Hypothesis D — Lenis enabled with BeforeAfterSlider removed from initial section**
- Remove BeforeAfterSlider from first section
- Test /our-work scroll behavior
- Result: If scroll works, interactive surface is involved

**Hypothesis E — content-visibility:auto disabled**
- Disable content-visibility:auto for .gallery-grid
- Test /our-work scroll behavior
- Result: If scroll works, layout containment is involved

**Hypothesis F — Lenis package modernization**
- Investigate @studio-freight/lenis → lenis migration
- Test modern package
- Result: If modern package works, old package is involved

---

## STOP CONDITION

**CEO Directive:** "STOP after Phase 1 and report: ROOT CAUSE: one specific mechanism, or explicitly 'not yet proven'. EVIDENCE: exact code path + runtime measurements. FAILED HYPOTHESES: what was tested and ruled out. REMAINING UNCERTAINTY: only what genuinely cannot be observed."

**Current Status:** Phase 1A (Git forensics) complete. Proceeding to Phase 1B (instrumentation) and Phase 1C (hypothesis testing).

**DO NOT:** Make any fixes, commits, or visual changes. Only diagnostic instrumentation and hypothesis testing.
