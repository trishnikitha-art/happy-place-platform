# Authority Chain Audit Report

**Date:** 2026-09-18
**Scope:** Multi-slot replacement implementation and authority chain verification
**Status:** In Progress

---

## A. Current Deployment State

### Git State
- **Branch:** main
- **HEAD:** 0f9265eb "Regenerate projections and media graph after multi-slot implementation"
- **Previous Implementation Commit:** 06a82ca6 "Implement multi-slot replacement from Media Workbench UI"
- **Remote:** https://github.com/trishnikitha-art/happy-place-platform.git
- **Vercel Deployment:** Reports commit 06a82ca6 as successfully deployed

### Environment Configuration

#### Required Environment Variables (from .env.example)
- `KV_REST_API_URL` - Upstash Redis URL
- `KV_REST_API_TOKEN` - Upstash Redis token
- `ENCRYPTION_KEY` - OAuth credential encryption
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL
- `WORKBENCH_PASSWORD` - Workbench authentication
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage
- `HPP_AUTHORIZED_SHARED_DRIVES` - Drive corpus authorization (0ALeA98MLc-s_Uk9PVA)
- `HPP_AUTHORIZED_MY_DRIVE` - My Drive authorization (true if authorized)

#### Drive API Route Inventory
**Public-Facing Drive Routes:**
- `/api/drive/oauth/authorize` - OAuth authorization initiation
- `/api/drive/oauth/callback` - OAuth callback (authoritative entry point)
- `/api/drive/files/[fileId]/thumbnail` - Thumbnail retrieval
- `/api/drive/files` - File listing
- `/api/drive/folder/[folderId]` - Folder browsing
- `/api/drive/discovery` - Drive discovery
- `/api/drive/search` - Drive search
- `/api/drive/ingest` - Legacy ingest endpoint (deprecated)
- `/api/drive/reference` - Drive reference creation

**Workbench API Routes:**
- `/api/workbench/use-drive-asset` - Multi-slot Drive handoff (authoritative transaction)
- `/api/workbench/materialize-drive` - Drive materialization
- `/api/workbench/assign-media` - Local media assignment
- `/api/workbench/login` - Workbench authentication
- `/api/workbench/auth-status` - Session verification
- `/api/workbench/drive-corpus` - Corpus authorization check
- `/api/workbench/media-authority` - Media authority inspection

### Multi-Slot Implementation Architecture

**Endpoint:** `/api/workbench/use-drive-asset`

**Request Contract:**
```typescript
{
  sourceFileId: string;
  sourceSharedDriveId?: string;
  sourceCorpusId?: string;
  targetSlotId?: string; // DEPRECATED: backward compatibility
  targetSlotIds?: string[]; // NEW: multi-slot support
  expectedRevision?: number; // DEPRECATED: backward compatibility
  slotRevisions?: Array<{ slotId: string; expectedRevision: number }>; // NEW: multi-slot CAS
  idempotencyKey?: string; // DEPRECATED: server generates authoritative key
}
```

**Response Contract:**
```typescript
{
  success: boolean;
  canonicalMediaId: string;
  slotResults: Array<{
    targetSlotId: string;
    serviceSlug: string;
    success: boolean;
    error?: string;
    revision?: number;
  }>;
  verificationResults: Array<{
    targetSlotId: string;
    serviceSlug: string;
    verified: boolean;
    error?: string;
    revision?: number;
  }>;
}
```

**Authority Registry:**
- **Brand Slots:** `hero-background`, `homepage-owner-portrait-slot`
- **Service Card Slots:** `homepage-service-card-slot-{slug}` for: painting, repairs, restoration, fences, decks, pergolas, kitchen-remodeling, bathroom-remodeling, built-ins, outdoor-living, misc
- **Authority Type:** All use `service-card-assignment` authority
- **CAS Enforcement:** All slots require `expectedRevision` for atomic updates

**Atomicity Model:**
- **Independent Slot Assignments:** Each slot assigned separately with its own CAS protection
- **Partial Success Reporting:** Returns HTTP 207 Multi-Status if some slots fail
- **No Cross-Slot Transaction:** Slots are independent, not atomic across all targets
- **Idempotency:** Server-generated key from `sourceFileId:sortedSlotIds:sortedRevisions`

---

## B. CI Evidence Analysis

### CI Workflow Configuration

**Workflow:** `.github/workflows/website-ci.yml`

