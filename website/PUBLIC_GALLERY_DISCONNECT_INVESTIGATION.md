# Public Gallery Disconnect Investigation (2026-09-03)

## Issue Statement

User reports:
- **Home**: ✅ Working (hero media restored)
- **Services**: ❌ Disconnected
- **Our Work / Projects Gallery**: ❌ Disconnected

## Git History Analysis

### Commit c3a2c48 - "Fix homepage service cards to use static configuration"
**Date**: 2026-09-02 09:39:07
**Change**: Changed homepage service card loading from dynamic Redis assignments to static configuration
**File Changed**: `src/app/page.tsx`

**Before c3a2c48**:
```typescript
// Load runtime assignments for service cards on server side
const assignment = await getServiceCardAssignment(service.slug);
if (assignment?.mediaId && assignment.mediaId !== '') {
  const mediaObject = await resolvePublicMedia(assignment.mediaId);
  // Use runtime assignment
}
```

**After c3a2c48**:
```typescript
// Load service card media from static configuration (services.v1.json)
if (service.cardMediaId) {
  const mediaObject = await resolvePublicMedia(service.cardMediaId);
  // Use static configuration
}
```

**Reason**: Dynamic Redis reads were causing build-time fetch failures during static generation.

## Current State Analysis

### Home Page (src/app/page.tsx)
- **Status**: ✅ Working
- **Media Path**: `services.v1.json` → `cardMediaId` → `resolvePublicMedia`
- **Persistence**: Static configuration
- **Build Mode**: Static generation

### Services Page (src/app/services/page.tsx)
- **Status**: ❌ Disconnected
- **Media Path**: `getServiceCardAssignment` → Redis/KV → `resolvePublicMedia`
- **Persistence**: Dynamic Redis assignments
- **Build Mode**: `export const dynamic = 'force-dynamic'`
- **Issue**: Still using dynamic Redis assignments, not static configuration

### Our Work Page (src/app/our-work/page.tsx)
- **Status**: ❌ Disconnected
- **Media Path**: `getProjectsWithResolvedMedia` → `resolvePublicMedia` → KV
- **Persistence**: KV authority
- **Build Mode**: `export const dynamic = 'force-dynamic'`
- **Issue**: Depends on KV authority which may not be available in development

## Root Cause

**ROOT CAUSE**: Inconsistent media resolution strategy across pages
- **Home**: Uses static configuration (services.v1.json cardMediaId)
- **Services**: Uses dynamic Redis assignments (getServiceCardAssignment)
- **Our Work**: Uses KV authority (resolvePublicMedia)

The c3a2c48 commit fixed Home to use static configuration to avoid build-time fetch failures, but Services and Our Work still use dynamic/KV resolution.

## Minimal Surgical Fix

### Fix 1: Services Page
Change `src/app/services/page.tsx` to use static configuration like Home:
```typescript
// Before (dynamic Redis):
const assignment = await getServiceCardAssignment(service.slug, 'services-page');
if (assignment?.mediaId) {
  const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
}

// After (static configuration):
if (service.cardMediaId) {
  const resolvedMedia = await resolvePublicMedia(service.cardMediaId);
}
```

### Fix 2: Our Work Page
Change `src/lib/projects.ts` to use static fallback for development:
```typescript
// Current (KV only):
const kvMedia = await resolvePublicMedia(mediaId);
if (kvMedia) return kvMedia;
return undefined; // Fail honestly

// Proposed (static fallback for development):
const kvMedia = await resolvePublicMedia(mediaId);
if (kvMedia) return kvMedia;

// Development fallback: try static authority
if (process.env.NODE_ENV === 'development') {
  const staticMedia = await getMediaById(mediaId);
  if (staticMedia && staticMedia.storage === 'static') {
    return staticMedia;
  }
}
return undefined;
```

## Guardrails

✅ Preserve all existing media authority and Drive architecture
✅ Do not delete underlying media assets or project references
✅ Do not create another parallel projection system
✅ Keep Drive Media Workbench as internal management surface only
✅ Use existing static configuration (services.v1.json, projects.v1.json)

## CEO Standard Compliance

**ROOT CAUSE**: Inconsistent media resolution strategy across pages (Home uses static, Services/Our Work use dynamic/KV)

**PROOF**: 
- Commit c3a2c48 changed Home to static configuration
- Services page still uses `getServiceCardAssignment` (dynamic)
- Our Work page still uses `resolvePublicMedia` (KV authority)

**MINIMAL FIX**: 
1. Services page: Change to use static configuration (service.cardMediaId)
2. Our Work page: Add static fallback for development mode

**PRESERVED**: All current OAuth + Drive + constitutional architecture
