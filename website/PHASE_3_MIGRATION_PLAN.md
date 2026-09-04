# PHASE 3: Migration Plan - Establish One Slot → Asset Relationship

## Executive Summary
**STATUS:** ⚠️ PRODUCTION KV STATE UNKNOWN - CREDENTIALS UNAVAILABLE IN LOCAL ENV

Local environment lacks KV credentials, so production KV state cannot be directly queried. Migration plan is designed but requires production verification before execution.

---

## Key Findings from Forensic Inventory

### Safe to Remove (No Production Impact):
1. **Static media helpers in media.ts** - Only used in tests and dead Workbench preview file
2. **Workbench preview duplicate (main-media.ts)** - Dead code, not imported anywhere
3. **Static mediaId in brand.v1.json** - Unused, runtime assignment is authoritative

### Requires Migration (Production Impact):
1. **Project media IDs from projects.v1.json** - Currently static authority, needs runtime assignments
2. **Hardcoded logo paths** - 12 references need runtime assignment slots
3. **Generated projections** - Orphaned, need classification (consume or eliminate)

### Already Correct:
1. **Service card assignments** - KV-based, working correctly
2. **Brand authority runtime path** - Uses KV assignments, static manifest only provides metadata
3. **Drive API security** - Proper authorization chain, Workbench-only
4. **Media promotion boundary** - DriveReference → Assignment enforced
5. **Public media gate** - Strict validation enforced

---

## Migration Plan

### STEP 1: Design Unified Assignment Model

**Current Schema:**
```typescript
interface ServiceCardAssignment {
  serviceSlug: string;
  mediaId: string;
  updatedAt: string;
  source: 'workbench';
  revision?: number;
}
```

**Extended Schema:**
```typescript
interface MediaAssignment {
  slotType: 'service' | 'project' | 'brand' | 'logo';
  subjectId: string; // serviceSlug, projectId, 'global'
  slotName: string; // 'card', 'hero', 'before', 'after', 'gallery[N]', 'background', 'portrait', 'header', 'footer'
  mediaId: string;
  updatedAt: string;
  source: 'workbench';
  revision?: number;
}
```

**Namespace:** `media-assignment:{slotType}:{subjectId}:{slotName}`

**Examples:**
- `media-assignment:service:fences:card` (existing: service-card-assignment:fences)
- `media-assignment:project:fences-001:hero` (new)
- `media-assignment:brand:global:background` (existing: service-card-assignment:brand-hero-background)
- `media-assignment:logo:global:header` (new)

**Migration Strategy:**
- Keep existing `service-card-assignment` namespace for backward compatibility
- Add new namespaces for project/brand/logo slots
- Extend assignment-store.ts to support new slot types
- Phase 1: Add new namespace support
- Phase 2: Backfill assignments
- Phase 3: Update consumers
- Phase 4: Deprecate old namespace (optional future cleanup)

---

### STEP 2: Backfill Missing Assignments

**BEFORE removing static authorities, backfill KV with equivalent assignments:**

#### Brand Slots:
- `media-assignment:brand:global:background` → mediaId from current production (if KV missing)
- `media-assignment:brand:global:portrait` → mediaId from current production (if KV missing)

#### Project Slots (for each project in projects.v1.json):
- `media-assignment:project:{projectId}:hero` → project.media.hero
- `media-assignment:project:{projectId}:before` → project.media.before
- `media-assignment:project:{projectId}:after` → project.media.after
- `media-assignment:project:{projectId}:gallery:{index}` → project.media.gallery[index]

#### Logo Slots:
- `media-assignment:logo:global:header` → /brand/logo.png (need to create PublishedMediaAsset)
- `media-assignment:logo:global:footer` → /brand/logo.png (same asset)

**Critical Requirement:**
Before backfilling, verify that each mediaId from static JSON:
1. Exists as PublishedMediaAsset in KV
2. Passes public media gate validation
3. Has valid Blob metadata (for Drive assets)
4. Has valid public URLs

If any mediaId fails validation, DO NOT backfill - it indicates a data integrity issue that must be resolved first.

---

### STEP 3: Verify Backfilled Assignments

For each backfilled assignment:
```typescript
const assignment = await getMediaAssignment('project', 'fences-001', 'hero');
const media = await resolvePublicMedia(assignment.mediaId);
// Verify:
// - media exists
// - media.lifecycleState === 'published'
// - media.source === 'local' or valid Drive asset with Blob metadata
// - media.variants has public URLs
// - No /api/drive/* URLs
// - No drive-prefixed IDs
```

If any assignment fails validation, STOP and report data integrity issue.

---

### STEP 4: Cut Over Consumers

