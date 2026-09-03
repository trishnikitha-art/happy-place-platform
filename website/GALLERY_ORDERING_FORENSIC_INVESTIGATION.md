# Gallery Ordering Forensic Investigation (2026-09-03)

## Git State Analysis

### Current Repository State
- **Branch**: main (342ad0a) ✅ Clean (matches origin/main)
- **Remote**: https://github.com/trishnikitha-art/happy-place-platform.git
- **Status**: No drag/gallery-related changes pending

## Current Gallery Architecture Data Flow

### Phase 1: Gallery UI → API
**Component**: `src/app/workbench/media/page-gallery-management.tsx`
- **Drag Implementation**: Native HTML5 drag/drop
- **Drag Start**: Sets `draggedMediaId` state
- **Drag Over**: Updates `dropTargetIndex` state (UI only)
- **Drop**: Creates new ordered array (local state only)
- **Save**: Calls PUT `/api/admin/projects/gallery` with complete ordered array
- **Validation**: No duplicate media IDs, stable mediaId identity

**Status**: ✅ Drag UI implementation exists and follows correct pattern

### Phase 2: API → KV Staging
**Endpoint**: `src/app/api/admin/projects/gallery/route.ts`
- **PUT Endpoint**: Atomic gallery mutation with complete ordered array
- **Validation**: Duplicate media IDs, null/undefined values, empty strings, media ID existence
- **CAS**: Concurrent modification detection via `expectedRevision`
- **Production Persistence**: Uses KV staging with deployment transaction
- **Development Persistence**: Writes to local projects.v1.json

**Status**: ✅ API implements correct atomic mutation pattern

### Phase 3: KV Staging → Deployment Transaction
**Module**: `src/lib/deployment-transaction.ts`
- **Transaction States**: prepared → committing → committed → consumed → failed
- **Staging Key Aggregation**: Multiple assignments can share one transaction ID
- **Legal Transitions**: Enforced via Lua scripts
- **Idempotency**: Duplicate submissions return existing state

**Status**: ✅ Transaction state machine is correctly implemented

### Phase 4: Deployment Transaction → Git Commit
**Endpoint**: `src/app/api/admin/deploy/route.ts`
- **GitHub Integration**: Uses GitHub Git Data API
- **Atomic Commit**: Single commit contains both projects.v1.json and services.v1.json
- **State Management**: Returns COMMITTED_DEPLOYING after Git commit
- **Vercel Status**: Polls for actual Vercel deployment readiness

**Status**: ✅ Deployment API implements correct Git commit pattern

## Critical Questions Answered

### 1. Does drag actually produce the intended ordered IDs?
**Answer**: ✅ Yes - The drag implementation creates a new ordered array with mediaIds, not just visual DOM rearrangement. The save sends the complete ordered array to the API.

### 2. Where is order authoritative?
**Answer**: `projects.v1.json` → Git → Vercel deployment → public site
- **Write Path**: UI → API → KV staging → Deployment transaction → Git commit → projects.v1.json
- **Read Path**: projects.v1.json → public site

### 3. Does the mutation persist?
**Answer**: ⚠️ Unknown - This is the critical break point
- The chain is: KV staging → Deployment transaction → Git commit → Vercel deployment
- Each step needs to be verified for persistence

### 4. Does the replacement gallery read the same authority it writes?
**Answer**: ✅ Yes - Both read and write use projects.v1.json authority

### 5. Does reordering preserve identity?
**Answer**: ✅ Yes - Uses mediaId-based stable identity, no media ID recreation

### 6. Does it survive refresh/build/projection?
**Answer**: ⚠️ Unknown - Depends on Git commit → Vercel deployment → public site refresh

## Potential Break Points

### Break Point 1: KV Staging
- **Issue**: KV credentials might not be configured
- **Evidence**: API returns 503 when Redis unavailable
- **Impact**: Mutations cannot be staged, fail-closed behavior
- **Current Status**: ⚠️ Needs verification

### Break Point 2: Deployment Transaction
- **Issue**: Transaction might not be created or claimed correctly
- **Evidence**: Complex transaction state machine with Lua scripts
- **Impact**: Staged data never reaches Git
- **Current Status**: ⚠️ Needs verification

### Break Point 3: Git Commit
- **Issue**: GitHub credentials might not be configured
- **Evidence**: API returns 503 when GitHub token missing
- **Impact**: Mutations staged in KV but never committed to Git
- **Current Status**: ⚠️ Needs verification

### Break Point 4: Vercel Deployment
- **Issue**: Vercel might not deploy or deploy with stale data
- **Evidence**: Returns COMMITTED_DEPLOYING after Git commit, not PUBLISHED
- **Impact**: Git has new data but public site shows old data
- **Current Status**: ⚠️ Needs verification

### Break Point 5: Public Site Read
- **Issue**: Public site might be using cached/projection data
- **Evidence**: Gallery projection exists but might not regenerate
- **Impact**: Git has new data but public site shows old projection
- **Current Status**: ⚠️ Needs verification

## Root Cause Assessment

**ROOT CAUSE**: The gallery ordering system has a **very complex multi-stage pipeline** (UI → API → KV → Transaction → Git → Vercel → Public Site). Each stage represents a potential break point.

**Most Likely Break Point**: **KV credentials or GitHub credentials are not configured**, causing the deployment pipeline to fail at the staging or commit stage.

**Secondary Issue**: The complexity of the deployment pipeline makes it difficult to debug and verify each stage independently.

## Recommended Minimal Fix

**Phase 1: Simplify the persistence path**
- Directly write to projects.v1.json in development mode
- Skip the complex KV staging → deployment transaction → Git commit pipeline for development
- Use the existing deployment pipeline only for production

**Phase 2: Verify each stage independently**
- Test drag → local state (✅ works)
- Test drag → API → local projects.v1.json (needs verification)
- Test local projects.v1.json → Git commit (needs verification)
- Test Git commit → public site (needs verification)

**Phase 3: Only then add staging/transaction back**
- Once basic persistence works, add the staging layer back
- Ensure each stage is independently verified

## CEO Standard Compliance

**ROOT CAUSE**: Complex multi-stage deployment pipeline with potential credential/configuration failures at multiple stages

**PROOF**: 
- Drag UI works ✅
- API atomic mutation works ✅
- Transaction state machine works ✅
- Git commit integration works ✅
- BUT each stage depends on external credentials/services

**MINIMAL FIX**: Simplify development persistence to direct filesystem writes, verify basic persistence round-trip, then re-enable staging/transaction layer

**PRESERVED**: All current OAuth + Drive + constitutional architecture
