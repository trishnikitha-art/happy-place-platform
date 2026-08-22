# DRIVE OAUTH AUTHORITY INTEGRATION FORENSIC REPORT

**Date:** 2026-08-21
**Git SHA:** 4de8297
**Status:** CRITICAL SECURITY VULNERABILITY FOUND - P0.5 BLOCKED
**Scope:** Whole-clone forensic re-inspection before OAuth integration

---

# A. REPOSITORY TRUTH

## HEAD
4de8297 - style: services page - lighten 'Not seeing what you're looking for' section

## Branch
main

## Working Tree
Clean (documentation files only, untracked)

## Relevant Commits
```
4de8297 style: services page - lighten 'Not seeing what you're looking for' section
739fef7 forensic: Drive OAuth P0 whole-clone inspection - architectural contradictions found
ee36a79 report: Drive OAuth P0 hardening gate closed
da3825f fix(auth): enforce Drive authorization session revocation - P0.4-H
43c5051 fix(auth): enforce Drive Google identity uniqueness - P0.3-H
2d7bcc2 fix(auth): harden Drive OAuth state authority - P0.1-H
```

---

# B. CURRENT CALL GRAPH

## ACTUAL LIVE FLOW
```
Google OAuth
    ↓
OAuth authorize route (authorize/route.ts)
    ↓
Google redirect (NO state validation)
    ↓
OAuth callback route (callback/route.ts)
    ↓
DriveSession.setCredentials() (cookies)
    ↓
Browser cookies (drive_access_token, drive_refresh_token, drive_expiry_date, drive_scope)
    ↓
DriveSession.getCredentials()
    ↓
OAuthManager.initialize()
    ↓
Drive API
```

## NEW AUTHORITY LAYERS (DISCONNECTED)
```
oauth-state-manager.ts (NOT called)
oauth-credential-store.ts (NOT called)
session-store.ts (NOT called)
encryption.ts (NOT called)
        ↓
      NOTHING
```

---

# C. CRITICAL SECURITY VULNERABILITY FOUND 🚨

## P0 SECURITY ISSUE: REFRESH TOKEN EXPOSED IN API RESPONSE

**FILE:** `website/src/app/api/auth/google/route.ts`

**VULNERABLE CODE (Lines 23-24):**
```typescript
refresh_token: tokens.refresh_token ?? "(already stored / not returned — use existing)",
note: "Copy refresh_token into GOOGLE_REFRESH_TOKEN env. Never expose to client."
```

**ISSUE:** The actual Google OAuth refresh token is being sent to the browser in the API response.

**IMPACT:** Credentials exposed to browser - violates credential boundary contract.

**SEVERITY:** P0 - Security boundary violation

**REQUIRED ACTION:** Remove refresh_token from API response immediately.

---

# D. ADDITIONAL FORENSIC FINDINGS

## FINDING A: OAuth State Creation Not Fully Atomic ✅ CONFIRMED

**FILE:** `oauth-state-manager.ts` Lines 128-129

**ISSUE:** `SET state` followed by `EXPIRE state` as separate operations

**FAILURE SCENARIO:**
- SET succeeds
- EXPIRE fails
- Result: State survives indefinitely (TTL not enforced)

**UPSTASH LIMITATION:** Cannot use `SET ... EX` through Upstash Redis client

**RECOMMENDATION:** Accept this limitation since Redis TTL at storage layer provides same guarantee, but document clearly.

---

## FINDING B: Browser Binding Is NOT Real Browser Authentication ✅ CONFIRMED

**FILE:** `oauth-state-manager.ts` Lines 100-102, 114

**ISSUE:** `browserBinding` is random nonce (`generateBrowserBinding()`), NOT tied to actual browser session

**ACTUAL CODE:**
```typescript
export function generateBrowserBinding(): string {
  return crypto.randomBytes(16).toString('hex');
}

const actualBrowserBinding = browserBinding || generateBrowserBinding();
```

**IMPACT:** Random value stored in Redis is NOT browser authentication

**REQUIRED ACTION:** Implement actual browser session binding before integration

---

