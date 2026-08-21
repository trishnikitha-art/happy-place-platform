# DRIVE SESSION PERSISTENCE AUDIT

**Date:** 2026-08-21
**Git SHA:** 616ac54
**Status:** COMPLETED — EVIDENCE CAPTURED

---

## AUDIT OBJECTIVE

Determine why the user is being forced to authenticate with Google Drive repeatedly after every few commits/deployments.

---

## EVIDENCE COLLECTED

### 1. OAuth Authorization Flow

**File:** `website/src/app/api/drive/oauth/authorize/route.ts`

**Configuration:**
```typescript
authUrl.searchParams.append('access_type', 'offline');  // ✅ PRESENT
authUrl.searchParams.append('prompt', 'consent');       // ✅ PRESENT
```

**Finding:** 
- `access_type=offline` is present ✅ (enables refresh token)
- `prompt=consent` is present ⚠️ (forces consent every time)

**Implication:** The `prompt=consent` parameter forces the user to grant consent every time they authenticate, even if they already have. This is likely causing the "repeated login" perception.

### 2. OAuth Callback Flow

**File:** `website/src/app/api/drive/oauth/callback/route.ts`

**Token Exchange:**
```typescript
const tokenData = await tokenResponse.json();
// Refresh token IS received and stored
await driveSession.setCredentials({
  access_token: tokenData.access_token,
  refresh_token: tokenData.refresh_token,  // ✅ PRESENT
  expiry_date: expiryDate,
  scope: tokenData.scope,
});
```

**Finding:** Refresh token IS received from Google and IS passed to DriveSession.

### 3. DriveSession Storage Mechanism

**File:** `website/src/lib/drive/drive-session.ts`

**Storage:**
```typescript
// All tokens stored in httpOnly cookies
cookieStore.set('drive_access_token', credentials.access_token, {
  httpOnly: true,
  secure: secureFlag,
  sameSite: 'lax',
  maxAge: 3600,  // 1 hour
  path: '/',
});

cookieStore.set('drive_refresh_token', credentials.refresh_token, {
  httpOnly: true,
  secure: secureFlag,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30,  // 30 days
  path: '/',
});
```

**Finding:**
- refresh_token stored in httpOnly cookie with 30-day maxAge ✅
- access_token stored in httpOnly cookie with 1-hour maxAge ✅
- All cookies are httpOnly (server-side only) ✅
- All cookies are secure in production ✅

**Storage Location:** Browser cookies (not server-side durable storage)

### 4. Automatic Token Refresh

**File:** `website/src/lib/drive/oauth-manager.ts`

**Refresh Logic:**
```typescript
// Proactive refresh if near expiry (within 5 minutes)
if (credentials.expiry_date && credentials.expiry_date - Date.now() < 5 * 60 * 1000) {
  await this.oauth2Client.refreshAccessToken();
}

// Automatic refresh on token event
this.oauth2Client.on('tokens', async (tokens: any) => {
  const currentCreds = await driveSession.getCredentials();
  await driveSession.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || currentCreds?.refresh_token,  // ✅ PRESERVES EXISTING
    expiry_date: tokens.expiry_date,
    scope: tokens.scope,
  });
});
```

**Finding:**
- Automatic token refresh is implemented ✅
- Refresh token is preserved if not provided in new tokens ✅
- Token refresh updates cookies ✅

### 5. Cookie Persistence Across Deployments

**Critical Question:** Do cookies survive Vercel deployments?

**Potential Issues:**
1. **Cookie Secret Rotation:** If Next.js cookie signing secret changes between deployments, cookies cannot be decrypted
2. **Domain Changes:** If domain changes between deployments, cookies are not sent
3. **Browser Cookie Policies:** Browser may reject cookies in certain contexts

**Evidence Required:**
- Verify if cookies persist across Vercel deployments
- Verify if cookie signing secret is stable across deployments
- Verify if domain is stable across deployments

---

## ROOT CAUSE ANALYSIS

### Likely Cause #1: prompt=consent Forces Repeated Consent

**Evidence:**
- `prompt=consent` is present in OAuth authorize URL
- This parameter forces Google to show consent screen every time
- User perceives this as "I have to log in again"

