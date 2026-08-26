# Git/Vercel/KV Consistency Verification Plan

**Last Updated:** 2026-01-10
**Purpose:** Verify the full chain: Git → Vercel → environment variables → KV → Blob → Google OAuth

---

## Verification Scope

### Chain Components

1. **Git Repository** (source of truth)
2. **Vercel Deployment** (runtime environment)
3. **Environment Variables** (configuration bridge)
4. **KV Store** (Upstash Redis - runtime authority)
5. **Blob Storage** (Vercel Blob - binary storage)
6. **Google OAuth** (Drive/Google integration)

---

## Verification Steps

### 1. Git Repository Verification

#### 1.1 Check Current Branch

```bash
cd C:\Users\nolan\CascadeProjects\happy-place-platform
git branch
git status
```

**Expected:**
- Branch: `main`
- Status: Clean (no uncommitted changes)

#### 1.2 Check Recent Commits

```bash
git log --oneline -10
```

**Expected:**
- Recent commits include:
  - P0-1: KV recovery/bootstrap authority mechanism
  - P0-2: Repository-wide resurrection-path search
  - P0-3: Review media gate bypass fix
  - P0-4: Application-level Drive authorization
  - P0-5: Shared Drive root semantics verification
  - P0-6: DriveListContext enforcement verification
  - P1-7: Materialization atomicity
  - P1-8: KV/Blob authority definition
  - P1-9: KV namespace/environment isolation
  - P1-10: Fail-closed semantics distinction
  - P2-11: OAuth scope/origin documentation update

#### 1.3 Check Remote Sync

```bash
git remote -v
git log origin/main..HEAD
git log HEAD..origin/main
```

**Expected:**
- Remote: `trishnikitha-art/happy-place-platform.git`
- No divergent commits (local and remote are in sync)

---

### 2. Vercel Deployment Verification

#### 2.1 Check Deployment Status

**Method:** Vercel Dashboard → happy-place-platform → Deployments

**Expected:**
- Latest deployment is from latest `main` commit
- Deployment status: Success
- Build time: < 5 minutes
- No build errors

#### 2.2 Check Production URL

**Production URL:** https://website-plum-three-68.vercel.app

**Verification:**
```bash
curl -I https://website-plum-three-68.vercel.app
```

**Expected:**
- HTTP 200 response
- Server: Vercel
- Content-Type: text/html

#### 2.3 Check Environment Variables

**Method:** Vercel Dashboard → Project → Settings → Environment Variables

**Required Variables:**
- `GOOGLE_CLIENT_ID` (Production)
- `GOOGLE_CLIENT_SECRET` (Production)
- `GOOGLE_REDIRECT_URI` (Production, optional)
- `KV_REST_API_URL` (Production)
- `KV_REST_API_TOKEN` (Production)
- `BLOB_READ_WRITE_TOKEN` (Production)

**Verification:**
- All required variables are set
- No placeholder values (e.g., "your-secret-here")
- Values are not exposed in build logs

---

### 3. Environment Variables Verification

#### 3.1 Verify Variable Priority

**Implementation:** `src/lib/media-kv-store.ts` (lines 20-46)

**Expected behavior:**
1. Primary: `KV_REST_API_URL` and `KV_REST_API_TOKEN`
2. Fallback: Integration-generated variables
3. Fail closed if neither set

**Verification:**
```bash
# Check if primary variables are set in Vercel
# Verify fallback logic in source code
```

#### 3.2 Verify OAuth Redirect URI Resolution

**Implementation:** All OAuth flows use the same pattern

**Expected behavior:**
1. Primary: `GOOGLE_REDIRECT_URI`
2. Fallback: `VERCEL_URL` (automatic in production)
3. Fallback: `http://localhost:3000` (development)

**Verification:**
- Production uses `https://website-plum-three-68.vercel.app/api/.../callback`
- Development uses `http://localhost:3000/api/.../callback`

---

### 4. KV Store Verification