#### Brand Authority (brand.ts):
**Current:**
```typescript
const manifest = loadBrandManifest();
const assignment = await getServiceCardAssignment('brand-hero-background');
if (assignment) {
  const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
  return { ...manifest.homepageHero, mediaId: assignment.mediaId, resolvedMedia };
}
return { ...manifest.homepageHero, mediaId: null };
```

**After:**
```typescript
// Remove static manifest loading entirely
const assignment = await getMediaAssignment('brand', 'global', 'background');
if (assignment) {
  const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
  return { id: 'brand-hero-background', mediaId: assignment.mediaId, resolvedMedia, alt: '...' };
}
return { id: 'brand-hero-background', mediaId: null, alt: '...' };
```

#### Project Authority (projects.ts):
**Current:**
```typescript
const project = getProjectById(projectId);
const heroMedia = await resolvePublicMedia(project.media.hero);
```

**After:**
```typescript
const project = getProjectById(projectId);
const assignment = await getMediaAssignment('project', projectId, 'hero');
const heroMedia = assignment ? await resolvePublicMedia(assignment.mediaId) : null;
```

#### Logo Consumers:
**Current:**
```typescript
<Image src="/brand/logo.png" ... />
```

**After:**
```typescript
const logoAssignment = await getMediaAssignment('logo', 'global', 'header');
const logoMedia = logoAssignment ? await resolvePublicMedia(logoAssignment.mediaId) : null;
const logoSrc = logoMedia?.variants?.web || '/brand/logo.png'; // Temporary fallback
<Image src={logoSrc} ... />
```

---

### STEP 5: Remove Dead Code

#### Remove Static Helpers (media.ts):
- `getProjectMedia()` - DEAD (only used in tests)
- `getProjectHero()` - DEAD (only used in tests)
- `getProjectThumbnail()` - DEAD
- `getProjectBeforeAfter()` - DEAD
- `getProjectMediaByRole()` - DEAD
- `getFeaturedServiceMedia()` - DEAD

**Note:** Keep `loadMediaManifest()` and `getStaticMediaForBootstrap()` - these are evidence/bootstrap tools, not runtime authorities.

#### Remove Workbench Duplicate:
- Delete `src/app/workbench/preview/main-media.ts` - DEAD CODE

#### Clean Static JSON:
- Remove unused `mediaId` from brand.v1.json (homepageHero, ownerPortrait)
- Keep other metadata (alt text, names, etc.)
- DO NOT remove media IDs from projects.v1.json YET (until after backfill verified)

---

### STEP 6: Classify Generated Projections

**Current State:**
- `.generated/hero-projection.json` exists but not consumed
- `.generated/gallery-projection.json` exists but not consumed
- `.generated/service-projection.json` exists but not consumed
- `projection-loader.ts` can load them
- `projection-adapter.js` references missing `metadata/projection/*.json`

**Options:**

**Option A: Eliminate (Recommended)**
- Delete `.generated/*.json` files
- Delete `projection-loader.ts`
- Delete `projection-adapter.js`
- Delete projection generation scripts
- Reason: Homepage already uses runtime assignment resolution, projections are dead infrastructure

**Option B: Consume (Not Recommended)**
- Make homepage consume generated projections
- Requires significant rewrite of homepage rendering logic
- Introduces another authority layer
- Reason: Unnecessary complexity, runtime assignments already work

**Recommendation:** Option A - Eliminate orphaned projections

---

### STEP 7: Full Authority Search

After migration, search for:
```bash
# Static JSON references
grep -r "brand\.v1\.json" src/
grep -r "projects\.v1\.json" src/
grep -r "media\.v1\.json" src/

# Static helpers
grep -r "getProjectMedia\|getProjectHero" src/

# Hardcoded paths
grep -r "/brand/logo" src/
grep -r "/images/" src/

# Generated projections
grep -r "projection-loader\|generated-projection" src/

# Drive IDs in public contexts
grep -r "drive-" src/app --exclude-dir=workbench
```

Classify every remaining occurrence:
- **Allowed:** Test code, evidence tools, admin APIs, Workbench
- **Forbidden:** Production rendering paths, public-facing components

---

## Critical Verification Steps

### Before Migration:
1. ✅ Verify all mediaIds in static JSON exist as PublishedMediaAsset in KV
2. ✅ Verify all mediaIds pass public media gate validation
3. ✅ Verify current production KV state (via admin diagnostic API or production logs)
4. ✅ Document current rendered state (screenshots or production visit)

