# PHASE 1G: CURRENT IMPLEMENTATION AUDIT

## CEO MODE — EXACT SCROLL ARCHITECTURE INVENTORY

**Status:** ✅ REVERTED TO DIAGNOSTIC BASELINE (d8ef6bd ≈ 2a9ebe4)

---

## GIT STATE

**Current HEAD:** `d8ef6bd` (Revert of c69dc8f)
**Equivalent to:** `218cafb` (precise transition diagnostics)
**Diagnostic Baseline:** `2a9ebe4` (deployment READY)
**Rejected Fix:** `c69dc8f` (deployment ERROR)

**Status:** ✅ Back to diagnostic baseline, ready for forensic inspection

---

## EVERY ACTUAL SCROLL WRITER

### 1. ScrollToTop (Native Scroll Writer)

**Location:** `src/components/scroll-to-top.tsx`

**Implementation:**
```typescript
useEffect(() => {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}, [pathname]);
```

**Trigger:** Next.js pathname change
**Scope:** Global application
**Authority:** Native browser scroll state
**Target:** window object

**Effect Order:** Child component (runs before parent LenisProvider)

---

### 2. Lenis (Virtual Scroll Writer)

**Location:** `src/components/lenis-provider.tsx`

**Implementation:**
```typescript
const lenisInstance = new Lenis({
  lerp: 0.25,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.0,
  duration: 0.8,
});

// RAF loop updates scroll state
function raf(time: number) {
  lenisInstance.raf(time);
  frameId = requestAnimationFrame(raf);
}
```

**Trigger:** Initialized on mount, runs continuously via RAF
**Scope:** Global application (except workbench)
**Authority:** Virtual scroll interpolation
**Target:** window object (default wrapper)

**Effect Order:** Parent component (runs after child ScrollToTop)

---

## EVERY LENIS STATE WRITER

### 1. Lenis Initialization

**Writer:** LenisProvider useEffect
**Action:** Creates new Lenis instance with configuration
**Frequency:** On every pathname change (due to [pathname] dependency)

### 2. Lenis RAF Loop

**Writer:** LenisProvider raf function
**Action:** Updates virtual scroll state every frame
**Frequency:** 60fps (or display refresh rate)

### 3. Lenis Event Handlers

**Writer:** Lenis internal event system
**Actions:**
- wheel events → update target scroll
- touch events → update target scroll
- scroll events → update actual scroll
**Frequency:** On user interaction

---

## EVERY ROUTE TRANSITION MECHANISM

### 1. Next.js Pathname Change

**Mechanism:** `usePathname()` hook
**Component Affected:** ScrollToTop, LenisProvider
**Effect Triggers:**
- ScrollToTop: useEffect on [pathname]
- LenisProvider: useEffect on [pathname]

**Coverage:** All Next.js client-side navigation (router.push, Link, etc.)

---

### 2. ScrollToTop Native Scroll Reset

**Mechanism:** `window.scrollTo({ top: 0, left: 0, behavior: "instant" })`
**Trigger:** pathname change
**Timing:** Child effect (fires before parent LenisProvider)
**Authority:** Native browser scroll state

---

### 3. LenisProvider Recreate

**Mechanism:** useEffect cleanup → create new Lenis instance
**Trigger:** pathname change
**Timing:** Parent effect (fires after child ScrollToTop)
**Side Effect:** Destroys old Lenis, creates new Lenis

**Lifecycle Churn:**
```
Navigation → ScrollToTop effect (native scrollTo) → LenisProvider cleanup → LenisProvider recreate → new Lenis instance
```

---

### 4. LenisProvider popstate Listener

**Mechanism:** `window.addEventListener('popstate', onRouteChange)`
**Trigger:** Browser history traversal (back/forward buttons)
**Timing:** Diagnostics only (no scroll reset)
**Coverage:** Only popstate, NOT Next.js router.push/Link

**Gap:** Does NOT cover normal Next.js navigation

---

## EVERY BROWSER/FRAMEWORK RESTORATION MECHANISM

### 1. history.scrollRestoration

**Current State:** Captured in diagnostics
**Default Value:** 'auto' (browser may restore scroll position)
**Scope:** Browser history API
**Interaction:** Unknown with Next.js scroll restoration

---

### 2. Next.js Scroll Restoration

**Current State:** UNKNOWN (needs investigation)
**Mechanism:** Next.js internal scroll restoration
**Interaction:** Unknown with Lenis and ScrollToTop
**Authority:** Unknown

---

## ACTUAL DOCUMENT.SCROLLINGELEMENT

**Expected:** `document.documentElement` (html element)
**Verification Required:** Browser computed-style inspection
**Relevance:** Determines actual scroll container

---

## ACTUAL /OUR-WORK COMPUTED SCROLL CONTAINER

**Code Audit:**
- `html`: No overflow, no height restrictions
- `body`: No overflow, no height restrictions
- `main (#main-content)`: No overflow, `flex-1` (flexible height)
- `/our-work` sections: No overflow on page root

**Expected Scroll Container:** document/window
**Verification Required:** Browser computed-style inspection
**Nested Container Risk:** None identified in code audit