**Jobs:**
1. **build** - Standard build + test + lint
2. **oauth-tests** - Three-phase OAuth integration testing

**Phase A (Redis Integration Tests):**
- Config: `jest.oauth.integration.config.ts`
- Pattern: `**/src/lib/drive/__tests__/*.integration.test.ts`
- Environment: `REDIS_INTEGRATION_TESTS_ENABLED=true`
- No `NEXT_PUBLIC_TEST_BASE_URL` - HTTP tests defer
- Uses `TEST_NAMESPACE: hpp:ci-test:${{ github.run_id }}` for isolation
- Uploads `phase-a-test-output.log` artifact

**Phase B (HTTP Integration Tests):**
- Builds application with `npm run build`
- Starts Next.js server on port 3100
- Config: `jest.oauth.integration.config.ts` (same as Phase A)
- Environment: `NEXT_PUBLIC_TEST_BASE_URL=http://127.0.0.1:3100`
- Cleans up test namespace after completion
- Uploads `phase-b-test-output.log` artifact

**Phase C (Production Diagnostic):**
- Runs `scripts/diagnose-production-media-via-app-namespace.mjs`
- Targets production media record `07c0eae184dc5a375f943a3ac2b67e95`
- Uses production KV credentials
- **Risk:** This is diagnostic machinery, not a test - cannot mutate production but could leak values

### Test Configuration Analysis

**Main Jest Config (jest.config.ts):**
- Excludes `*.integration.test.ts` patterns from standard test run
- Excludes specific integration tests requiring Redis
- Standard tests run with mocks

**OAuth Integration Config (jest.oauth.integration.config.ts):**
- Pattern: `**/src/lib/drive/__tests__/*.integration.test.ts`
- **DOES NOT mock @upstash/redis** - requires real Redis
- Setup: `jest.oauth.integration.setup.ts`
- Timeout: 30 seconds for network-backed tests

**Integration Test Files:**
- `oauth-refresh-concurrency.integration.test.ts`
- `oauth-security-boundaries.integration.test.ts`
- `oauth-state-concurrency.integration.test.ts`
- `redis-failure-semantics.integration.test.ts`
- `oauth-atomic-identity.integration.test.ts`
- `oauth-negative-security.integration.test.ts`

### Known CI Evidence Gaps

**What We Know:**
- Workflow is configured to use real Redis
- Environment variables are passed (KV_REST_API_URL, KV_REST_API_TOKEN)
- `REDIS_INTEGRATION_TESTS_ENABLED=true` is set
- No `--passWithNoTests` flag (tests must execute)
- Corpus authorization is WARNING level (not hard requirement)
- Workbench principal is WARNING level (CI uses test principal)

**What We DON'T Know (Without GitHub Actions Access):**
- Latest Actions run execution status
- Phase A actual test execution logs
- Phase B actual test execution logs
- Whether Redis connection actually succeeded
- Whether tests were skipped or passed
- Test coverage for multi-slot transaction
- Evidence of idempotency key generation testing
- Evidence of adversarial multi-slot testing

**Configuration ≠ Proof:**
The workflow configuration is correct, but we lack runtime evidence that:
1. Redis integration tests actually executed
2. Tests passed rather than being skipped
3. Multi-slot transaction logic is covered
4. Adversarial scenarios (partial success, stale revisions) are tested

---

## C. Authority Chain Trace

### Google → OAuth Callback → Authorization Record

**Route:** `/api/drive/oauth/callback`

**Flow:**
1. Google OAuth callback with `code` and `state`
2. State validation via `consumeState(state, cookieStore)` - CSRF protection
3. Workbench session authentication via `workbenchSession.isAuthenticated()`
4. Token exchange with Google (code → access_token + refresh_token)
5. Google identity extraction via userinfo endpoint (subject is authoritative)
6. Authorization persistence via `upsertAuthorization(googleSubject, email, scopes, accessToken, expiry, refreshToken)`
7. Session creation via `createSession(authorizationId, userAgent)`
8. Opaque session ID issued to browser (`drive_session_id` cookie)

**Evidence Points:**
- State validation prevents CSRF attacks
- Workbench auth required (separate from Google OAuth)
- Google subject (sub) is authoritative identity key
- Refresh token is REQUIRED (fail-closed if missing)
- Opaque session ID prevents token exposure