### After Migration:
1. ✅ Typecheck: `npx tsc --noEmit`
2. ✅ Lint: `npm run lint`
3. ✅ Build: `npm run build`
4. ✅ Test: `npm test`
5. ✅ Authority search: No competing paths found
6. ✅ Homepage renders correctly
7. ✅ Service cards render correctly
8. ✅ Project pages render correctly
9. ✅ Header/footer logos render correctly
10. ✅ Public media gate still rejects Drive references
11. ✅ Drive materialization boundary intact
12. ✅ Workbench Drive preview still authenticated

---

## Required Production KV Verification

Since local environment lacks KV credentials, production KV state must be verified via:

**Option 1: Admin Diagnostic API**
```
POST /api/admin/diagnostic/inventory-assignments
```
Requires Workbench authentication. Returns:
- Total assignments
- Brand assignments
- Service assignments
- Invalid assignments
- Duplicate mediaIds

**Option 2: Production Logs**
Check production logs for:
- `[ASSIGNMENT_READ]` messages
- `[PUBLIC_MEDIA_GATE]` messages
- Brand assignment resolution logs
- Service card resolution logs

**Option 3: Direct Production Visit**
Visit production site and inspect:
- Homepage hero state
- Service card images
- Project page images
- Header/footer logos

---

## Risk Assessment

### High Risk:
- **Project media migration** - If static mediaIds don't exist in KV, project pages could break
- **Mitigation:** Verify all mediaIds in KV before removing static authority

### Medium Risk:
- **Logo migration** - Need to create PublishedMediaAsset for /brand/logo.png
- **Mitigation:** Keep hardcoded fallback during transition period

### Low Risk:
- **Static helper removal** - Safe, only used in tests
- **Generated projection elimination** - Safe, not consumed
- **Brand static cleanup** - Safe, mediaId unused

---

## Deployment Strategy

### Phase 1: Preparation (Local Development)
1. Extend assignment-store.ts with unified schema
2. Create backfill script
3. Update brand.ts to use unified assignments
4. Update projects.ts to use unified assignments
5. Test locally with mock KV data

### Phase 2: Production Verification (Production)
1. Run admin diagnostic API to inventory current KV state
2. Verify all mediaIds exist in KV
3. Verify all mediaIds pass public media gate
4. Document current rendered state

### Phase 3: Backfill (Production)
1. Run backfill script to create missing assignments
2. Verify backfilled assignments resolve correctly
3. Verify rendered state unchanged

### Phase 4: Cutover (Production)
1. Deploy updated brand.ts and projects.ts
2. Update logo consumers with temporary fallback
3. Verify all pages render correctly
4. Monitor logs for errors

### Phase 5: Cleanup (Production)
1. Remove static helpers from media.ts
2. Remove dead Workbench preview file
3. Clean unused mediaId from brand.v1.json
4. Remove mediaId from projects.v1.json (after verification)
5. Eliminate generated projections
6. Remove logo hardcoded fallback (after logo assignment verified)

---

## Success Criteria

**The migration is successful when:**

1. ✅ Every production media slot has exactly one canonical authority
2. ✅ Every authoritative assignment resolves to a valid PublishedMediaAsset
3. ✅ No production consumer can bypass the canonical media authority
4. ✅ Drive → materialization → published-media boundary remains intact
5. ✅ Public media gate still rejects Drive references and invalid states
6. ✅ Workbench Drive preview remains authenticated and separate
7. ✅ Homepage renders correctly with KV assignments
8. ✅ Service cards render correctly with KV assignments
9. ✅ Project pages render correctly with KV assignments
10. ✅ Header/footer logos render correctly with KV assignments
11. ✅ Typecheck, lint, build, test all pass
12. ✅ No competing authority paths found in repository search
13. ✅ Production visit confirms visual state unchanged

---

## Immediate Blocker

**Cannot proceed with migration without production KV state verification.**

**Required Action:**
1. Access production environment with KV credentials
2. Run admin diagnostic API: `POST /api/admin/diagnostic/inventory-assignments`
3. Verify all mediaIds from static JSON exist in KV
4. Verify all mediaIds pass public media gate
5. Document current production rendered state

**Alternative:** User can provide production KV credentials for local verification, or we can proceed with architectural design only and defer execution until production access is available.

---

## PHASE 3 Conclusion

**STATUS:** ⚠️ BLOCKED - PRODUCTION KV STATE UNKNOWN

The forensic inventory and migration plan are complete, but execution requires production KV state verification which is currently blocked by missing local credentials.

**Architecture is clear:**
- Unified assignment model designed
- Migration strategy defined
- Risk assessment complete
- Success criteria established

**Next Required Action:** Obtain production KV access or run admin diagnostic API in production environment to verify current state before proceeding with migration.