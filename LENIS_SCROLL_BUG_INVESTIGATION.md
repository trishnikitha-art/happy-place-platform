# Lenis Scroll Bug Investigation - Workbench
**Session: Investigate Lenis scroll bug on Workbench**
**Date: 2026-07-23**
**Baseline Git SHA: 1401035**

## Executive Summary

User reports "THE LENIS SCROLL BUG ON OUR WORK" - suggesting a scroll issue on the Workbench. According to the regression audit, Lenis should be excluded from Workbench routes via `pathname.startsWith('/workbench')` check.

---

## Section 1: Lenis Exclusion Logic

### Current Implementation (lenis-provider.tsx Lines 26-29)

```typescript
// Disable Lenis for workbench routes
if (pathname.startsWith('/workbench')) {
  return;
}
```

**Analysis**:
- LenisProvider checks pathname before initialization
- If pathname starts with '/workbench', returns early (no Lenis)
- This should prevent Lenis from running on Workbench routes

**Potential Issue**:
- `usePathname()` might not be stable during client-side navigation
- If pathname changes dynamically, Lenis might not re-initialize correctly
- The effect depends on `[pathname]` dependency, so it should re-run on route changes

---

## Section 2: Workbench Scroll Architecture

### Layout Structure (workbench/media/page.tsx)

**Root Container** (Line 1607):
```typescript
<div className="h-screen flex flex-col bg-background overflow-hidden">
```

**Toolbar** (Line 1609):
```typescript
<div className="shrink-0 border-b border-border bg-card px-4 py-2">
```

**Main Content** (Line 1708):
```typescript
<div className="flex-1 grid grid-cols-2 min-h-0">
```

**Left Panel - Website Preview** (Line 1710):
```typescript
<section className="min-h-0 min-w-0 overflow-y-auto bg-white h-full">
  <iframe
    ref={iframeRef}
    src={`${window.location.origin}${state.selectedPage}?workbench=true`}
    className="w-full h-full border-0"
    title="Website Preview"
  />
</section>
```

**Right Panel - Media Management** (Line 1727):
```typescript
<section
  ref={mediaPanelRef}
  className="min-h-0 min-w-0 overflow-y-auto bg-background h-full"
>
```

**Analysis**:
- Root: `overflow-hidden` (no scroll)
- Left panel: `overflow-y-auto` (independent scroll)
- Right panel: `overflow-y-auto` (independent scroll)
- iframe loads with `?workbench=true` query param

**Potential Issue**:
- iframe content might have Lenis enabled if the query param doesn't properly exclude it
- The iframe loads actual website pages, which might have Lenis
- The Lenis exclusion check is on the parent page, not the iframe

---

## Section 3: Iframe Lenis Status

### Iframe URL Pattern

```typescript
src={`${window.location.origin}${state.selectedPage}?workbench=true`}
```

**Example**: `https://happy-place-platform.vercel.app/?workbench=true`

**Analysis**:
- Iframe loads the actual website with `?workbench=true` query param
- LenisProvider checks `pathname.startsWith('/workbench')`
- **This check is on pathname, NOT query params**
- Therefore, the iframe will have Lenis ENABLED even with `?workbench=true`

**ROOT CAUSE IDENTIFIED**:
The Lenis exclusion check is on **pathname** (`/workbench/media`), but the iframe loads pages with **query params** (`/?workbench=true`). The iframe content (homepage, services, etc.) does NOT have pathname starting with `/workbench`, so Lenis is ENABLED in the iframe.

---

## Section 4: Impact Analysis

### Current Behavior

1. Parent Workbench page (`/workbench/media`): Lenis DISABLED ✅
2. Iframe content (`/?workbench=true`): Lenis ENABLED ❌

### Problem

- Iframe has smooth scroll (Lenis) while parent has native scroll
- This creates scroll behavior inconsistency
- iframe scroll might interfere with parent scroll
- iframe scroll might feel "janky" or unresponsive

### Why This Wasn't Caught

- The Lenis exclusion was designed for the Workbench UI itself
- The iframe was treated as a "preview" of the website
- The preview was expected to have the same scroll behavior as production
- But this creates scroll conflicts in the Workbench context

---

## Section 5: Historical Context

### Commit c2cf5a1 (Shared Drive integration)

**Commit Message**: "Fix Lenis smooth scroll to exclude workbench routes"

**Implementation**: Added `pathname.startsWith('/workbench')` check

**Missing**: Did not account for iframe content

**Gap**: The iframe loads actual website pages, which are NOT under `/workbench/*` pathname

---

## Section 6: Required Fix

### Option 1: Extend Lenis Exclusion to Query Param

**Change**: Modify LenisProvider to also exclude pages with `?workbench=true` query param

```typescript
useEffect(() => {
  // Disable Lenis for workbench routes OR workbench preview mode
  const isWorkbenchRoute = pathname.startsWith('/workbench');
  const isWorkbenchPreview = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).has('workbench');
  
  if (isWorkbenchRoute || isWorkbenchPreview) {
    return;
  }
  // ... rest of Lenis initialization
}, [pathname]);
```

**Pros**:
- Simple change
- Preserves existing architecture
- iframe content will have native scroll

**Cons**:
- Changes Lenis behavior based on query param
- Might affect other uses of `?workbench=true`

### Option 2: Pass Lenis Status to Iframe via postMessage

**Change**: Have parent tell iframe to disable Lenis

```typescript
// Parent
iframeRef.current.contentWindow.postMessage({ type: 'DISABLE_LENIS' }, '*');

// Iframe (visual-slot.tsx or similar)
window.addEventListener('message', (event) => {
  if (event.data.type === 'DISABLE_LENIS') {
    // Force disable Lenis
  }
});
```

**Pros**:
- More explicit control
- Parent determines iframe behavior

**Cons**:
- More complex
- Requires iframe-side handling
- Timing issues

### Option 3: Create Separate Preview Component

**Change**: Create a stripped-down version of website pages without Lenis

**Pros**:
- Clean separation
- No query param dependencies

**Cons**:
- Code duplication
- Maintenance burden

---

## Section 7: Recommendation

**Option 1** is the simplest and most aligned with existing architecture.

The `?workbench=true` query param is already used to trigger workbench mode in VisualSlot components. Extending this to also disable Lenis is consistent with the existing pattern.

---

## Section 8: Verification

### After Fix

**Test Case**: Open Workbench media page, scroll in iframe

**Expected Behavior**:
- Parent Workbench: Native scroll (no Lenis)
- Iframe content: Native scroll (no Lenis due to `?workbench=true`)
- No scroll conflicts
- Consistent scroll behavior

---

## Conclusion

**ROOT CAUSE**: Lenis exclusion check is on pathname (`/workbench/*`), but iframe loads pages with query params (`/?workbench=true`). The iframe content has Lenis ENABLED, causing scroll conflicts with the parent Workbench (which has Lenis DISABLED).

**FIX**: Extend Lenis exclusion to also check for `?workbench=true` query param.

**This is a gap in the original c2cf5a1 fix** - it didn't account for iframe content.

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: 1401035
- **Audit Date**: 2026-07-23
- **Scope**: Lenis scroll bug on Workbench
- **Method**: Code analysis of Lenis exclusion logic and iframe architecture
