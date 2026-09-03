# Production KV Reconciliation Execution Instructions (2026-09-03)

## Phase 1-2 Complete: Repository Inspection and Contract Verification

**Canonical Authority**: 96 records, all source=local, storage=static, lifecycleState=published
**KV Namespace**: hpp:production:media:{id}
**Reconciliation Contract**: Verified and correct
**saveMedia()**: Atomic Lua script with materialization state verification
**getMediaRecordRaw()**: Bypasses proof gate for reconciliation

## Phase 3: Execute Production Reconciliation

### Prerequisites

You need a valid Workbench session cookie to authenticate the reconciliation endpoint.

### Step 1: Get Workbench Session Cookie

1. Navigate to: https://happyplacecarpentry.com/admin
2. Authenticate with Workbench credentials
3. Open browser DevTools (F12)
4. Go to Application → Cookies → https://happyplacecarpentry.com
5. Find the `workbench_session_id` cookie
6. Copy the cookie value

### Step 2: Execute Reconciliation Script

```bash
cd website
WORKBENCH_SESSION_COOKIE=your_cookie_value node scripts/execute-production-reconciliation.mjs
```

### Expected Output

**Success Response**:
```json
{
  "testId": "static-media-reconciliation-...",
  "startTime": "2026-09-03T...",
  "endTime": "2026-09-03T...",
  "deploymentSha": "9edf4c4...",
  "environment": "production",
  "operation": "reconcile_static_media",
  "evidence": {
    "totalCanonical": 96,
    "classification": {
      "missing": X,
      "incomplete": Y,
      "validStatic": Z,
      "validBlob": W,
      "corrupt": 0,
      "synthetic": 0,
      "unexpected": 0
    },
    "repaired": N,
    "preserved": M,
    "failed": 0
  },
  "verdict": "SUCCESS"
}
```

**Critical Verification**: `failed = 0`

## Phase 4: Reconciliation Safety Barrier

The reconciliation script automatically performs dry-run classification before writing:
- Missing records
- Incomplete records
- Valid static records
- Valid blob records
- Corrupt records
- Synthetic records
- Unexpected records

**Preservation Rules**:
- Valid static records: preserved without modification
- Valid blob records: preserved without repair
- Blob records with incomplete data: preserved (not overwritten)
- Only missing/incomplete static records are repaired

## Phase 5: Write + Immediately Re-Read

After reconciliation, the script will:
1. Re-read every canonical ID that was repaired
2. Verify canonical record == KV record for all public resolution fields
3. Execute reconciliation a second time to prove idempotency

**Expected Second Run**:
- repaired = 0
- failed = 0

## Phase 6: Prove Public Media Boundary

After successful reconciliation, verify these production paths:
- Homepage hero: https://happyplacecarpentry.com
- Brand portrait: https://happyplacecarpentry.com
- Services: https://happyplacecarpentry.com/services
- Our Work: https://happyplacecarpentry.com/our-work
- Project pages: https://happyplacecarpentry.com/projects/{slug}
- Workbench media authority: https://happyplacecarpentry.com/api/workbench/media-authority

**Expected Transition**:
- MEDIA_KV null/incomplete → MEDIA_KV canonical
- Public media resolver → storage validated
- Public gate ACCEPT → real image rendered
- PUBLIC_GATE_REJECTED errors stop

## Phase 7: Fix Separate Drive invalid_grant

After media KV reconciliation, address the separate Drive OAuth failure:

**Problem**: Authorization c00d0121-239f-4c12-bfb7-7a950f10b38b has invalid_grant

**Solution**: Establish fresh Google OAuth authorization
1. Navigate to /workbench/media
2. Click "Connect Google Drive"
3. Complete Google consent
4. Verify /api/drive/auth/status
5. Verify /api/drive/discovery

## Phase 8: Final Proof

**Required Evidence**:
- MEDIA: canonical count, KV count before/after, repaired/preserved/failed counts, public gate result
- DRIVE: OAuth authorization status, Google identity/sub, session, Drive discovery, Shared Drive, folder navigation, search, thumbnail, ingestion, provenance
- SECURITY: legacy cookie rejection, revoked authorization rejection, thumbnail auth, production bypass disabled, Blob preservation, no Drive URLs as public media, no credentials in logs
- GIT: git status, git log -1, git branch

## Definition of Done

The task is DONE only when:
- canonical authority → production KV → public media gate → real site
- Google OAuth → authoritative authorization → session → Drive → Shared Drive → Media Workbench

Both work at runtime.

## CEO Rule Compliance

**DO NOT**:
- Add static fallbacks
- Weaken public media gate
- Disable authentication
- Honor DRIVE_AUTH_BYPASS in production
- Overwrite valid Blob records
- Replace canonical authority
- Delete media
- Fabricate records
- Create parallel media authority

**DO**:
- Make real production authority work
- Preserve all architectural boundaries
- Maintain security contracts
- Prove runtime evidence