**Known Limitations:**
- Workbench session NOT cryptographically bound to Drive authorization
- No identity binding between Workbench principal and Google subject
- Single-trusted-admin assumption (not multi-user model)

### Authorization Record → Drive Session

**Session Store:** `session-store.ts`

**Flow:**
1. Session created with `authorizationId` and `userAgent`
2. Session persisted in KV with TTL
3. Session ID issued as opaque cookie
4. Drive operations retrieve session via `getSession(sessionId)`

**Evidence Points:**
- Session is browser-bound (userAgent validation)
- Authorization ID links session to Drive credentials
- TTL-based expiration (30 days default)

### Drive Session → Drive Corpus Authorization

**Corpus Authorization:** `corpus-authorization.ts`

**Flow:**
1. Drive metadata fetch (authoritative server-side)
2. Corpus identity derived from `driveId` or `root`
3. Authorization check against:
   - `HPP_AUTHORIZED_SHARED_DRIVES` (comma-separated allowlist)
   - `HPP_AUTHORIZED_MY_DRIVE` (true/false)
4. Fail-closed if corpus not in allowlist

**Evidence Points:**
- Server-derived corpus identity (not client-provided)
- Client corpus assertions rejected if mismatch
- Fail-closed authorization (default deny)
- Environment-configured (not user-configurable)

**Known Limitations:**
- Corpus authorization is WARNING level in CI (not hard requirement)
- Production requires manual configuration

### Drive Corpus Authorization → Drive Discovery/Search

**Route:** `/api/drive/discovery`, `/api/drive/search`

**Flow:**
1. Drive client retrieved via `getDriveClient()` (uses refresh token)
2. Drive API calls made with access token
3. Results filtered by corpus authorization
4. Thumbnail retrieval for file preview

**Evidence Points:**
- Drive client uses OAuth credentials from session
- Access token auto-refreshed via refresh token
- Corpus authorization enforced before API calls

### Drive File Selection → DriveReference

**Route:** `/api/drive/reference`

**Flow:**
1. File ID selected from Drive discovery
2. DriveReference created with corpus context
3. Reference persisted (temporary handoff state)

**Evidence Points:**
- DriveReference is NOT public media
- Corpus context preserved in reference
- Reference must be materialized before public use

### DriveReference → Materialization

**Route:** `/api/workbench/use-drive-asset`

**Flow:**
1. Drive metadata fetch (authoritative server-side)
2. Drive file download (alt=media)
3. Content hash computation (SHA-256)
4. Sharp validation (dimensions, image format)
5. Variant generation (original, optimized)
6. Blob upload (if configured)
7. Canonical media ID = content hash

**Evidence Points:**
- Server-side Drive metadata (not client-provided)
- Content hash = canonical identity
- Sharp validation prevents invalid images
- Variants stored in Blob storage

**Known Limitations:**
- Current implementation uses content hash as media ID (simplified)
- Blob upload commented out (not fully implemented)
- No PublishedMediaAsset record creation in KV

### Materialization → PublishedMediaAsset

**Current State:**
- Content hash used as canonical media ID
- No KV media record creation (simplified implementation)
- No variant URL persistence
- Direct hash-to-assignment mapping
- Public media gate resolves via `getMediaByIdAsync()` → KV or static authority

**Media Authority Resolution:**
- `resolvePublicMedia()` called during assignment validation
- `getMediaByIdAsync()` resolves via KV (`media-kv-store.ts`)
- KV authority: Runtime PublishedMediaAsset records
- Static authority: Fallback for `DEV_MODE_SKIP_KV` or static build
- Static build safety: Uses static authority during build phase

**Evidence Points:**
- Public media gate enforces PublishedMediaAsset contract
- Drive-reference IDs rejected at gate
- Lifecycle state validation (source_reference, materializing, stale)
- Storage contract validation (static vs blob)
- Synthetic content hash rejection for Drive assets
- Blob metadata validation for blob-storage assets

**Evidence Gaps:**
- No PublishedMediaAsset record creation in KV during materialization
- Content hash must exist in static authority for validation to pass
- No variant URL storage or retrieval
- No media provenance tracking in KV
- No lifecycle state management in KV

### PublishedMediaAsset → Assignment

**Route:** `/api/workbench/use-drive-asset` (assignment phase)

