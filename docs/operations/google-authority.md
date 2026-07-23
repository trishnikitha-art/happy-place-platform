# Canonical Google Authority — Operations Reference

> **Purpose:** Single source of truth for the Happy Place Carpentry Google
> infrastructure. Read-only recovery document. **Contains no secret values.**
> Secret values live ONLY in the private PIGING90 Google Drive operations folder
> and in local `.env.local` (gitignored). Never commit secrets to Git.

## Canonical Authority Chain

```
PIGING90 Google Account
        ↓
Google Cloud Project (single, existing — do NOT create a new one)
        ↓
OAuth Client (single, existing — do NOT create a new one)
        ↓
Google APIs (Drive, Sheets, Gmail, Business Profile, Calendar, Places)
        ↓
Vercel Environment (production)
        ↓
Local .env.local (development)
        ↓
Happy Place Platform
```

Never create parallel authorities. Never fragment credentials. Never rotate
unless a credential is definitively, permanently unrecoverable.

## Where credentials live (no values here)

| Secret / Config        | Canonical Storage Location                                  |
|------------------------|-------------------------------------------------------------|
| `GOOGLE_CLIENT_ID`     | Google Cloud Console (OAuth Client) → mirrored to Drive     |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console (OAuth Client) → mirrored to Drive     |
| `GOOGLE_PROJECT_ID`    | Google Cloud Console (project settings)                    |
| `GOOGLE_REDIRECT_URI`  | Set per environment (see below)                            |
| `GOOGLE_REFRESH_TOKEN` | Password manager / Vercel secret store / Drive ops folder  |
| `GOOGLE_DRIVE_FOLDER_ID` | PIGING90 Google Drive (operational folder)               |
| `GOOGLE_PLACE_ID`      | Google Business Profile                                    |
| `VERCEL_TOKEN`         | Vercel project settings (CI only)                          |

## Canonical storage location (recovery source)

The **private PIGING90 Google Drive operations folder** is the recovery source
for authorized development machines. It holds an operational file
(`google-credentials.env` or `.env.production`) containing the existing values
only — copied from the canonical local `.env.local`, **not regenerated**.

To provision a new machine:
1. Authenticate to the PIGING90 Google account.
2. Open the private operations folder in Google Drive.
3. Download `google-credentials.env`.
4. Save as local `.env.local` (gitignored). Do not commit.

## Google Cloud Project

- **Single existing project.** Do not create a second project.
- Billing owner: PIGING90 account.
- OAuth owner: PIGING90 account.

## OAuth Client

- **Single existing OAuth client.** Do not create a second client.
- Authorized redirect URIs must include the production callback and the local
  dev callback. The local `.env.local` currently sets `GOOGLE_REDIRECT_URI` to
  the dev callback; production MUST override it via environment variable.

## Vercel Environment Variables (production)

Production requires these set in Vercel (they are currently **absent** — see
blocker below):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_REDIRECT_URI` → production callback (NOT localhost)
- `GOOGLE_REFRESH_TOKEN` (if server-side refresh is used)
- `NEXT_PUBLIC_SITE_URL`
- `ESTIMATE_TO_EMAIL`
- `VERCEL_TOKEN` (CI only)

## Production Redirect URI

`GOOGLE_REDIRECT_URI` in production must point to the production domain
callback, e.g. `https://<production-domain>/api/auth/google/callback`.
It must NOT default to `http://localhost:3000/...`.

> **LAUNCH BLOCKER (known):** `src/lib/google.ts` falls back to
> `http://localhost:3000/api/auth/google/callback` when `GOOGLE_REDIRECT_URI`
> is unset, and Vercel currently has no Google env vars set. This means
> production would silently use localhost. Resolution: set the production
> redirect URI in Vercel and add a fail-fast guard so the app errors instead
> of defaulting to localhost. (Documented, not yet implemented.)

## Secret names (reference only)

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_PROJECT_ID`,
`GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`,
`GOOGLE_PLACE_ID`, `GOOGLE_USE_MOCK`, `ESTIMATE_TO_EMAIL`,
`NEXT_PUBLIC_SITE_URL`, `VERCEL_TOKEN`.

## Repository rules (enforced)

- `.env*` is gitignored; only `.env.example` is committed (placeholders only).
- No secret value may ever be committed, printed, or copied into docs.
- Operational file for Drive handoff: `.env.production` (gitignored locally).

## Future workspace migration (plan only — do NOT execute now)

Documented strategy for migrating PIGING90 → Happy Place business account when a
trigger condition is met (first employee, Google Workspace adoption, business
billing, operational scale). Covers Cloud Project ownership transfer, billing
transfer, OAuth ownership, Drive ownership, Business Profile, and domain
ownership. Not performed at this time.
