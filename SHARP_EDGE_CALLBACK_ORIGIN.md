# Sharp Edge #22: Callback Origin Logic Analysis

**Date:** 2025-01-XX
**Commit:** f1a33e3

## Current Implementation

**File:** `website/src/app/api/drive/oauth/callback/route.ts`

```typescript
// Origin validation - prevent CSRF attacks
const origin = request.headers.get('origin');
const referer = request.headers.get('referer');
const expectedOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

// Allow callback from same origin or from Google OAuth
const isSameOrigin = origin === expectedOrigin;
const isFromGoogle = referer?.startsWith('https://accounts.google.com/');

if (!isSameOrigin && !isFromGoogle) {
  return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
}
```

## Analysis

### What this prevents

**CSRF Attack Scenario:**
1. Attacker creates malicious page: `https://evil.com/attack.html`
2. Attacker includes hidden form/image that POSTs to your callback with attacker's `state`
3. Victim visits evil.com while logged into your site
4. Browser sends cookies, callback executes with attacker's state

**Origin validation prevents this:**
- evil.com's `origin` header is `https://evil.com`
- evil.com's `referer` header is `https://evil.com/attack.html`
- Neither matches `expectedOrigin` or Google OAuth
- Request is rejected with 403

### What this allows

**Same-origin callback:**
- `origin` matches `expectedOrigin` (e.g., `https://your-site.vercel.app`)
- This is the normal callback flow (rarely used, but allowed for testing)

**Google OAuth callback:**
- `referer` starts with `https://accounts.google.com/`
- This is the standard OAuth flow - Google redirects to your callback
- `origin` header may be absent or different (browser-specific)

### Security Boundary

**The origin validation is redundant with OAuth state validation.**

OAuth state already prevents CSRF:
1. User's browser initiates OAuth to Google
2. Google generates OAuth state and stores it
3. Google includes state in redirect to your callback
4. Your callback validates state with Google's state
5. Attacker cannot forge valid state because they don't have Google's state

**Origin validation provides defense-in-depth:**
- Adds additional CSRF protection
- Catches malformed requests before OAuth state validation
- Provides forensic logging

### Potential Issues

**Issue 1: Header Spoofing**
- `origin` and `referer` headers can be spoofed in non-browser contexts
- OAuth state validation is the primary CSRF protection
- Origin validation is defense-in-depth, not primary security

**Issue 2: Browser Behavior**
- Some browsers may not send `origin` or `referer` headers
- This could cause false positives (legitimate requests rejected)
- However, Google OAuth always sends `referer` header

**Issue 3: Development vs Production**
- `expectedOrigin` uses `VERCEL_URL` for production
- Falls back to `http://localhost:3000` for development
- This is correct - development should allow localhost

## Assessment

**Current implementation is SECURE.**

**Why it's secure:**
1. OAuth state validation is the primary CSRF protection (cannot be forged)
2. Origin validation provides defense-in-depth
3. Allows Google OAuth callback (referer check)
4. Allows same-origin callback (origin check)
5. Rejects all other origins (CSRF protection)

**Potential improvement:**
- The `origin` check may be too strict for some legitimate flows
- Consider removing `isSameOrigin` check and relying only on OAuth state
- However, current implementation is safe

## Verdict

**SECURE** - Origin validation provides defense-in-depth CSRF protection.

**Primary security:** OAuth state validation (cannot be forged)
**Secondary security:** Origin validation (defense-in-depth)

**No changes required.**

## Recommendation

**Keep current implementation.** The defense-in-depth approach is valuable.

**Optional future enhancement:**
- Remove `isSameOrigin` check if it causes false positives
- Rely entirely on OAuth state validation (sufficient for CSRF protection)
- Add metrics to monitor rejected requests