---

## EXACT SCROLLTOTOP MOUNT/EFFECT ORDER

**Component Hierarchy (layout.tsx):**
```
LenisProvider
  ├── ScrollToTop (child)
  ├── SiteHeader
  ├── main
  └── SiteFooter
```

**React Effect Execution Order:** Child-before-parent

**Timeline:**
```
Navigation → pathname changes
  ↓
ScrollToTop useEffect fires (child)
  ↓
window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  ↓
LenisProvider useEffect fires (parent)
  ↓
LenisProvider cleanup (destroy old Lenis)
  ↓
LenisProvider create new Lenis instance
```

**Race Condition:** Native scrollTo fires BEFORE new Lenis is initialized

---

## EXACT LENIS INITIALIZATION ORDER

**Timeline:**
```
Navigation → pathname changes
  ↓
ScrollToTop: native scrollTo
  ↓
LenisProvider: cleanup old Lenis
  ↓
LenisProvider: create new Lenis
  ↓
LenisProvider: log INITIAL_SCROLL_STATE
  ↓
LenisProvider: start RAF loop
  ↓
LenisProvider: attach event listeners
```

**Key Issue:** Lenis is destroyed and recreated on every route change, causing lifecycle churn

---

## CURRENT ARCHITECTURAL CONFLICTS

### Conflict 1: Dual Scroll Writers

**Writer 1:** ScrollToTop → native window.scrollTo()
**Writer 2:** Lenis → virtual scroll interpolation
**Timing:** ScrollToTop fires before Lenis is recreated
**Race:** Native scroll state set before Lenis virtual state initialized

---

### Conflict 2: Lenis Lifecycle Churn

**Behavior:** Lenis destroyed and recreated on every pathname change
**Cause:** [pathname] dependency in LenisProvider useEffect
**Side Effect:** Unnecessary destruction/recreation of scroll engine
**Impact:** Scroll state desynchronization at route transitions

---

### Conflict 3: Incomplete Route Transition Coverage

**Covered:**
- Next.js pathname changes (via useEffect on [pathname])
- Browser popstate (via popstate listener)

**Not Covered:**
- LenisProvider popstate listener only logs diagnostics, does not reset scroll
- No centralized route reset authority

---

### Conflict 4: Stale Pathname in LenisProvider popstate Handler

**Issue:** popstate handler captures pathname from initial effect execution
**Impact:** After navigation, diagnostics report wrong route
**Cause:** popstate listener uses closure-captured pathname

---

## CURRENT DIAGNOSTIC COVERAGE

**LenisProvider Diagnostics:**
- INITIAL_SCROLL_STATE: Lenis initialization
- ROUTE_CHANGE_BEFORE_RESET: Before popstate reset
- ROUTE_CHANGE_AFTER_RESET_FRAME_1: First frame after reset
- ROUTE_CHANGE_AFTER_RESET_FRAME_2: Second frame after reset
- FIRST_WHEEL_EVENT: First wheel
- FIRST_TOUCH_EVENT: First touch
- FIRST_LENIS_SCROLL_EVENT: First Lenis scroll

**ScrollToTop Diagnostics:**
- BEFORE_ROUTE_RESET: Before native scrollTo
- AFTER_ROUTE_RESET_FRAME_1: First frame after reset
- AFTER_ROUTE_RESET_FRAME_2: Second frame after reset

**Coverage Gap:** No diagnostic for Lenis recreation vs native scrollTo race

---

## NEXT STEP: PRODUCTION DATA COLLECTION

**Required:** Use deployment `2a9ebe4` (dpl_2WD9wyr2cy2AxjAqDQwvhoKMRDJq) as diagnostic control

**Test Matrix:**
1. Hard load at /our-work
2. / → /our-work
3. /our-work → / → /our-work
4. Reload while at /our-work
5. Scroll down → navigate → /our-work
6. Workbench (native scrolling)

**Causal Timeline Required:**
navigation → /our-work → Lenis initialization → ScrollToTop effect → browser restoration → DOM/layout → first wheel → first Lenis scroll

**Key Measurements:**
- Does ScrollToTop fire before or after Lenis initialization?
- Does native scrollTo set scroll state before Lenis is ready?
- Does Lenis recreation cause scroll state loss?
- Does history.scrollRestoration interfere?
- Does Next.js scroll restoration interfere?

---

## ROOT CAUSE STATUS

**Current Classification:** NOT YET PROVEN

**High-Suspicion Actors:**
- ScrollToTop native scrollTo vs Lenis virtual scroll race
- Lenis lifecycle churn on route changes
- Incomplete route transition coverage

**Proven Causal Chain:** NONE

**Required Evidence:** Production diagnostic data from 2a9ebe4 deployment

---

## CEO DIRECTIVE COMPLIANCE

**STOP:** No more scroll patches until causal timeline is proven
**USE:** 2a9ebe4 as diagnostic control
**DO NOT:** Use c69dc8f (deployment ERROR, architectural defects)
**PROVE:** Actual causal chain before proposing surgical fix