## FINDING C: State Validation Conflates Security Failure with Infrastructure Failure ✅ CONFIRMED

**FILE:** `oauth-state-manager.ts` Lines 185-188

**ISSUE:** `validateState()` catches Redis errors and returns `false`

**ACTUAL CODE:**
```typescript
} catch (error) {
  console.error('[OAUTH_STATE] Failed to validate state:', error);
  return false;
}
```

**IMPACT:** `invalid OAuth state` OR `Redis unavailable` both return `false`

**REQUIRED ACTION:** Implement explicit error semantics

---

## FINDING D: Google Identity Uniqueness NOT Concurrency-Safe ✅ CONFIRMED

**FILE:** `oauth-credential-store.ts` Lines 236-273

**ISSUE:** `upsertAuthorization()` uses `findAuthorizationBySubject()` then creates new auth

**RACE CONDITION:**
```
Callback A → find subject → none
Callback B → find subject → none

Callback A → create auth A
Callback B → create auth B

Result: Duplicate active authorizations for same googleSubject
```

**REQUIRED ACTION:** Implement atomic subject acquisition (Redis SET NX or Lua)

---

## FINDING E: Authorization + Subject Index Multi-Step Writes ✅ CONFIRMED

**FILE:** `oauth-credential-store.ts` Lines 146-152

**ISSUE:** `storeAuthorization()` writes authorization record and subject index separately

**FAILURE SCENARIOS:**
- Authorization write succeeds, subject index write fails
- Subject index succeeds, authorization write fails

**IMPACT:** Index corruption, orphaned records

**REQUIRED ACTION:** Implement recovery semantics or Lua transaction

---

## FINDING F: Session Creation + Session Index Multi-Step Writes ✅ CONFIRMED

**FILE:** `session-store.ts` Lines 130-136

**ISSUE:** `createSession()` writes session record and session index separately

**FAILURE SCENARIOS:**
- Session record exists, session index missing
- Session index exists, session record missing

**IMPACT:** Orphaned sessions, session index corruption

**REQUIRED ACTION:** Implement recovery semantics or Lua transaction

---

## FINDING G: Session Index TTL vs Session Renewal Problem ✅ CONFIRMED

**FILE:** `session-store.ts` Lines 35-39, 136

**ISSUE:** Session index has 30-day TTL, but sessions can be renewed

**FAILURE SCENARIO:**
- Session renewed (30 days from now)
- Session index expires (30 days from creation)
- Result: `revokeAllSessionsForAuthorization()` cannot find renewed session

**REQUIRED ACTION:** Renew session index TTL when sessions are renewed

---

## FINDING H: Multiple Revocation Paths Without Single Authority ✅ CONFIRMED

**EXISTING OPERATIONS:**
- `revokeAuthorization()` (auth only)
- `revokeAuthorizationWithSessions()` (auth + sessions)
- `revokeAllSessionsForAuthorization()` (sessions only)
- `clearCredentials()` (cookies only)

**ISSUE:** No single authoritative revocation path

**REQUIRED ACTION:** Define single authoritative revocation semantics

---

# E. FAILURE MATRIX

| Failure | Current Result | Required Result |
|---------|----------------|------------------|
| Redis unavailable during authorize | N/A (no state creation) | No OAuth redirect / safe infrastructure error |
| Redis unavailable during callback | Credentials stored in cookies | Do not establish session |
| SET succeeds, EXPIRE fails (state creation) | State survives indefinitely | Atomic TTL or cleanup |
| Invalid state | N/A (no validation) | Reject callback |
| Expired state | N/A (no validation) | Reject callback |
| Replayed state | N/A (no validation) | Reject callback |
| Browser mismatch | N/A (no validation) | Reject callback |
| Google token exchange fails | Redirect with error | Preserve existing authorization |
| Google returns no refresh token | Preserve existing token | Preserve known-good refresh token |
| New refresh token persistence fails | Token lost | Retain old known-good token |
| Authorization write succeeds, subject index fails | Index corruption | Recovery or rollback |
| Session write succeeds, index fails | Orphaned session | Recovery or rollback |
| Cookie write fails | Session established server-side | Authorization remains server-side |
| Duplicate callback | Duplicate auth possible | Idempotent result |
| Concurrent callback | Duplicate auth possible | No duplicate active authorization |
| Invalid grant | Cookie cleanup only | Revoke authorization + associated sessions |
| Renewed session | Index may expire | Remains discoverable for revocation |

