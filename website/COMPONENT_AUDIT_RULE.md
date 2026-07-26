# Component Audit Rule

**Standing Process Rule for Performance-Critical Components**

---

## The Problem

Every round of performance investigation fixed the *specific instance* reported, not the *underlying pattern*.

**Example:**
- Homepage had 4 WorkshopAtmosphere instances → Fixed to 1
- Project detail page had 4 WorkshopAtmosphere instances → Never checked until later
- Our Work page had 1 WorkshopAtmosphere instance → Removed entirely

The bug report was scoped to "the homepage feels laggy" rather than "search the whole codebase for this component's usage count."

---

## The Rule

**Before closing out any fix for "component X causes performance issues," grep the entire repo for every place component X is used — not just the one page where it was noticed.**

---

## When to Apply

Apply this rule when fixing issues related to:

- **Performance** (scroll lag, jank, main-thread contention)
- **Animation loops** (requestAnimationFrame, setInterval)
- **Event listeners** (scroll, resize, intersection observers)
- **Resource-heavy components** (canvas, WebGL, media players)
- **State management** (context providers, global state)

---

## Audit Process

### 1. Identify the Component

```bash
# Search for all usages of the component
findstr /s /i "ComponentName" src\*.tsx src\*.ts
```

### 2. Count Instances per Page

For each file found, count how many times the component is instantiated.

**Critical Threshold:**
- **RAF-based components:** Maximum 1 instance per page
- **Event listeners:** Maximum 1 shared listener per page
- **Heavy resources:** Maximum 1 instance per page

### 3. Reduce to Single Instance

If a page has multiple instances:
- Keep the single most visually important instance
- Remove all other instances
- Or refactor to share a single driver (e.g., app-level RAF loop)

### 4. Verify Fix

- Test all affected pages
- Verify performance improvement
- Ensure no visual regressions

---

## Specific Component Rules

### WorkshopAtmosphere

**Rule:** Maximum 1 instance per page

**Reason:** Each instance runs its own requestAnimationFrame loop. Multiple instances = multiple independent RAF loops competing for main-thread budget.

**Implementation:**
- Homepage: 1 instance in hero only
- Project detail: 1 instance in Materials section only
- Our Work: 0 instances (removed)

---

### LenisProvider

**Rule:** Maximum 1 instance per application

**Reason:** Single smooth scroll driver for the entire app.

**Implementation:**
- Wrapped around entire app in layout.tsx
- Never instantiated multiple times

---

### ScrollReveal

**Rule:** Unlimited instances (safe)

**Reason:** Uses IntersectionObserver with `once: true`, stops observing after first trigger. Not per-frame polling.

---

## Standing Checklist

Before closing any performance-related fix:

- [ ] Grep entire codebase for component usage
- [ ] Count instances per page
- [ ] Reduce to single instance where applicable
- [ ] Test all affected pages
- [ ] Document the pattern for future reference

---

## Anti-Patterns to Avoid

### ❌ Fixing Only the Reported Page

```typescript
// Bad: Only fixes homepage
// src/app/page.tsx - fixed from 4 to 1 instances
// src/app/projects/[slug]/page.tsx - still has 4 instances (not checked)
```

### ✅ Auditing the Entire Codebase

```typescript
// Good: Fixes all pages
// src/app/page.tsx - fixed from 4 to 1 instances
// src/app/projects/[slug]/page.tsx - fixed from 4 to 1 instances
// src/app/our-work/OurWorkClient.tsx - removed entirely
```

---

## Documentation Requirements

When documenting a performance fix, include:

1. **Component name** being audited
2. **Search command** used to find all instances
3. **Files found** with instance counts
4. **Changes made** to each file
5. **Final state** (instances per page)
6. **Performance impact** (before/after if measurable)

---

## Enforcement

This rule applies to:

- All performance-related bug fixes
- All feature additions involving heavy components
- All refactoring of animation systems
- All changes to event listener patterns

**Exception:** If multiple instances are intentionally required (e.g., different configurations), document the reasoning and ensure shared drivers where possible.

---

## Related Documentation

- `SCROLL_LAG_INVESTIGATION_REPORT.md` - Original scroll lag investigation
- `ATMOSPHERIC_LIGHTING_INVENTORY.md` - Atmospheric components audit
- `ATMOSPHERIC_REPLACEMENT_PLAN.md` - Phased replacement plan

---

## Version History

- **v1.0** - Established after WorkshopAtmosphere multi-instance bug (July 2026)