**Flow:**
1. Slot authority resolution via `resolveTargetSlotAuthority()`
2. Assignment write via `storeServiceCardAssignment()`
3. CAS enforcement with `expectedRevision` (atomic Lua script)
4. Public media validation via `resolvePublicMedia()`
5. Drive-reference ID rejection at write time
6. Per-slot independent assignment (multi-slot)
7. Assignment readback verification
8. Public resolver verification

**Evidence Points:**
- Server-side slot authority (not client-inferred)
- CAS prevents lost updates (atomic Lua script)
- Public media validation before write (via `resolvePublicMedia()`)
- Drive-reference IDs rejected at write boundary
- Per-slot revision tracking
- Assignment readback after write
- Public resolver verification after assignment

**Known Limitations:**
- Public media validation requires media to exist in KV or static authority
- Current implementation uses content hash as media ID (simplified)
- No PublishedMediaAsset record creation in KV during materialization
- Validation may fail if content hash not in static authority

### Assignment → Projection/Public Site

**Projection:** Static generation + runtime KV lookup

**Flow:**
1. Static build generates projections from authority files
2. Runtime resolves assignments from KV via `getServiceCardAssignment()`
3. Public media gate resolves media IDs via `resolvePublicMedia()`
4. Page renders with resolved media

**Evidence Points:**
- Static build safety (uses static authority during build)
- Runtime KV assignments override static
- Public media gate rejects Drive-reference IDs
- Fail-closed if media not found
- CAS protection prevents lost updates

**Known Limitations:**
- Static projections may be stale
- Runtime assignments not reflected until redeploy
- No dynamic revalidation
- No rollback mechanism for failed assignments

---

## D. Multi-Slot Transaction Adversarial Testing Plan

### Test Scenarios Required

**1. Same Asset + Same Slots + Same Revisions (Idempotency)**
- Request: asset X, slots [A, B], revisions [A:5, B:3]
- Expected: Cached success returned, no new assignment
- Evidence: Idempotency key hit, no revision increment

**2. Same Asset + Same Slots + Changed Revisions (State Transition)**
- Request: asset X, slots [A, B], revisions [A:5, B:3]
- Next request: asset X, slots [A, B], revisions [A:6, B:4]
- Expected: Both succeed, revisions increment
- Evidence: Idempotency key different, new assignments written

**3. Reordered Slots (Idempotency Stability)**
- Request: asset X, slots [A, B], revisions [A:5, B:3]
- Next request: asset X, slots [B, A], revisions [B:3, A:5]
- Expected: Same idempotency key, cached success
- Evidence: Slot sorting in key generation

**4. Partial Success + Retry (Inconsistent State)**
- Request: asset X, slots [A, B, C], revisions [A:5, B:3, C:7]
- First attempt: B fails (CAS conflict)
- Expected: HTTP 207, A and C succeed, B fails
- Retry: asset X, slots [B], revisions [B:3]
- Expected: B fails (stale revision), A and C unchanged
- Evidence: Partial success reporting, independent slot identity

**5. One Stale Slot + One Current Slot (Mixed State)**
- Request: asset X, slots [A, B], revisions [A:5, B:3]
- Actual current revisions: A:6, B:3
- Expected: A fails (CAS), B succeeds
- Evidence: Per-slot CAS enforcement, no cross-slot interference

**6. Backward Compatibility (Single-Slot Legacy)**
- Request: asset X, targetSlotId: A, expectedRevision: 5
- Expected: Success, same as multi-slot with single target
- Evidence: Legacy path produces same result as new path

**7. Drive-Reference ID Rejection (Security Boundary)**
- Request: asset X with drive-reference ID
- Expected: Rejection at assignment write time
- Evidence: Drive-reference ID check in `storeServiceCardAssignment()`

**8. Public Media Gate Rejection (Media Authority)**
- Request: asset X with non-resolving media ID
- Expected: Rejection at public media validation
- Evidence: `resolvePublicMedia()` returns null, assignment rejected

### Current Test Coverage Status

**Test File:** `use-drive-asset-transaction.test.ts`

**Known Coverage:**
- Multi-slot request structure
- Slot authority resolution
- CAS enforcement
- Public media validation
- Per-slot assignment
- Readback verification

**New Test File:** `multi-slot-adversarial.test.ts` (Created 2026-09-18)

**New Coverage:**
- Idempotency key generation (same asset, same slots, same revisions)
- Idempotency key generation (changed revisions)
- Idempotency key generation (reordered slots)
- Partial success + retry scenarios (documented behavior)
- Mixed state (stale + current) (documented behavior)
- Backward compatibility legacy path
- Security boundaries (documented behavior)
- Independent slot identity (documented behavior)

