# DRIVE OAUTH IMPLEMENTATION PLAN

**Date:** 2026-08-21
**Git SHA:** baa4148
**Status:** IMPLEMENTATION PLAN - ACTUAL CODE ANALYSIS

---

# GIT ARCHAEOLOGY + ACTUAL CODE ANALYSIS

## CURRENT IMPLEMENTATION GAP ANALYSIS

### 1. NEXTAUTH_SECRET ASSUMPTION INCORRECT ✅ CORRECTED

**My Previous Assumption:** Next.js cookies are signed using NEXTAUTH_SECRET
**Actual Code:** No usage of NEXTAUTH_SECRET in entire codebase
**Actual Implementation:** Uses Next.js `cookies()` from 'next/headers' directly
**Impact:** Architectural audit was wrong about cookie signing mechanism
**Correction:** Next.js cookies use default Next.js signing mechanism, not NextAuth.js

### 2. drive:auth:by:email INDEX ASSUMPTION

**My Previous Assumption:** Need email-based lookup for authorization records
**Actual Code:** No email-based lookup anywhere in current implementation
**Actual Implementation:** Direct cookie-to-credential mapping
**Impact:** Proposed index may be unnecessary
**Decision:** Defer email index until actual requirement proven

### 3. OAUTH STATE VALIDATION GAP ✅ CONFIRMED

**Current Code:** callback reads `state` but doesn't validate it
**Security Impact:** CSRF vulnerability
**Priority:** P0 - Security critical
**Evidence:** Line 20 in callback/route.ts reads state, no validation

### 4. SERVER-SIDE CREDENTIAL STORAGE GAP ✅ CONFIRMED

**Current Code:** All credentials in browser cookies
**Security Impact:** Refresh token in browser (plaintext)
**Priority:** P0 - Security + persistence
**Evidence:** drive-session.ts lines 111-117 set refresh_token cookie

### 5. ENCRYPTION GAP ✅ CONFIRMED

**Current Code:** No encryption at rest
**Security Impact:** Plaintext credentials in browser
**Priority:** P0 - Security
**Evidence:** No encryption utilities in codebase

### 6. SESSION/AUTHORIZATION SEPARATION GAP ✅ CONFIRMED

**Current Code:** No separation between session and authorization
**Architecture Impact:** Cannot implement multi-device support
**Priority:** P1 - Architecture
**Evidence:** Single cookie-based approach

---

# INFRASTRUCTURE ACTUALLY AVAILABLE

### EXISTING DEPENDENCIES
```json
"@upstash/redis": "^1.34.4"
"@vercel/blob": "^2.8.0"
"googleapis": "^144.0.0"
"sharp": "^0.35.3"
```

### EXISTING PATTERNS
- `media-kv-store.ts` - Redis KV pattern (mature)
- `blob-storage.ts` - Vercel Blob pattern (mature)
- `assignment-store.ts` - Redis KV with validation (mature)

### MISSING INFRASTRUCTURE
- Encryption utilities (none exist)
- OAuth state management (none exist)
- Session management (none exist)

---

# IMPLEMENTATION PLAN

## PHASE 1: OAUTH STATE VALIDATION (P0 SECURITY)

### CURRENT GAP
- Callback reads `state` but doesn't validate it
- CSRF vulnerability

### IMPLEMENTATION
1. Add OAuth state generation in authorize route
2. Store state in Redis with expiration (5 minutes)
3. Validate state in callback route
4. Reject mismatched/expired/reused state

### FILES TO MODIFY
- `website/src/app/api/drive/oauth/authorize/route.ts`
- `website/src/app/api/drive/oauth/callback/route.ts`

### NEW FILE
- `website/src/lib/drive/oauth-state-manager.ts`

### GATES
- State must be cryptographically random
- State must have short expiration
- State must be one-time use
- State validation must fail closed

---

## PHASE 2: SERVER-SIDE CREDENTIAL STORAGE (P0 SECURITY + PERSISTENCE)

### CURRENT GAP
- Refresh token in browser cookie (plaintext)
- No deployment-independent persistence