**Impact:** HIGH
**Confidence:** HIGH

### Likely Cause #2: Cookie Secret Rotation

**Evidence:**
- Cookies are signed/encrypted by Next.js
- If signing secret changes between deployments, cookies become invalid
- This would force re-authentication

**Impact:** HIGH
**Confidence:** MEDIUM (requires verification)

### Likely Cause #3: Access Token Expiry

**Evidence:**
- Access token has 1-hour maxAge
- User may wait longer than 1 hour between sessions
- Automatic refresh should handle this, but may not work in all contexts

**Impact:** MEDIUM
**Confidence:** LOW (automatic refresh should handle this)

---

## ARCHITECTURAL ASSESSMENT

### Current Architecture

```
Google OAuth
    ↓
access_token (1 hour cookie)
refresh_token (30 day cookie)
    ↓
DriveSession (reads from cookies)
    ↓
DriveOAuthManager (automatic refresh)
    ↓
Drive API
```

### Storage Location

**Current:** Browser cookies (httpOnly, 30-day maxAge for refresh_token)
**Ideal:** Server-side durable storage (database, Redis, etc.)

### Cookie-Based Storage Issues

1. **Browser-Bound:** Cookies are browser-specific, not server-specific
2. **Deployment-Sensitive:** Cookie signing secrets may change between deployments
3. **Device-Specific:** User cannot share session across devices
4. **Backup Issues:** Cannot backup/export session

---

## RECOMMENDED FIXES

### Fix #1: Remove prompt=consent (SHOULD KEEP prompt=consent ONLY ONCE)

**Change:**
```typescript
// Current
authUrl.searchParams.append('prompt', 'consent');

// Recommended
authUrl.searchParams.append('prompt', 'consent');  // Only on first login
// After first login, use prompt=none or omit prompt
```

**Implementation:**
- Track whether user has previously consented
- Use `prompt=consent` only on first login
- Use `prompt=none` or omit prompt on subsequent logins

### Fix #2: Verify Cookie Secret Stability

**Action:**
- Verify if Next.js cookie signing secret is stable across Vercel deployments
- If not stable, use fixed secret or environment variable

### Fix #3: Implement Server-Side Refresh Token Storage (LONG-TERM)

**Current:** Browser cookies
**Ideal:** Server-side durable storage (database, Redis, Vercel KV, etc.)

**Benefits:**
- Survives deployments
- Device-independent
- Backup/export capability
- More secure (not browser-bound)

---

## CEO DETERMINATION

**Evidence Collected:**
- ✅ access_type=offline is present
- ✅ refresh_token IS received from Google
- ✅ refresh_token IS stored in 30-day httpOnly cookie
- ✅ Automatic token refresh IS implemented
- ✅ Refresh token preservation IS implemented
- ⚠️ prompt=consent forces consent every time
- ❓ Cookie secret stability across deployments not verified
- ❓ Cookie persistence across deployments not verified

**Most Likely Root Cause (UX):**
`prompt=consent` forces user to grant consent every time, creating the perception of "repeated login."

**Root Cause (Architectural):**
Refresh token stored in 30-day browser cookie, not server-side durable storage. Cookie may not survive Vercel deployments if signing secret changes.

**Recommendation:**
1. Remove `prompt=consent` after first login (use only on initial consent)
2. Omit prompt on subsequent logins (Google recommends user prompted only first time project requests access)
3. Verify cookie secret stability across Vercel deployments
4. Implement server-side refresh token storage for long-term solution

---

## NEXT STEPS

1. **Immediate Fix:** Remove `prompt=consent` after first login
2. **Verification:** Test if cookies persist across Vercel deployments
3. **Long-Term:** Implement server-side refresh token storage

---

## PROVENANCE

**Git SHA:** 616ac54
**Audit Date:** 2026-08-21
**Evidence Sources:**
- website/src/app/api/drive/oauth/authorize/route.ts
- website/src/app/api/drive/oauth/callback/route.ts
- website/src/lib/drive/drive-session.ts
- website/src/lib/drive/oauth-manager.ts

**Audit Lead:** Devin AI
