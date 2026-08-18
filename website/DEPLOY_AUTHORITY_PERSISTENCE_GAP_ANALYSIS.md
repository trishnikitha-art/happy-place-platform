# DEPLOY AUTHORITY PERSISTENCE GAP ANALYSIS

**Date**: 2026-08-15
**Repository**: happy-place-platform (DEPLOY branch, updated-deploy)
**Objective**: Establish where Workbench assignments persist before implementation

---

## CRITICAL IMPLEMENTATION CHECKPOINT

**DO NOT begin by editing src/app/page.tsx**

Before any implementation, must establish the exact existing persistence mechanism for a Workbench assignment.

---

## EXISTING AUTHORITATIVE CONFIG FILES

### brand.v1.json (Brand Authority)
```json
{
  "homepageHero": {
    "id": "brand-hero-001",
    "mediaId": "brand-hero"
  },
  "ownerPortrait": {
    "id": "brand-owner-001",
    "mediaId": "brand-portrait"
  }
}
```
- **Authority**: Brand Authority
- **Purpose**: Homepage hero and owner portrait selection
- **Current State**: Has structure, but homepage hero is NOT used in production (hardcoded path used instead)
- **Workbench Integration**: NONE

### workbench-ordering.v1.json (Workbench Only)
```json
{
  "version": "1.0.0",
  "baseline": {
    "source": "main",
    "commit": "5ba201cd354b4cc2ba95f9612c39e08d813ffab1"
  },
  "version": 1,
  "orders": []
}
```
- **Authority**: Workbench-only (not consumed by production)
- **Purpose**: Photo ordering within Workbench
- **Current State**: Empty orders array
- **Production Consumption**: NONE

### media.v1.json (Media Authority)
- **Authority**: Media Authority
- **Purpose**: Canonical media identity and variants
- **Workbench Integration**: Read-only via getMediaById()
- **Production Consumption**: YES (via lib/media.ts)

### projects.v1.json (Projects Authority)
- **Authority**: Projects Authority
- **Purpose**: Project metadata and media references
- **Workbench Integration**: Read-only via lib/projects.ts
- **Production Consumption**: YES (via lib/projects.ts)

---

## SLOT REGISTRY (RUNTIME ONLY)

**File**: src/lib/slot-registry.ts

**Purpose**: Runtime registration of website visual slots
- VisualSlot components register themselves on mount
- Registry stores slot metadata (id, route, section, currentMediaId)
- Workbench reads registry to enable click selection and drag/drop
- Uses postMessage for iframe cross-frame communication

**Critical Finding**: Slot registry is RUNTIME ONLY
- Does NOT persist assignments
- Does NOT write to any authoritative config file
- Cleared on page refresh
- Not consumed by production build system

**Status**: Workbench telemetry, not authoritative state

---

## AUTHORITY PERSISTENCE GAP

### Missing: Authoritative Write Path for Visual Assignments

**Question**: Where does a Workbench assignment (e.g., Homepage Hero → mediaId X) get persisted?

**Answer**: NOWHERE

**Current State**:
1. brand.v1.json has the structure for homepageHero.mediaId
2. But homepage hero in production uses hardcoded path, NOT brand.v1.json
3. Workbench has NO mechanism to write to brand.v1.json
4. Workbench has NO mechanism to persist visual assignments to any authoritative source
5. workbench-ordering.v1.json exists but is not consumed by production
6. Slot registry is runtime-only, does not persist

**Result**: There is NO existing authoritative write path for visual assignments that the Workbench can use.

---

## CONSTITUTIONAL BOUNDARY MISSING

**Human intent → authorized mutation → authority → derived representations → consumer**

**Missing Link**: "authorized mutation → authority"

The Workbench can:
- Detect slots via slot registry (runtime telemetry)
- Select media from media.v1.json (read-only)
- Stage assignments in local state (not persisted)

But it CANNOT:
- Write assignments to brand.v1.json (no API endpoint)
- Write assignments to any authoritative config file
- Persist assignments to a domain that production build consumes

---

## OPTIONS

### Option 1: Make brand.v1.json Authoritative (Would require major change)
- Create API endpoint for Workbench to write to brand.v1.json
- Update production components to read from brand.v1.json instead of hardcoded paths
- This would change the production contract
- NOT A SURGICAL FIX

### Option 2: Create New Authority (Would compete with existing authorities)
- Create visual-assignments.v1.json
- Create write API for Workbench
- Create projection to consume assignments
- Update production components to use assignments
- This would create a new competing authority
- VIOLATES CONSTITUTIONAL RULES

### Option 3: Maintain Status Quo (No Workbench visual assignment)
- Keep hardcoded paths in production
- Keep Workbench as read-only inspection tool
- This preserves existing contract
- BUT: Does not solve the two-panel photo replacement workflow

---

## RECOMMENDATION

**STOP AND REPORT THE MISSING BOUNDARY**

There is NO existing authoritative write path for visual assignments that the Workbench can use without:
1. Creating a new authority (violates constitutional rules)
2. Making brand.v1.json authoritative (requires major production changes)
3. Creating Workbench-only persistence (not authoritative)

**The architectural gap must be resolved at the constitutional level before any implementation can proceed.**

**Do NOT modify src/app/page.tsx or any consumer until this boundary is established.**
