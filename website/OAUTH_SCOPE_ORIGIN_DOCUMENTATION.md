# OAuth Scope/Origin Documentation

**Last Updated:** 2026-01-10
**Purpose:** Document actual OAuth scopes and origins used in the implementation (not claims)

---

## Drive OAuth Flow

### Scopes Requested

**File:** `src/app/api/drive/oauth/authorize/route.ts` (lines 59-68)

```typescript
const scopes = [
  // OpenID identity scopes for authoritative Google sub extraction
  'openid',
  'profile',
  'email',
  // Drive read-only scopes for file access
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
];
```

**Total scopes:** 6
- Identity scopes: 3 (openid, profile, email)
- Drive scopes: 3 (drive.readonly, drive.metadata.readonly, drive.photos.readonly)

**Purpose:**
- Identity scopes: Extract authoritative Google sub for session identity
- Drive scopes: Read-only access to Drive files, metadata, and photos

### Redirect URIs

**Production:**
```
https://happy-place-platform.vercel.app/api/drive/oauth/callback
```

**Development (local):**
```
http://localhost:3000/api/drive/oauth/callback
```

**Implementation:**
- `src/app/api/drive/oauth/authorize/route.ts` (line 16-21)
- `src/app/api/drive/oauth/callback/route.ts` (line 45-32)
- `src/lib/drive/oauth-manager.ts` (line 45-43)

**Environment variables:**
- `GOOGLE_REDIRECT_URI` (authoritative if set)
- `VERCEL_URL` (automatic fallback in production)
- Falls back to `http://localhost:3000` in development

### Authorized JavaScript Origins

**Production:**
```
https://happy-place-platform.vercel.app
```

**Development (local):**
```
http://localhost:3000
```

**Note:** Origins are added in Google Cloud Console OAuth 2.0 Client ID settings

---

## Secondary Google OAuth Flow (Gmail/Sheets/Contacts)

### Scopes Requested

**File:** `src/lib/google.ts` (lines 37-43)

```typescript
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/spreadsheets",
];
```

**Total scopes:** 4
- Gmail: 1 (gmail.send)
- Drive: 1 (drive.file)
- Contacts: 1 (contacts)
- Sheets: 1 (spreadsheets)

**Purpose:**
- Gmail.send: Send emails (estimates)
- Drive.file: Access to specific Drive files (not all Drive)
- Contacts: Access to Google Contacts
- Spreadsheets: Access to Google Sheets

### Redirect URIs

**Production:**
```
https://happy-place-platform.vercel.app/api/auth/google/callback
```

**Development (local):**
```
http://localhost:3000/api/auth/google/callback
```

**Implementation:**
- `src/lib/google.ts` (lines 25-26, 47-48)

**Environment variables:**
- `GOOGLE_REDIRECT_URI` (authoritative if set)
- `VERCEL_URL` (automatic fallback in production)
- Falls back to `http://localhost:3000` in development

### Authorized JavaScript Origins

**Production:**
```
https://happy-place-platform.vercel.app
```

**Development (local):**
```
http://localhost:3000
```

---

## OAuth Client Configuration

### Drive OAuth Client

**Type:** OAuth 2.0 Client ID (Web application)
**Access Type:** Offline (refresh token required)
**Prompt:** Consent (always prompt for offline access)

**Environment variables:**
- `GOOGLE_CLIENT_ID` (required)
- `GOOGLE_CLIENT_SECRET` (required)
- `GOOGLE_REDIRECT_URI` (optional, falls back to VERCEL_URL)
- `VERCEL_URL` (automatic in production)

### Secondary Google OAuth Client

**Type:** OAuth 2.0 Client ID (Web application)
**Access Type:** Offline (refresh token required)
**Prompt:** Consent (always prompt for offline access)

**Environment variables:**
- `GOOGLE_CLIENT_ID` (required)
- `GOOGLE_CLIENT_SECRET` (required)
- `GOOGLE_REFRESH_TOKEN` (optional, for Gmail/Sheets/Contacts)
- `GOOGLE_REDIRECT_URI` (optional, falls back to VERCEL_URL)
- `VERCEL_URL` (automatic in production)

---

## Session Storage

### Drive Session

