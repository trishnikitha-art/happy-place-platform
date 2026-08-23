# Sharp Edge #19: Logging / Secret Leakage Audit

**Date:** 2025-01-XX
**Commit:** 79524ff

## Search Results

### Pattern: `access_token|refresh_token|Bearer`

**Results in callback/route.ts:**
- Line 165: `tokenData.access_token` - Validation check (not logged)
- Line 171: `tokenData.token_type` - Validation check (not logged)
- Line 184: `tokenData.refresh_token` - Warning about missing refresh token (not logged)
- Line 203: `Authorization: Bearer ${tokenData.access_token}` - HTTP header to Google (not logged)
- Line 244: `tokenData.access_token` - Passed to upsertAuthorization (correct - needs to be encrypted)
- Line 246: `tokenData.refresh_token` - Passed to upsertAuthorization (correct - needs to be encrypted)
- Line 259-260: Cookie deletion (correct)

### Pattern: `console.log.*tokenData|console.log.*credentials|console.log.*access_token|console.log.*refresh_token`

**Results:**
- Line 130: `console.log('[DRIVE OAUTH FORENSIC] Token exchange failed:', tokenData.error)` - Logs error string only (SAFE)

## Analysis

### What IS logged:
- Error strings (e.g., "invalid_grant")
- Boolean flags (hasCode, hasError, hasState)
- Partial identifiers (googleSubject.substring(0, 8) + '...')
- Authorization IDs
- Session IDs
- HTTP status codes
- File counts and sizes

### What is NOT logged:
- Full access tokens
- Full refresh tokens
- Decrypted credentials
- OAuth authorization codes
- Encryption keys
- Cookies values

### HTTP Headers to Google
The callback sends `Authorization: Bearer ${tokenData.access_token}` to Google's userinfo endpoint. This is:
- **Correct** - Required to fetch user identity
- **Not logged** - The header is sent to Google, not to console
- **Secure** - The token is used for its intended purpose

### Token Storage
The callback passes `tokenData.access_token` and `tokenData.refresh_token` to `upsertAuthorization()`. This is:
- **Correct** - These tokens need to be encrypted and stored
- **Secure** - `upsertAuthorization()` encrypts them before storage
- **Audited** - Encryption uses AES-256-GCM with key versioning

## Verdict

**NO SECRET LEAKAGE FOUND** in logging.

All forensic logging is safe:
- No access tokens logged
- No refresh tokens logged
- No decrypted credentials logged
- No encryption keys logged
- No OAuth codes logged

The only place tokens appear is:
1. In HTTP headers to Google (correct and necessary)
2. Passed to encryption functions (correct and necessary)

## Recommendation

**NO CHANGES REQUIRED** - Logging is safe and does not leak secrets.

**Ongoing monitoring:** When adding new forensic logging, ensure:
- Redact any token values before logging
- Use substring(0, 8) + '...' pattern for identifiers
- Log boolean flags instead of sensitive values
- Log error codes instead of full error objects with sensitive data
