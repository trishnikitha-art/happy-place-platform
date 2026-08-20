# Gate A: Lenis Implementation Verification
**Session: Forensic verification of a92393f Lenis context boundary**
**Date: 2026-07-23**
**Baseline Git SHA: a92393f**

## Executive Summary

This gate verifies the actual Lenis implementation in commit a92393f against the required invariants.

---

## Section 1: Implementation Inspection

### Current Implementation (lenis-provider.tsx Lines 31-86)

```typescript
useEffect(() => {
  // Authoritative workbench context check
  const isWorkbenchRoute = pathname.startsWith('/workbench');
  const isWorkbenchPreview = searchParams.get('workbench') === 'true';
  const isWorkbenchContext = isWorkbenchRoute || isWorkbenchPreview;

  // Disable Lenis for workbench context
  if (isWorkbenchContext) {
    return;
  }

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    return;
  }

  // Diagnostic: detect duplicate mounts
  console.count('LenisProvider mounted');

  // Initialize Lenis
  const lenisInstance = new Lenis({
    lerp: 0.25,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.0,
    duration: 0.8,
  });

  setLenis(lenisInstance);

  // Animation loop with RAF leak detection
  let frameId: number;
  let frameCount = 0;
  function raf(time: number) {
    lenisInstance.raf(time);
    frameCount++;
    if (frameCount % 60 === 0) {
      console.count('Lenis RAF loop');
    }
    frameId = requestAnimationFrame(raf);
  }

  frameId = requestAnimationFrame(raf);

  // Cleanup
  return () => {
    console.log('LenisProvider cleanup: cancelling RAF and destroying instance');
    cancelAnimationFrame(frameId);
    lenisInstance.destroy();
  };
}, [pathname, searchParams]);
```

### Verification Against Requirements

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Explicit workbench=true check | `searchParams.get('workbench') === 'true'` | ✅ CORRECT |
| Not just presence check | Uses `=== 'true'` not `.has()` | ✅ CORRECT |
| pathname OR query param | `isWorkbenchRoute \|\| isWorkbenchPreview` | ✅ CORRECT |
| Effect dependencies | `[pathname, searchParams]` | ✅ CORRECT |
| RAF cleanup | `cancelAnimationFrame(frameId)` | ✅ CORRECT |
| Lenis destroy | `lenisInstance.destroy()` | ✅ CORRECT |
| Duplicate mount detection | `console.count('LenisProvider mounted')` | ⚠️ DIAGNOSTIC ONLY |
| RAF loop leak detection | `console.count('Lenis RAF loop')` | ⚠️ DIAGNOSTIC ONLY |

---

## Section 2: Critical Issues Identified

### Issue 1: Diagnostic Logging ≠ Regression Protection

**Problem**: `console.count` only diagnoses duplication, it doesn't fail tests or enforce invariants.

**Required**: Actual testable invariant that fails when duplication occurs.

**Current**: `console.count('LenisProvider mounted')` - counts mounts but doesn't prevent accumulation

**Missing**: 
- Test that verifies exactly one Lenis instance exists
- Test that verifies exactly one RAF loop exists
- Test that fails if multiple instances/loops are detected

### Issue 2: No Actual Test for Query Param Transitions

**Problem**: The effect depends on `[pathname, searchParams]`, but we haven't verified:
- Does it actually react when query string changes without pathname change?
- Does it cleanly destroy Lenis when transitioning from `?workbench=true` → normal mode?

**Required**: Actual test coverage for:
- `/` → `/?workbench=true` (query param add)
- `/?workbench=true` → `/` (query param remove)
- `/workbench/media` → `/` (pathname change)
- Strict Mode double mount

### Issue 3: No Iframe Remount Test

**Problem**: The Workbench iframe loads actual website pages. We haven't verified:
- Can iframe remount without accumulating Lenis?
- Does iframe Lenis properly cleanup on iframe unmount?

**Required**: Test iframe lifecycle in Workbench context.

---

## Section 3: Required Tests

### Test 1: Query Param Transition Test

**Scenarios**:
1. `/` → `/?workbench=true` (should destroy Lenis)
2. `/?workbench=true` → `/` (should not initialize Lenis if already destroyed)
3. `/` → `/services` (should preserve Lenis)
4. `/workbench/media` → `/` (should initialize Lenis)

**Expected Behavior**:
- Each transition should result in exactly one live Lenis instance
- No surviving RAFs after transitions
- No accumulation of instances

### Test 2: Strict Mode Test

**Scenario**: React Strict Mode double mount

**Expected Behavior**:
- Two initialization cycles (React Strict Mode behavior)
- Two cleanup cycles
- Exactly one live Lenis instance after both cycles complete
- Exactly one live RAF after both cycles complete

### Test 3: Iframe Remount Test

**Scenario**: Workbench iframe loads `/?workbench=true`, then remounts

**Expected Behavior**:
- Iframe has no Lenis (due to `?workbench=true`)
- Iframe remount does not accumulate Lenis
- Parent Workbench has no Lenis

### Test 4: RAF Count Invariant Test

**Invariant**: At any point, there should be exactly 0 or 1 RAF loops, never more.

**Test**: Monitor `requestAnimationFrame` calls and verify count never exceeds 1.

### Test 5: Mount/Unmount RAF Cleanup Test

**Scenario**: Mount → unmount → remount cycle

**Expected Behavior**:
- Mount: 1 RAF started
- Unmount: 1 RAF cancelled
- Remount: 1 new RAF started
- No surviving RAFs from previous mount

---

## Section 4: Scroll Purity Test Definition

### Normal Page Test

**Required**:
- Exactly 1 Lenis instance
- Exactly 1 RAF loop
- No duplicate instances
- No surviving RAFs after cleanup

### Workbench Test

**Required**:
- Exactly 0 Lenis instances
- Native scroll
- No RAF loops

### Workbench Iframe Test

**Required**:
- Exactly 0 Lenis instances
- Native scroll
- No RAF loops

### Mount → Unmount Test

**Required**:
- 0 surviving RAFs
- Lenis properly destroyed

### Strict Mode Test

**Required**:
- 1 surviving Lenis instance
- 1 surviving RAF instance
- No accumulation

### HMR Test

**Required**:
- No RAF accumulation
- No Lenis accumulation
- Clean cleanup on hot reload

---

## Section 5: Conclusion

**Current State**: Implementation is directionally correct but lacks testable invariants.

**Gaps**:
1. Diagnostic logging only, no failing tests
2. No actual test coverage for query param transitions
3. No iframe remount test
4. No RAF count invariant enforcement
5. No Strict Mode verification
6. No HMR verification

**Required Before Acceptance**:
- Implement actual tests for all scenarios above
- Add failing invariants when duplication occurs
- Verify query param transitions work correctly
- Verify iframe lifecycle
- Verify Strict Mode behavior
- Verify HMR behavior

**Verdict**: GATE A NOT PASSED - needs test coverage before acceptance.

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: a92393f
- **Audit Date**: 2026-07-23
- **Scope**: Lenis implementation verification
- **Method**: Code inspection against required invariants