#### 4.1 Check KV Connection

**Test:** Access `/api/admin/kv-bootstrap` endpoint

**Prerequisites:**
- Admin authentication
- KV credentials configured

**Verification:**
```bash
curl -X POST https://website-plum-three-68.vercel.app/api/admin/kv-bootstrap \
  -H "Content-Type: application/json" \
  -d '{"mode": "bootstrap"}'
```

**Expected:**
- HTTP 200 (if authenticated) or 401 (if not authenticated)
- Response includes KV health check
- No connection errors

#### 4.2 Check KV Data Integrity

**Test:** Access `/api/admin/system` endpoint

**Verification:**
```bash
curl https://website-plum-three-68.vercel.app/api/admin/system
```

**Expected:**
- HTTP 200 (if authenticated) or 401 (if not authenticated)
- Response includes KV statistics
- Media count matches expectations
- No corrupted records

#### 4.3 Check KV Bootstrap/Recovery

**Test:** Bootstrap route functionality

**Verification:**
- Bootstrap from static JSON works (if KV is empty)
- Recovery mode works (if KV has data)
- Audit trail is created
- Only PublishedMediaAsset records are imported (no DriveReference)

---

### 5. Blob Storage Verification

#### 5.1 Check Blob Connection

**Test:** Access `/api/admin/system` endpoint

**Verification:**
- Response includes Blob health check
- Blob is configured
- No connection errors

#### 5.2 Check Blob-KV Consistency

**Test:** Reconciliation endpoint

**Verification:**
```bash
curl https://website-plum-three-68.vercel.app/api/media/reconciliation
```

**Expected:**
- HTTP 200 (if authenticated) or 401 (if not authenticated)
- Response includes consistency report
- No Blob-KV mismatches
- No orphaned Blob records

---

### 6. Google OAuth Verification

#### 6.1 Check OAuth Configuration

**Method:** Google Cloud Console → APIs & Services → Credentials

**Verification:**
- OAuth 2.0 Client ID exists
- Authorized redirect URIs include:
  - `https://website-plum-three-68.vercel.app/api/drive/oauth/callback`
  - `https://website-plum-three-68.vercel.app/api/auth/google/callback`
- Authorized JavaScript origins include:
  - `https://website-plum-three-68.vercel.app`

#### 6.2 Test Drive OAuth Flow

**Test:** Access `/workbench/connectors` and click "Connect Drive"

**Verification:**
- OAuth redirect to Google works
- Google consent screen shows correct redirect URI
- Callback returns to production domain (not localhost)
- Session is established
- Drive integration works

#### 6.3 Test Secondary OAuth Flow

**Test:** Access secondary OAuth endpoint (if implemented)

**Verification:**
- OAuth redirect to Google works
- Google consent screen shows correct redirect URI
- Callback returns to production domain (not localhost)
- Session is established
- Gmail/Sheets/Contacts integration works

---

## Runtime Smoke Tests

### 7. Public Pages Smoke Test

#### 7.1 Homepage

**Test:** Access https://website-plum-three-68.vercel.app

**Verification:**
- HTTP 200 response
- Hero image loads (or renders nothing if not configured)
- Owner portrait loads (or renders nothing if not configured)
- Service cards load with images
- No console errors
- No broken images

#### 7.2 Project Pages

**Test:** Access https://website-plum-three-68.vercel.app/projects/{slug}

**Verification:**
- HTTP 200 response
- Project hero image loads (or renders nothing if not configured)
- Gallery images load (or render nothing if not configured)
- Before/after slider works (if configured)
- No console errors
- No broken images

#### 7.3 Our Work Page

**Test:** Access https://website-plum-three-68.vercel.app/our-work

**Verification:**
- HTTP 200 response
- Project cards load with images
- Lightbox works
- No console errors
- No broken images

---

### 8. Admin Pages Smoke Test

#### 8.1 Workbench

**Test:** Access https://website-plum-three-68.vercel.app/workbench