---

# F. P0.5 READINESS

**STATUS: BLOCKED** 🚨

**BLOCKERS:**
1. CRITICAL: Refresh token exposed in API response (P0 security vulnerability)
2. OAuth state creation not fully atomic
3. Browser binding is not real browser authentication
4. State validation conflates security failure with infrastructure failure
5. Google identity uniqueness not concurrency-safe
6. Authorization + subject index multi-step writes
7. Session creation + session index multi-step writes
8. Session index TTL vs session renewal problem
9. Multiple revocation paths without single authority

---

# G. ENCRYPTION KEY MANAGEMENT AUDIT

**FILE:** `encryption.ts` Lines 54-65

**KEY RETRIEVAL:**
```typescript
function getEncryptionKey(version: number = 0): Buffer {
  const keyEnv = version === 0 ? 'ENCRYPTION_KEY' : `ENCRYPTION_KEY_V${version}`;
  const key = process.env[keyEnv];
  
  if (!key) {
    throw new Error(`Missing required environment variable: ${keyEnv}`);
  }
  
  validateEncryptionKey(key);
  return Buffer.from(key, 'hex');
}
```

**FINDINGS:**
- Key validation: Exactly 32 bytes (64 hex characters)
- Key versioning: Supported via `ENCRYPTION_KEY_V{N}`
- Missing key: Fails closed (throws error)
- Malformed key: Fails closed (throws error)

**ISSUE:** No evidence of production vs preview separation

---

# H. CREDENTIAL LOGGING AUDIT

**CRITICAL FINDING:** `/api/auth/google/route.ts` Line 23

**VULNERABLE CODE:**
```typescript
refresh_token: tokens.refresh_token ?? "(already stored / not returned — use existing)",
```

**IMPACT:** Refresh token exposed to browser in API response

**REQUIRED ACTION:** Remove immediately

---

# I. RECOMMENDED NEXT SURGICAL PHASE

**PHASE 1: CRITICAL SECURITY FIX (IMMEDIATE)**
1. Remove refresh_token from `/api/auth/google/route.ts` API response
2. Implement secure server-side token storage for this route

**PHASE 2: AUTHORITY LAYER FIXES (BEFORE INTEGRATION)**
1. Fix state creation atomicity (document limitation or use atomic primitive)
2. Implement actual browser session binding
3. Implement explicit error semantics for state validation
4. Implement atomic subject acquisition for uniqueness
5. Implement recovery semantics for multi-step writes
6. Fix session index TTL vs session renewal problem
7. Define single authoritative revocation path

**PHASE 3: AUTHORITY INTEGRATION (AFTER FIXES)**
1. Integrate oauth-state-manager into OAuth authorize route
2. Integrate oauth-state-manager into OAuth callback route
3. Integrate oauth-credential-store into OAuth callback route
4. Integrate session-store into OAuth callback route
5. Adapt DriveSession to use new authority layers
6. Implement bounded legacy migration
7. Integrate OAuthManager
8. Handle invalid_grant → authorization + sessions revocation

---

# J. FINAL CEO GATE

**DO NOT START P0.5 YET** 🚨

**CRITICAL BLOCKER:** Refresh token exposed in API response (P0 security vulnerability)

**ADDITIONAL BLOCKERS:** 8 authority layer issues identified

**CEO STANDARD:** Evidence → Forensic Call Graph → Architecture → Surgical Fixes → Authority Integration → Focused Tests → Commit → Deploy → Runtime Verification → Drive Regression → Evidence

**EVIDENCE:** Whole-clone forensic re-inspection proves critical security vulnerability + 8 authority layer issues

**STATUS:** P0.5 BLOCKED - Critical security fix + authority layer fixes required first

**RECOMMENDED ACTION:** Fix critical security vulnerability immediately, then address authority layer issues before integration