### IMPLEMENTATION
1. Create credential storage layer (Redis KV)
2. Add encryption utilities (AES-256-GCM)
3. Implement GoogleAuthorizationRecord
4. Implement BrowserSessionRecord
5. Add Redis namespace separation

### FILES TO CREATE
- `website/src/lib/drive/oauth-credential-store.ts`
- `website/src/lib/drive/encryption.ts`

### FILES TO MODIFY
- `website/src/lib/drive/drive-session.ts` (add server-side backing)
- `website/src/app/api/drive/oauth/callback/route.ts` (use server-side storage)

### GATES
- Credentials must be encrypted at rest
- Refresh token must never return to browser
- Session ID must be opaque
- No credentials in logs
- No credentials in media metadata

---

## PHASE 3: MIGRATION FROM COOKIES (P0 USER EXPERIENCE)

### CURRENT GAP
- Existing users have cookie-based credentials
- Need migration without forced reauth

### IMPLEMENTATION
1. Detect existing cookie credentials
2. Bootstrap server-side record from cookies
3. Set opaque session cookie
4. Remove old credential cookies only after successful migration
5. Fallback to cookies if migration fails

### FILES TO MODIFY
- `website/src/lib/drive/drive-session.ts` (add migration logic)
- `website/src/app/api/drive/oauth/callback/route.ts` (trigger migration)

### GATES
- Migration must be atomic
- Old cookies removed only after successful migration
- No forced unnecessary Google reauth
- Fallback to cookies if migration fails

---

## PHASE 4: TOKEN REFRESH SERIALIZATION (P1 RELIABILITY)

### CURRENT GAP
- Multiple concurrent refresh paths possible
- No single-flight protection

### IMPLEMENTATION
1. Add Redis-based lock for refresh operations
2. Serialize concurrent refresh requests
3. Add refresh failure classification
4. Implement retry with backoff

### FILES TO MODIFY
- `website/src/lib/drive/oauth-manager.ts` (add serialization)
- `website/src/lib/drive/oauth-credential-store.ts` (add locking)

### GATES
- One active refresh operation per authorization
- Other requests reuse resulting credential state
- Transient failures must not destroy credentials
- Permanent failures must invalidate authorization

---

## PHASE 5: DEPLOYMENT PERSISTENCE VERIFICATION (P0 RELIABILITY)

### CURRENT GAP
- Unknown if credentials survive Vercel deployment

### IMPLEMENTATION
1. Deploy to Vercel
2. Authenticate with Google Drive
3. Record session identifier
4. Deploy new Vercel revision
5. Verify same authorization survives
6. Verify access token expiry/refresh
7. Verify rollback behavior
8. Verify revoked token behavior

### GATES
- Authorization must survive deployment
- Access token must refresh automatically
- Rollback must not break authorization
- Revoked token must force reauth

---

# CORRECTED ARCHITECTURAL DECISIONS

## 1. NEXTAUTH_SECRET NOT INVOLVED ✅ CORRECTED

**Previous Assumption:** Cookies signed with NEXTAUTH_SECRET
**Actual:** Next.js cookies use default Next.js signing
**Decision:** Do not assume NEXTAUTH_SECRET involvement
**Implementation:** Use Next.js default cookie signing

## 2. EMAIL INDEX DEFERRED ✅ CORRECTED

**Previous Assumption:** Need drive:auth:by:email index
**Actual:** No email-based lookup in current implementation
**Decision:** Defer email index until actual requirement proven
**Implementation:** Start with authorization ID lookup only

## 3. SIMPLIFIED NAMESPACE STRATEGY ✅ CORRECTED

**Previous Assumption:** Multiple indexes (by user, by email)
**Actual:** Current implementation doesn't need these
**Decision:** Start with simple namespace
**Implementation:** Use drive:auth:{id} and drive:session:{id} only

---

# CORRECTED DATA MODEL

## GoogleAuthorizationRecord (SIMPLIFIED)
```typescript
interface GoogleAuthorizationRecord {
  id: string; // Authorization ID
  provider: 'google';
  googleSubject: string; // Google account ID
  email: string; // User email
  scopes: string[]; // Granted scopes
  encryptedRefreshToken: string; // Encrypted refresh token
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  lastRefreshAt: string; // ISO timestamp
  lastUsedAt: string; // ISO timestamp
  status: 'active' | 'revoked' | 'expired';
  credentialVersion: number; // For key rotation
}
```

