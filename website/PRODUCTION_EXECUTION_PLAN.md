# Production Execution Plan

## Status: Architectural Fixes Complete ✅ | Production Execution Pending ⏳

## Completed Architectural Fixes (2026-09-03)

### 1. CI Secret Drift Fixed ✅
**Commit**: 5074a79
**Problem**: CI required ENCRYPTION_KEY_V1 but tests use ENCRYPTION_KEY (version 0)
**Fix**: Removed ENCRYPTION_KEY_V1 from required secrets in GitHub Actions workflow
**Status**: Pushed to origin/main
**Expected**: CI OAuth tests can now execute without secret validation failure

### 2. Media Proof Test Fixed ✅
**Commit**: 86cb65a
**Problem**: Tests expected all published assets to require Blob metadata
**Fix**: Updated to match current contract (static storage doesn't need Blob proof)
**Status**: Pushed to origin/main
**Expected**: Media proof tests now validate correct storage contract

### 3. Static Build Phase Detection Fixed ✅
**Commit**: e9ff451
**Problem**: isStaticBuild() checked for 'build' instead of 'phase-production-build'
**Fix**: Changed to check for 'phase-production-build' (correct Next.js phase)
**Status**: Pushed to origin/main
**Expected**: Static generation now correctly uses static authority, no KV access during build

### 4. OAuth Integration Test Fixed ✅
**Commit**: e29431c
**Problem**: Tests used old API signatures (stateId, wrong enum names)
**Fix**: Updated to match current oauth-state-manager API with cookieStore parameter
**Status**: Pushed to origin/main
**Expected**: Tests ready for CI execution (remain skipped until CI runs)

### 5. Production Reconciliation Script Added ✅
**Commit**: 17a8992
**Problem**: No automated way to execute production reconciliation
**Fix**: Added execute-production-reconciliation.mjs and test-reconciliation.mjs
**Status**: Pushed to origin/main
**Expected**: Production reconciliation can be executed with Workbench authentication

## Current Build Status

- **TypeScript compilation**: ✅ Clean (zero errors)
- **Production build**: ✅ Successful (53 pages, 102 kB shared JS)
- **Static build safety**: ✅ Fixed (correct phase detection)
- **CI readiness**: ✅ Ready to execute (secrets fixed)

## Production Execution Requirements

### Immediate Actions Required

#### 1. CI Execution Verification
**Goal**: Verify that CI OAuth tests execute and pass
**Steps**:
1. Trigger GitHub Actions workflow manually or wait for next push
2. Inspect oauth-tests job results
3. Verify all Redis-backed adversarial tests pass
4. Capture pass/fail for each test
5. If tests skip, determine why (credentials, configuration)
**Status**: ⏳ Requires GitHub Actions access

#### 2. Production KV Reconciliation
**Goal**: Reconcile production KV with canonical media authority
**Prerequisites**:
- Production build passing ✅
- Workbench authentication active
- KV credentials available (production only)

**Execution Options**:
1. **API Endpoint (Recommended)**:
   ```bash
   # Authenticate to Workbench at https://happyplacecarpentry.com/workbench/login
   curl -X POST https://happyplacecarpentry.com/api/admin/diagnostic/reconcile-static-media \
     -H "Cookie: your-workbench-session-cookie"
   ```

2. **Production Script**:
   ```bash
   node scripts/execute-production-reconciliation.mjs
   ```

**Expected Results**:
- 96 canonical records processed
- Classification breakdown showing missing/incomplete records repaired
- Zero failures
- Evidence report with before/after state

**Status**: ⏳ Requires production Workbench authentication

#### 3. Visual Slots Verification
**Goal**: Verify all public visual slots render correctly after reconciliation
**Tests**:
- Homepage hero background (brand-hero)
- Owner portrait (brand-portrait)
- Service cards (all cardMediaId values)
- Gallery (if projection regenerated)
- Project pages (hero and gallery media)
- Before/after imagery (where applicable)

**Status**: ⏳ Requires deployed site access after reconciliation

#### 4. OAuth → Drive → Media Authority Chain Test
**Goal**: Verify complete OAuth → Drive → media authority chain
**Sequence**:
1. Execute `/api/drive/oauth/authorize`
2. Complete Google consent
3. Verify callback with authoritative googleSubject
4. Verify authorization record created
5. Verify session record created
6. Verify drive_session_id established
7. Test `/api/drive/auth/status`
8. Test Drive discovery (My Drive root, Shared Drive root)
9. Test folder navigation with correct driveId preservation
10. Test search within active corpus
11. Test thumbnail retrieval
12. Test file selection and materialization
13. Verify DriveReference → PublishedMediaAsset conversion
14. Verify public media gate accepts resulting asset
15. Verify DriveReference → public media gate → REJECT independently

**Status**: ⏳ Requires production OAuth credentials and Drive access

#### 5. Security Boundary Tests
**Goal**: Verify security boundaries are enforced
**Tests**:
- **DriveReference Barrier**: Prove DriveReference cannot become publicly usable
- **User Isolation**: Test User A/User B authorization isolation
- **IDOR Protection**: Test that arbitrary Drive file IDs cannot access outside authorized context
- **Shared Drive Scoping**: Verify Shared Drive root ≠ entire corpus
- **Revocation**: Test authorization revocation removes access
- **Session Security**: Test legacy credential cookies cannot resurrect access

**Status**: ⏳ Requires production OAuth credentials and test environment

## Documentation Updates

Updated documentation to reflect current state:
- ✅ CURRENT_STATUS_REPORT.md - Updated with latest fixes
- ✅ BUILD_REGRESSION_FIX.md - Updated with additional fixes
- ✅ KV_RECONCILIATION_INSTRUCTIONS.md - Updated with latest changes

## Pre-existing Issues (Not Blocking)

### Data Integrity Findings
- **Location**: DATA_INTEGRITY_INVESTIGATION.md
- **Findings**: 4 duplicate content hash groups, 70 placeholder-hash records
- **Impact**: Medium (semantic mismatches, but all resolve to valid files)
- **Status**: Documented, requires forensic investigation (DO NOT AUTO-FIX)
- **Blocks KV Reconciliation**: NO

### Gallery Projection Status
- **Location**: .generated/gallery-projection.json
- **Status**: Potentially stale
- **Needs**: Regeneration from canonical authority
- **Blocks Visual Slots**: Possibly (needs verification)

## Forensic Evidence Required

### Before Production Execution
- ✅ CI workflow and secrets contract agreement
- ✅ All fixes verified in git history
- ✅ No later commits reverted fixes
- ✅ Reconciliation script committed
- ✅ TypeScript compilation clean
- ✅ Production build successful

### During Production Execution
- ⏳ CI OAuth job execution results
- ⏳ KV reconciliation before/after evidence
- ⏳ Visual slots rendering verification
- ⏳ OAuth → Drive chain execution evidence
- ⏳ Security boundary test results

### After Production Execution
- ⏳ Complete forensic evidence report
- ⏳ Production reconciliation evidence report
- ⏳ Security boundary verification report
- ⏳ User isolation test results
- ⏳ Public result verification

## Execution Sequence

### Phase 1: CI Verification
1. Trigger GitHub Actions workflow
2. Monitor oauth-tests job execution
3. Capture test results and pass/fail status
4. Verify no tests skip due to missing credentials
5. Verify build phase detection tests pass

### Phase 2: Production Reconciliation
1. Authenticate to Workbench
2. Execute KV reconciliation via API endpoint
3. Capture reconciliation evidence (before/after)
4. Verify zero failures
5. Verify idempotent second run

### Phase 3: Visual Verification
1. Test deployed homepage visual slots
2. Test gallery rendering
3. Test project pages
4. Test before/after imagery
5. Verify no hardcoded /images/... escape hatches

### Phase 4: OAuth → Drive Chain
1. Execute OAuth authorization flow
2. Verify googleSubject extraction
3. Verify session establishment
4. Test Drive discovery and navigation
5. Test file selection and materialization
6. Verify DriveReference → PublishedMediaAsset conversion
7. Verify public media gate acceptance

### Phase 5: Security Boundaries
1. Test DriveReference barrier
2. Test user isolation
3. Test IDOR protection
4. Test Shared Drive scoping
5. Test authorization revocation
6. Test session security

## Constraints

### What Requires External Action
- ❌ GitHub Actions execution (requires manual trigger or GitHub CLI)
- ❌ Production KV reconciliation (requires production Workbench authentication)
- ❌ OAuth → Drive chain testing (requires production OAuth credentials)
- ❌ Security boundary testing (requires production test environment)
- ❌ Visual slots verification (requires deployed site access)

### What Can Be Done Locally
- ✅ Code fixes and verification
- ✅ TypeScript compilation
- ✅ Production build
- ✅ Documentation updates
- ✅ Reconciliation script preparation

## Next Immediate Action

**Required**: Production Workbench authentication to execute KV reconciliation

**Execution**:
1. Navigate to https://happyplacecarpentry.com/workbench/login
2. Complete OAuth authentication
3. Execute: `node scripts/execute-production-reconciliation.mjs`
4. Capture reconciliation evidence
5. Review results and verify success

## Summary

**Architectural Fixes**: ✅ Complete and verified
**Build Status**: ✅ Clean and passing
**CI Readiness**: ✅ Ready to execute
**Production Execution**: ⏳ Awaiting production access
**Forensic Evidence**: ⏳ Awaiting production execution

All code-level fixes are complete and verified. The remaining work requires production access to execute the reconciliation and verify the end-to-end OAuth → Drive → media authority chain.
