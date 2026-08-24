# PHASE 1B: SCROLL INSTRUMENTATION PLAN

## CEO MODE: DIAGNOSTIC INSTRUMENTATION COMPLETE

**Status:** ✅ INSTRUMENTATION ADDED — READY FOR RUNTIME TESTING

---

## INSTRUMENTATION SUMMARY

### LenisProvider (`src/components/lenis-provider.tsx`)

**Added Measurements:**
- Component mount timestamp
- Initial scroll state at Lenis initialization:
  - `lenisInstance.scroll`
  - `lenisInstance.animatedScroll`
  - `lenisInstance.targetScroll`
  - `lenisInstance.limit`
  - `window.scrollY`
  - `document.documentElement.scrollHeight`
  - `document.documentElement.clientHeight`
  - `document.querySelector('main')?.scrollHeight`
  - `pathname`
  - `performance.now()`
- First wheel event detection:
  - `deltaY`, `deltaX`, `deltaMode`
  - `timestamp`
  - Lenis scroll state at first wheel
  - Window scroll state at first wheel
- First touch event detection:
  - `touches.length`
  - `timestamp`
  - Lenis scroll state at first touch
  - Window scroll state at first touch
- RAF loop diagnostic (every 60 frames)
- Session summary on cleanup

**Console Log Prefix:** `[LENIS_DIAGNOSTIC]`

---

### ScrollToTop (`src/components/scroll-to-top.tsx`)

**Added Measurements:**
- Component mount timestamp relative to pathname change
- Pre-scroll state:
  - `window.scrollY`
  - `document.documentElement.scrollHeight`
  - `document.documentElement.clientHeight`
  - `pathname`
  - `performance.now()`
- Post-scroll state (after 10ms):
  - `window.scrollY`
  - `document.documentElement.scrollHeight`
  - `document.documentElement.clientHeight`
  - `pathname`
  - `performance.now()`

**Console Log Prefix:** `[SCROLLTOTOP_DIAGNOSTIC]`

**Key Question:** Does ScrollToTop fire before or after Lenis initialization?

---

### ScrollReveal (`src/components/scroll-reveal.tsx`)

**Added Measurements:**
- Component mount timestamp
- Render timestamp
- Reduced motion state
- Animation start timestamp
- Animation complete timestamp

**Console Log Prefix:** `[SCROLL-REVEAL_DIAGNOSTIC]`

**Key Question:** How many ScrollReveal instances mount before first scroll?

---

## DIAGNOSTIC QUESTIONS

### Q1: Initialization Order
**Hypothesis:** ScrollToTop may fire before Lenis is initialized, causing native scroll state desynchronization.

**Evidence to collect:**
- Timestamp of ScrollToTop mount
- Timestamp of Lenis mount
- Which fires first on navigation to `/our-work`?

**Expected Console Output:**
```
[SCROLLTOTOP_DIAGNOSTIC] COMPONENT_MOUNT { pathname: "/our-work", timestamp: X }
[SCROLLTOTOP_DIAGNOSTIC] PRE_SCROLL_STATE { windowScrollY: Y, ... }
[SCROLLTOTOP_DIAGNOSTIC] POST_SCROLL_STATE { windowScrollY: 0, ... }
[LENIS_DIAGNOSTIC] LenisProvider mounted { count: 1 }
[LENIS_DIAGNOSTIC] INITIAL_SCROLL_STATE { lenisScroll: 0, windowScrollY: 0, ... }
```

**Reverse Order Failure Mode:**
```
[LENIS_DIAGNOSTIC] LenisProvider mounted { count: 1 }
[LENIS_DIAGNOSTIC] INITIAL_SCROLL_STATE { lenisScroll: 0, windowScrollY: 0, ... }
[SCROLLTOTOP_DIAGNOSTIC] COMPONENT_MOUNT { pathname: "/our-work", timestamp: X }
[SCROLLTOTOP_DIAGNOSTIC] PRE_SCROLL_STATE { windowScrollY: 0, ... }
[SCROLLTOTOP_DIAGNOSTIC] POST_SCROLL_STATE { windowScrollY: 0, ... }
```

---

### Q2: Native vs Lenis Scroll State
**Hypothesis:** Native `window.scrollY` and Lenis `scroll` may diverge after initialization.

**Evidence to collect:**
- Initial Lenis scroll state
- Initial window scroll state
- Whether they match at initialization
- Whether they diverge after first wheel/touch

**Expected Console Output:**
```
[LENIS_DIAGNOSTIC] INITIAL_SCROLL_STATE {
  lenisScroll: 0,
  lenisAnimatedScroll: 0,
  lenisTargetScroll: 0,
  lenisLimit: 5000,
  windowScrollY: 0,
  documentScrollHeight: 5000,
  documentClientHeight: 1000,
  mainHeight: 4500,
  pathname: "/our-work",
  timestamp: X
}
```

**Divergence Failure Mode:**
- `lenisScroll: 0` but `windowScrollY: 50` after first wheel
- Lenis thinks it's at top, native browser thinks it's scrolled

---