## BrowserSessionRecord (SIMPLIFIED)
```typescript
interface BrowserSessionRecord {
  id: string; // Session ID
  authorizationId: string; // Link to GoogleAuthorizationRecord
  userAgent: string; // Browser identifier
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  lastSeenAt: string; // ISO timestamp
  revokedAt?: string; // ISO timestamp
}
```

## REDIS NAMESPACE (SIMPLIFIED)
```
drive:auth:{authorizationId} -> GoogleAuthorizationRecord
drive:session:{sessionId} -> BrowserSessionRecord
drive:state:{state} -> OAuth state record
```

---

# CORRECTED IMPLEMENTATION PRIORITY

1. **OAuth State Validation** (P0 Security)
   - CSRF protection first
   - One-time state consumption
   - State expiration

2. **Encryption Utilities** (P0 Security)
   - AES-256-GCM implementation
   - Key management
   - Error handling

3. **Credential Storage Layer** (P0 Security + Persistence)
   - Redis KV pattern
   - Encrypted credentials
   - Validation

4. **Session Management** (P0 Architecture)
   - Opaque session IDs
   - Session/authorization separation
   - Expiration handling

5. **Migration from Cookies** (P0 User Experience)
   - Cookie detection
   - Server-side bootstrapping
   - Atomic migration

6. **Token Refresh Serialization** (P1 Reliability)
   - Redis-based locking
   - Concurrent refresh protection
   - Failure classification

7. **Deployment Persistence Verification** (P0 Reliability)
   - Deploy and test
   - Verify deployment survival
   - Verify rollback behavior

---

# IMPLEMENTATION GATES (CORRECTED)

## Phase 1 Gates (OAuth State Validation)
- [ ] State must be cryptographically random
- [ ] State must have short expiration (5 minutes)
- [ ] State must be one-time use
- [ ] State validation must fail closed
- [ ] No state in logs
- [ ] Mismatched state rejected
- [ ] Expired state rejected
- [ ] Reused state rejected

## Phase 2 Gates (Encryption)
- [ ] AES-256-GCM implementation
- [ ] ENCRYPTION_KEY environment variable
- [ ] Key version support
- [ ] Error handling for encryption failures
- [ ] No keys in logs
- [ ] No plaintext in storage

## Phase 3 Gates (Credential Storage)
- [ ] Redis KV namespace separation
- [ ] Encrypted credentials at rest
- [ ] Schema validation
- [ ] No credentials in logs
- [ ] No credentials in browser
- [ ] Opaque session IDs only

## Phase 4 Gates (Migration)
- [ ] Cookie detection works
- [ ] Server-side bootstrapping works
- [ ] Migration is atomic
- [ ] Old cookies removed after success
- [ ] Fallback to cookies on failure
- [ ] No forced reauth

## Phase 5 Gates (Refresh Serialization)
- [ ] Redis-based locking works
- [ ] Concurrent refresh protected
- [ ] Transient failures don't destroy credentials
- [ ] Permanent failures invalidate authorization
- [ ] Retry with backoff works

## Phase 6 Gates (Deployment Verification)
- [ ] Authorization survives deployment
- [ ] Access token refreshes automatically
- [ ] Rollback doesn't break authorization
- [ ] Revoked token forces reauth
- [ ] Cookie session works across deployment

---

# STRING-SWAP GATE (UNCHANGED)

16 conditions from architectural specification remain required before string swaps.

---

# NEXT STEPS

1. **Implement Phase 1:** OAuth state validation
2. **Implement Phase 2:** Encryption utilities
3. **Implement Phase 3:** Credential storage layer
4. **Implement Phase 4:** Migration from cookies
5. **Implement Phase 5:** Token refresh serialization
6. **Implement Phase 6:** Deployment persistence verification
7. **Sharp Workstream:** Resume Sharp diagnostic work

---

**Status:** IMPLEMENTATION PLAN - ACTUAL CODE ANALYSIS COMPLETE
**Git SHA:** baa4148
**Evidence:** Git archaeology + actual code inspection + corrected assumptions