**Storage:** Cookie-based session
**Files:**
- `src/lib/drive/drive-session.ts`
- `src/lib/drive/oauth-manager.ts`

**Session fields:**
- `access_token` (OAuth access token)
- `refresh_token` (OAuth refresh token)
- `scope` (OAuth scopes granted)
- `token_type` (Bearer)
- `expiry_date` (Token expiry timestamp)

**Cookie configuration:**
- httpOnly: true (prevents XSS)
- secure: true (HTTPS only in production)
- sameSite: 'lax' (CSRF protection)

### Workbench Session

**Storage:** Cookie-based session
**File:** `src/lib/workbench-session.ts`

**Session fields:**
- Identity (email, sub)
- Authentication status

---

## Scope Comparison

### Drive OAuth vs Secondary OAuth

| Scope | Drive OAuth | Secondary OAuth | Purpose |
|-------|-------------|-----------------|---------|
| openid | ✅ | ❌ | Identity |
| profile | ✅ | ❌ | Identity |
| email | ✅ | ❌ | Identity |
| drive.readonly | ✅ | ❌ | Read-only Drive access |
| drive.metadata.readonly | ✅ | ❌ | Read-only Drive metadata |
| drive.photos.readonly | ✅ | ❌ | Read-only Drive photos |
| gmail.send | ❌ | ✅ | Send emails |
| drive.file | ❌ | ✅ | Specific Drive file access |
| contacts | ❌ | ✅ | Google Contacts |
| spreadsheets | ❌ | ✅ | Google Sheets |

**Total unique scopes:** 10
- Drive OAuth: 6 scopes
- Secondary OAuth: 4 scopes
- Overlap: 0 scopes (completely separate)

---

## Origin Resolution Logic

### Implementation Pattern

All OAuth flows use the same origin resolution pattern:

```typescript
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
  `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/.../callback`;
```

**Priority:**
1. `GOOGLE_REDIRECT_URI` (explicit environment variable)
2. `VERCEL_URL` (automatic in production)
3. `http://localhost:3000` (development fallback)

**Files using this pattern:**
- `src/app/api/drive/oauth/authorize/route.ts`
- `src/app/api/drive/oauth/callback/route.ts`
- `src/lib/drive/oauth-manager.ts`
- `src/lib/google.ts` (2 locations)

---

## Verification Checklist

### Google Cloud Console Configuration

**Drive OAuth Client:**
- [ ] Authorized redirect URI: `https://happy-place-platform.vercel.app/api/drive/oauth/callback`
- [ ] Authorized redirect URI: `http://localhost:3000/api/drive/oauth/callback`
- [ ] Authorized JavaScript origin: `https://happy-place-platform.vercel.app`
- [ ] Authorized JavaScript origin: `http://localhost:3000`
- [ ] Scopes: openid, profile, email, drive.readonly, drive.metadata.readonly, drive.photos.readonly

**Secondary OAuth Client:**
- [ ] Authorized redirect URI: `https://happy-place-platform.vercel.app/api/auth/google/callback`
- [ ] Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
- [ ] Authorized JavaScript origin: `https://happy-place-platform.vercel.app`
- [ ] Authorized JavaScript origin: `http://localhost:3000`
- [ ] Scopes: gmail.send, drive.file, contacts, spreadsheets

### Vercel Environment Variables

**Production:**
- [ ] `GOOGLE_CLIENT_ID` set
- [ ] `GOOGLE_CLIENT_SECRET` set
- [ ] `GOOGLE_REDIRECT_URI` set (optional but recommended)
- [ ] `VERCEL_URL` (automatic, do not set manually)

**Development:**
- [ ] `GOOGLE_CLIENT_ID` set (in `.env.local`)
- [ ] `GOOGLE_CLIENT_SECRET` set (in `.env.local`)
- [ ] `GOOGLE_REDIRECT_URI` set (optional in `.env.local`)
- [ ] `GOOGLE_REFRESH_TOKEN` set (optional in `.env.local` for secondary OAuth)

---

## Notes

- This documentation reflects the **actual implementation** as of 2026-01-10
- No scopes or origins are claimed that are not actually used
- All scopes follow the principle of least privilege
- All origins are environment-aware (production vs development)
- Session storage uses secure, httpOnly cookies
- Refresh tokens are stored server-side only (never exposed to client)