**Verification:**
- HTTP 200 response (if authenticated) or 302 redirect (if not)
- Workbench UI loads
- Media grid loads
- No console errors

#### 8.2 Admin Endpoints

**Test:** Access admin endpoints

**Verification:**
- `/api/admin/system` - returns system health
- `/api/admin/kv-bootstrap` - returns bootstrap status
- `/api/admin/metrics` - returns metrics (if implemented)
- All endpoints require authentication
- No sensitive data exposed without authentication

---

## Evidence Collection

### Required Evidence

1. **Git Evidence:**
   - Branch status screenshot
   - Recent commits screenshot
   - Remote sync status

2. **Vercel Evidence:**
   - Deployment status screenshot
   - Environment variables list (sanitized)
   - Build logs (no secrets)

3. **KV Evidence:**
   - KV health check response
   - Media count
   - Bootstrap/recovery response

4. **Blob Evidence:**
   - Blob health check response
   - Consistency report

5. **OAuth Evidence:**
   - Google Cloud Console configuration screenshot
   - OAuth flow test results
   - Session establishment confirmation

6. **Runtime Evidence:**
   - Homepage screenshot
   - Project page screenshot
   - Our Work page screenshot
   - Console logs (no errors)
   - Network tab (no 404s)

---

## Verification Script

### Automated Verification Script

```bash
#!/bin/bash
# Git/Vercel/KV Consistency Verification Script

echo "=== Git Repository Verification ==="
cd C:\Users\nolan\CascadeProjects\happy-place-platform
git branch
git status
git log --oneline -5
git remote -v

echo "=== Vercel Deployment Verification ==="
echo "Production URL: https://website-plum-three-68.vercel.app"
curl -I https://website-plum-three-68.vercel.app

echo "=== Runtime Smoke Tests ==="
echo "Homepage: https://website-plum-three-68.vercel.app"
echo "Our Work: https://website-plum-three-68.vercel.app/our-work"
echo "Workbench: https://website-plum-three-68.vercel.app/workbench"

echo "=== KV Health Check ==="
# Requires admin authentication
# curl https://website-plum-three-68.vercel.app/api/admin/system

echo "=== OAuth Configuration ==="
# Manual verification in Google Cloud Console
# https://console.cloud.google.com/apis/credentials

echo "=== Verification Complete ==="
```

---

## Verification Status

### Current Status

**Git Repository:** ✅ Verified
- Branch: main
- Status: Clean
- Remote: Synced

**Vercel Deployment:** ⏳ Pending
- Deployment status: Not verified
- Environment variables: Not verified
- Build logs: Not checked

**KV Store:** ⏳ Pending
- Connection: Not verified
- Data integrity: Not verified
- Bootstrap/recovery: Not tested

**Blob Storage:** ⏳ Pending
- Connection: Not verified
- Consistency: Not verified

**Google OAuth:** ⏳ Pending
- Configuration: Not verified
- Drive OAuth flow: Not tested
- Secondary OAuth flow: Not tested

**Runtime Smoke Tests:** ⏳ Pending
- Homepage: Not tested
- Project pages: Not tested
- Our Work page: Not tested
- Admin endpoints: Not tested

---

## Next Actions

### Immediate Actions

1. Verify Vercel deployment status
2. Check Vercel environment variables
3. Test KV health check endpoint
4. Test Blob health check endpoint
5. Verify Google Cloud Console configuration
6. Test Drive OAuth flow
7. Run runtime smoke tests

### Required Credentials

- Vercel dashboard access
- Upstash KV dashboard access
- Vercel Blob dashboard access
- Google Cloud Console access
- Admin authentication credentials

---

## Notes

- This verification plan requires access to production credentials
- Some verification steps require manual configuration in external services
- Runtime smoke tests require the site to be deployed and accessible
- All verification evidence should be collected and documented
- If any verification step fails, the issue must be reported and resolved before proceeding