### Q3: First Event Routing
**Hypothesis:** First wheel/touch event may not reach Lenis, or may reach Lenis before state is synchronized.

**Evidence to collect:**
- First wheel event timestamp
- Lenis scroll state at first wheel
- Window scroll state at first wheel
- Whether first wheel changes scroll position

**Expected Console Output:**
```
[LENIS_DIAGNOSTIC] FIRST_WHEEL_EVENT {
  deltaY: 100,
  deltaX: 0,
  deltaMode: 0,
  timestamp: X,
  lenisScroll: 0,
  lenisAnimatedScroll: 0,
  lenisTargetScroll: 100,
  windowScrollY: 0
}
```

**Event Routing Failure Mode:**
- No `FIRST_WHEEL_EVENT` logged → Lenis not receiving wheel events
- `lenisTargetScroll` updates but `windowScrollY` stays at 0 → Lenis intercepting but not applying

---

### Q4: Document Height Changes
**Hypothesis:** Streaming content may change document height after Lenis initialization, causing Lenis `limit` to be incorrect.

**Evidence to collect:**
- Initial `documentScrollHeight`
- Initial `lenis.limit`
- Whether these match
- Whether document height changes after ScrollReveal instances mount

**Expected Console Output:**
```
[LENIS_DIAGNOSTIC] INITIAL_SCROLL_STATE {
  documentScrollHeight: 5000,
  lenisLimit: 5000,
  ...
}
```

**Height Change Failure Mode:**
- Initial `documentScrollHeight: 3000` (partial stream)
- Lenis `limit: 3000`
- After streaming completes, actual height is 5000
- Lenis limit never updates, scroll stops at 3000

---

### Q5: ScrollReveal Observer Overhead
**Hypothesis:** 5 ScrollReveal instances with viewport observers may interfere with Lenis scroll.

**Evidence to collect:**
- Number of ScrollReveal instances mounted
- Timestamp of each mount
- Animation start/complete timestamps
- Whether animations trigger on first scroll

**Expected Console Output:**
```
[SCROLL-REVEAL_DIAGNOSTIC] COMPONENT_MOUNTED { timestamp: X }
[SCROLL-REVEAL_DIAGNOSTIC] RENDER { timestamp: X }
... (repeated 5 times)
[SCROLL-REVEAL_DIAGNOSTIC] MOTION_MODE - rendering motion.div with viewport detection
```

**Observer Overhead Failure Mode:**
- 5 instances mount before first scroll
- First scroll triggers all 5 animations simultaneously
- Layout shifts during scroll cause Lenis to lose track

---

## NEXT PHASE: RUNTIME TESTING

### Test Procedure

1. **Start development server:**
   ```bash
   cd website
   npm run dev
   ```

2. **Navigate to `/our-work`:**
   - Open browser to `http://localhost:3000/our-work`
   - Open DevTools Console
   - Clear console

3. **Collect console output:**
   - Copy all `[LENIS_DIAGNOSTIC]` logs
   - Copy all `[SCROLLTOTOP_DIAGNOSTIC]` logs
   - Copy all `[SCROLL-REVEAL_DIAGNOSTIC]` logs

4. **Test scroll:**
   - Perform one wheel scroll
   - Perform one touch scroll (if available)
   - Copy subsequent diagnostic logs

5. **Analyze:**
   - Compare timestamps to determine initialization order
   - Compare scroll states to determine synchronization
   - Check event routing to determine Lenis participation

---

## HYPOTHESIS TESTING PLAN

### Hypothesis A: ScrollToTop + Lenis Race

**Test:** Disable ScrollToTop
- Comment out `<ScrollToTop />` in `layout.tsx`
- Navigate to `/our-work`
- Collect diagnostics
- Compare scroll behavior

**Expected Result:** If scroll works without ScrollToTop, race condition is the cause

---

### Hypothesis B: ScrollReveal Observer Overhead

**Test:** Disable ScrollReveal
- Comment out all `<ScrollReveal>` in `OurWorkClient.tsx`
- Navigate to `/our-work`
- Collect diagnostics
- Compare scroll behavior

**Expected Result:** If scroll works without ScrollReveal, observer overhead is the cause

---

### Hypothesis C: BeforeAfterSlider Interactive Surface

**Test:** Remove BeforeAfterSlider from first section
- Comment out `BeforeAfterSlider` usage in `OurWorkClient.tsx`
- Navigate to `/our-work`
- Collect diagnostics
- Compare scroll behavior

**Expected Result:** If scroll works without interactive surface, gesture conflict is the cause

---

### Hypothesis D: Lenis Package

**Test:** Disable Lenis entirely
- Comment out Lenis initialization in `lenis-provider.tsx`
- Navigate to `/our-work`
- Test native scroll
- Compare behavior

**Expected Result:** If native scroll works, Lenis is the problem

---

## STOP CONDITION

**CEO Directive:** "Instrument boundaries before changing behavior."

**Current Status:** ✅ INSTRUMENTATION COMPLETE

**Next Step:** Runtime data collection → Hypothesis testing → Root cause report

**DO NOT:** Commit diagnostic changes to main. These are for investigation only.
