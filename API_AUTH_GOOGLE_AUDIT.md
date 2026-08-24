# /api/auth/google Independent Audit

**Date:** 2025-01-XX
**Commit:** 9a8553a
**Scope:** Independent audit of `/api/auth/google` OAuth implementation

## Executive Summary

`/api/auth/google` is a **separate OAuth implementation** from the Drive Media Workbench OAuth flow. It is a one-time setup route for capturing a Google refresh token for Gmail estimates and other workspace features. It does NOT use the session/authorization architecture audited for Drive OAuth.

---

## 1. Purpose and Scope

### Purpose
- One-time OAuth consent capture for the site owner
- Used to obtain a refresh token for Gmail estimates (per Directive 038)
- Used for Drive file, contacts, and spreadsheets access
- Server-side only - refresh token never exposed to browser

### Scopes
```typescript
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/spreadsheets",
];
```

### Security Contract
1. **Server-side only** - This module MUST NOT be imported by any client component
2. **Refresh token in env** - The refresh token is stored in `GOOGLE_REFRESH_TOKEN` environment variable
3. **No browser storage** - The browser never sees the refresh token
4. **One-time manual setup** - The owner visits this route once, copies the refresh token manually to env

---

## 2. Implementation

### File: `website/src/app/api/auth/google/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    // No code yet → redirect owner to Google consent.
    return NextResponse.redirect(getAuthUrl());
  }
  try {
    const oauth2 = getGoogleAuth();
    const { tokens } = await oauth2.getToken(code);
    // SECURITY: Never expose refresh_token to client
    // This route does NOT persist the refresh token - it only displays it for manual copy
    // The user must manually copy the refresh token to GOOGLE_REFRESH_TOKEN environment variable
    return NextResponse.json({
      ok: true,
      refresh_token_provided: !!tokens.refresh_token,
      note: "Refresh token was provided by Google. Copy it manually to GOOGLE_REFRESH_TOKEN environment variable. This route does not persist tokens automatically.",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
```

### File: `website/src/lib/google.ts`

```typescript
export function getGoogleAuth(): OAuth2Client {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/auth/google/callback`;
  const oauth2 = new google.auth.OAuth2(
    required("GOOGLE_CLIENT_ID"),
    required("GOOGLE_CLIENT_SECRET"),
    redirectUri,
  );
  const refresh = process.env.GOOGLE_REFRESH_TOKEN;
  if (refresh) oauth2.setCredentials({ refresh_token: refresh });
  return oauth2;
}
```

---

## 3. Comparison with Drive OAuth

| Aspect | /api/auth/google | Drive OAuth (/api/drive/oauth/*) |
|---|---|---|
| Purpose | Gmail estimates, workspace features | Drive Media Workbench |
| Refresh token storage | Environment variable (GOOGLE_REFRESH_TOKEN) | Encrypted in authorization repository (Redis) |
| Session management | None (server-side only) | Session store with opaque session ID cookie |
| Authorization record | None | Authorization repository with subject identity |
| Browser storage | None (refresh token never exposed) | Opaque session ID cookie (HTTP-only) |
| Scopes | gmail.send, drive.file, contacts, spreadsheets | drive.readonly, drive.metadata.readonly, drive.photos.readonly |
| State management | None | Redis-backed state with browser binding |
| Revocation | Manual (delete env var) | Atomic revocation with session cleanup |
| Token refresh | Automatic via googleapis | Custom callback with authorization update |

---

## 4. Security Analysis

### Strengths

1. **Server-side only** - The implementation is explicitly guarded against client-side imports
2. **No browser token storage** - Refresh token is never exposed to the browser
3. **Manual setup** - Owner must manually copy refresh token to env, reducing attack surface
4. **Separate credentials** - Uses separate OAuth client and scopes from Drive Media Workbench

### Weaknesses

1. **No session management** - No per-user sessions, all requests use the same refresh token
2. **No revocation path** - Revocation requires manual deletion of env var
3. **No atomic state management** - No CSRF protection via state parameter
4. **No audit trail** - No record of when refresh token was obtained or by whom
5. **Shared credential** - All operations use the same refresh token (owner's identity)

### Risk Assessment

**Risk Level:** MEDIUM

**Rationale:**
- This implementation is acceptable for its intended use case (owner-only Gmail estimates)
- The refresh token is server-side only and never exposed to browsers
- However, it lacks the security hardening present in the Drive OAuth implementation
- Should not be extended to multi-user scenarios without adding session/authorization architecture

---

## 5. Independence from Drive OAuth

### Credential Resolution Path

```
/api/auth/google
  → GOOGLE_REFRESH_TOKEN (environment variable)
    → getGoogleAuth()
      → google.auth.OAuth2 with refresh_token
        → googleapis (automatic token refresh)
```

### Drive OAuth Credential Resolution Path

```
/api/drive/oauth/*
  → drive_session_id cookie
    → Session Repository
      → Authorization Repository
        → Encrypted tokens
          → Decryption
            → OAuth Client
```

### Key Differences

1. **No session ID** - `/api/auth/google` does not use session IDs
2. **No authorization repository** - `/api/auth/google` does not use Redis authorization records
3. **No encryption** - `/api/auth/google` stores refresh token in plain text env var
4. **No browser binding** - `/api/auth/google` has no CSRF state or browser binding
5. **No revocation** - `/api/auth/google` has no atomic revocation path

---

## 6. Security Contract

### Contractual Guarantees

1. **Server-side only** - This module is never imported by client components
2. **No browser exposure** - Refresh token is never sent to the browser
3. **Manual setup** - Owner must manually copy refresh token to env
4. **Owner-only use** - All operations use the owner's refresh token

### Non-Guarantees

1. **Per-user isolation** - No per-user sessions or authorization records
2. **Automatic revocation** - No automatic revocation on compromise
3. **Audit trail** - No record of token usage or acquisition
4. **CSRF protection** - No state parameter or browser binding
5. **Multi-user support** - Not designed for multi-user scenarios

---

## 7. Recommendations

### Short-term (Acceptable for current use)

1. **Document usage** - Clearly document that this is owner-only and should not be extended to users
2. **Restrict scopes** - Ensure scopes are minimal for intended use
3. **Monitor usage** - Monitor Gmail API usage for anomalies

### Long-term (If extending to multi-user)

1. **Migrate to Drive OAuth architecture** - Use session/authorization repository pattern
2. **Add state management** - Add CSRF protection via state parameter
3. **Add revocation** - Add atomic revocation path
4. **Add audit trail** - Log token acquisition and usage
5. **Add encryption** - Encrypt refresh token at rest

---

## 8. Verdict

**Security Contract:** ACCEPTABLE for owner-only Gmail estimates

**Separation from Drive OAuth:** CONFIRMED - completely separate implementation

**Risk Level:** MEDIUM - acceptable for current use, should not be extended without hardening

**Runtime Evidence:** UNPROVEN - no Gmail estimate execution evidence obtained

---

## Conclusion

`/api/auth/google` is a separate OAuth implementation for owner-only Gmail estimates. It does not use the session/authorization architecture audited for Drive OAuth. The implementation is acceptable for its intended use case but should not be extended to multi-user scenarios without adding the security hardening present in the Drive OAuth implementation.

The two OAuth implementations are **independent** and should not be confused:
- `/api/auth/google` - Owner-only Gmail estimates, env var refresh token
- `/api/drive/oauth/*` - Drive Media Workbench, session/authorization repository