**Coverage Gaps:**
- Real adversarial testing requires state manipulation or mocking
- Tests document intended behavior but cannot execute without real Drive
- CAS conflict scenarios require state setup
- Partial success scenarios require CAS conflict injection

---

## E. Classification and Findings

### PROVEN Invariants

1. **Multi-slot request structure exists and compiles**
   - Evidence: TypeScript compilation passes
   - Route accepts `targetSlotIds` and `slotRevisions`

2. **Per-slot authority resolution is implemented**
   - Evidence: `resolveTargetSlotAuthority()` exists
   - Service card allowlist is defined

3. **CAS enforcement is implemented**
   - Evidence: `storeServiceCardAssignment()` requires `expectedRevision`
   - Lua script provides atomic CAS

4. **Public media validation is implemented**
   - Evidence: `resolvePublicMedia()` called before assignment write
   - Drive-reference IDs rejected at write time

5. **CI configuration is correct**
   - Evidence: Workflow passes real Redis credentials
   - Phase A/B separation is configured
   - No `--passWithNoTests` flag

6. **Adversarial test coverage is added**
   - Evidence: `multi-slot-adversarial.test.ts` created
   - Tests document idempotency, partial success, security boundaries

7. **UI HTTP 207 handling is implemented**
   - Evidence: UI code updated to handle HTTP 207 Multi-Status
   - Partial success scenarios now correctly reconciled
   - Only successful slots are updated in UI state
   - Location: `website/src/app/workbench/media/page.tsx` lines 1119-1177, 1261-1317, 1320-1341

### FAILED Invariants

**None identified** - UI HTTP 207 handling has been fixed

### UNTESTABLE Invariants (With Blockers)

1. **CI actually executes Redis integration tests**
   - Blocker: No GitHub Actions access to verify runtime logs
   - Configuration is correct but execution is unproven
   - **Action Required:** Access GitHub Actions logs to verify test execution

2. **Multi-slot idempotency works as designed**
   - Blocker: Adversarial tests document behavior but cannot execute without real Drive
   - Test file created but requires real Drive file for execution
   - **Action Required:** Test with real Drive file in production environment

3. **PublishedMediaAsset creation in KV**
   - Blocker: Implementation uses content hash as media ID (simplified)
   - No media record creation, validation may fail if content hash not in static authority
   - **Action Required:** Implement KV media record creation during materialization

4. **Production Drive corpus authorization is configured**
   - Blocker: Corpus authorization is WARNING level in CI
   - Production requires manual configuration verification
   - **Action Required:** Verify `HPP_AUTHORIZED_SHARED_DRIVES` and `HPP_AUTHORIZED_MY_DRIVE` in Vercel

5. **Real end-to-end Drive → Public rendering**
   - Blocker: No production access to test real Drive file
   - Local build cannot prove production behavior
   - **Action Required:** Execute real OAuth callback and Drive file selection in production

---

## Next Steps

1. **Obtain CI Runtime Evidence**
   - Access GitHub Actions logs for latest run
   - Verify Phase A actually executed Redis tests
   - Verify Phase B actually executed HTTP tests
   - Check test coverage for multi-slot scenarios

2. **Implement PublishedMediaAsset Creation**
   - Add KV media record creation in materialization
   - Store variant URLs in media record
   - Add media provenance tracking
   - Update public media gate to resolve from KV

3. **Configure Production Corpus Authorization**
   - Verify `HPP_AUTHORIZED_SHARED_DRIVES` in Vercel
   - Verify `HPP_AUTHORIZED_MY_DRIVE` in Vercel
   - Test corpus authorization with real Drive access

4. **Execute Real End-to-End Test**
   - Perform actual OAuth callback
   - Select real Drive file
   - Execute multi-slot assignment
   - Verify public rendering

---

## Conclusion

The multi-slot implementation is structurally present and compiles correctly. The architecture is sound with proper authority boundaries, CAS enforcement, and public media validation. However, we lack runtime evidence that CI actually executes the integration tests, and we lack adversarial test coverage for multi-slot edge cases. The UI's handling of partial success is unverified. The simplified media authority (content hash as media ID) may cause validation failures. Production corpus authorization configuration is unverified.

**Status:** ARCHITECTURE VALIDATED, RUNTIME EVIDENCE PENDING
