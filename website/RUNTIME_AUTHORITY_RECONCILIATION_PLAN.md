# Runtime Authority Reconciliation Plan

## Current State Analysis

### Git State
- Current HEAD: `fbdb1c7` - Fix brand-hero media authority failure by reassigning to existing media
- Previous: `8ef6084` - Fix environment detection fail-closed and implement Shared Drive authorization

### Vercel Deployment State
- Current deployment: `dpl_7Gugrzx1hxWi5NS6ozwaUsfYZDM6`
- Status: BUILDING
- Deployed commit: UNKNOWN (awaiting completion)

### Critical Finding: Static ≠ Runtime Authority

**What Git Changed:**
- `brand.v1.json`: Changed `mediaId` from `brand-hero` to `fences-001-hero`

**What Runtime KV Still Has:**
- `service-card-assignment:brand-hero` → `mediaId: brand-hero`

**Problem:**
- Static config change does NOT update runtime KV authority
- KV is the runtime authority
- Static config is only projection/audit
- Therefore, brand-hero is still the active runtime assignment

### Required Fix Path

**DO NOT:** Make more static-file-only changes
**DO:** Reconcile runtime KV authority through authoritative mechanisms

## Step 1: Wait for Deployment Completion

- Monitor Vercel deployment `dpl_7Gugrzx1hxWi5NS6ozwaUsfYZDM6`
- Wait for status to change from BUILDING to READY
- Verify deployed commit SHA matches `fbdb1c7`
- Do NOT proceed until deployment is verified

## Step 2: Inspect Current Runtime KV Assignments

Once deployment is READY:

1. Check current runtime assignment for homepage hero
2. Determine if it's `brand-hero` or `fences-001-hero`
3. Inspect the actual KV record structure
4. Verify which media record the assignment points to

## Step 3: Determine Assignment Authority

**If assignment is `brand-hero`:**
- Is this a legitimate runtime assignment?
- Or is it stale/poisoned from earlier materialization?
- Should it be migrated to `fences-001-hero`?

**If assignment is `fences-001-hero`:**
- Was it already updated?
- Or did some other mechanism update it?
- Verify it's the intended assignment

## Step 4: Authoritative Assignment Migration

**DO NOT:** Simply delete the KV record
**DO:** Use the authoritative assignment mechanism

Required steps:
1. Read current assignment via `getServiceCardAssignment()`
2. Get expected revision for CAS
3. Create new assignment with correct mediaId
4. Use `storeServiceCardAssignment()` with CAS
5. Verify the assignment was updated

## Step 5: Verify Media Record Authority

**Critical:** Media records may be poisoned

For any media record intended to be public:

1. Verify it has `lifecycleState: 'published'`
2. Verify it has `source: 'local'`
3. Verify it has real content hash (not synthetic)
4. Verify Blob metadata exists in KV
5. Verify physical Blob exists and matches hash
6. Verify constitutional proof passes

**DO NOT:**
- Trust hashes from media.v1.json
- Manufacture new hashes from media IDs
- Create fake Blob metadata
- Bypass the constitutional proof gate

## Step 6: Materialization Authority Bridge

**Required Chain:**
```
Drive bytes → actual SHA-256 → canonical content identity → Blob → Blob metadata → KV PublishedMediaAsset → validated assignment
```

**Missing Link:** The bridge from Drive source to constitutional media is broken

**Required Fix:**
1. Implement explicit materialization stages
2. Verify physical bytes at each stage
3. Only transition to `published` after complete proof
4. Never expose incomplete media publicly

## Step 7: Fix Proof Semantics

**Current Problem:** Proof only checks `published + local`

**Required:** Explicit state/source matrix

Define and enforce:
- `google-drive + source_reference` = valid source reference
- `local + materializing` = transient (never publicly assignable)
- `local + published` = MUST have complete constitutional proof
- `stale` = NEVER publicly assignable
- Unknown combinations = reject

**DO NOT:** Add permissive read mode that bypasses Blob verification

## Step 8: Fix Assignment Reconciliation

**Current Problem:** Scans all assignments and infers relationships

**Required:** Explicit relationship

Correct model:
```
DriveReference → drive.fileId → materialization transaction → PublishedMediaAsset → explicitly authorized assignment(s)
```

**DO NOT:** Migrate unrelated assignments based on heuristics

## Step 9: Fix Public Presentation Contract

**Current Problem:** Production shows `/images/projects/...` fallbacks

**Required:** Unified public contract

```
Public component → ResolvedPublicMedia → constitutional proof → Blob-backed published asset
```

**DO NOT:** Allow raw mediaId, DriveReference, or static image paths in public components

## Step 10: Investigate Lua Script Errors

**Historical Errors:**
- `ERR Error running script: attempt to call a non-function object`
- `ERR ... redis() command arguments must be strings or integers`

**Required:**
1. Inspect current session-store.ts Lua scripts
2. Compare with historical errors
3. Determine if defect still exists
4. Add regression test if needed

## Finish Line

**NOT FINISHED WHEN:**
- TypeScript passes
- Build succeeds
- Static files edited

**FINISHED WHEN:**
- OAuth → authorization → session → corpus → Drive → bytes → hash → Blob → metadata → KV → assignment → proof → public presentation
- All boundaries verified with runtime evidence
- No poisoned media records
- No static fallbacks
- No cross-system atomicity claims

## Next Action

Wait for Vercel deployment completion, then inspect actual runtime state.
