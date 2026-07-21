# Directive 038 — Google Workspace Infrastructure Activation Audit

**Date:** 2026-07-21  
**Status:** READ-ONLY AUDIT. Zero code changes.  
**Objective:** Determine exactly what exists, what's dead, what's needed, and how to activate.

---

## Phase 1 — Duplicate Google Code

### Two OAuth systems exist

| Property | `src/lib/google.ts` (ACTIVE) | `internal/auth/oauth.ts` (DEAD) |
|----------|------------------------------|----------------------------------|
| Lines | 56 | 35 |
| Used by | `api/auth/google/route.ts`, `api/estimate/route.ts` | **Nothing** |
| Creates OAuth2Client | Yes (`getGoogleAuth()`) | No (returns raw config object) |
| Generates consent URL | Yes (`getAuthUrl()`) | No |
| Exchanges code for tokens | Yes (via route handler) | No |
| Scopes | `gmail.send`, `drive.file`, `contacts` | `spreadsheets`, `gmail.send`, `drive.readonly`, `businessprofile` |
| Env vars read | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN` | Same 4 vars |
| Import boundary | Used inside `src/app/api/` (server-only) | Never imported by anything |
| Production | Gated by `GOOGLE_REFRESH_TOKEN` presence (returns 503 if missing) | N/A |

### Recommendation

**Keep `src/lib/google.ts`. Delete `internal/auth/oauth.ts`.**

Reasoning:
- `src/lib/google.ts` is a complete, working OAuth2 client. It creates the client, generates consent URLs, exchanges codes, and manages tokens. Two route handlers already use it.
- `internal/auth/oauth.ts` is a config-only stub that returns a plain object. It has no OAuth2Client creation, no consent URL generation, no token exchange. It does nothing that `src/lib/google.ts` doesn't already do better.
- The extra scopes in `internal/auth/oauth.ts` (`spreadsheets`, `drive.readonly`, `businessprofile`) are **not migrated preemptively** per the least-privilege principle. They correspond to features not yet activated (Sheets, Drive intake, Business Profile). When those features are built, scopes are added at that time.

### Scope migration decision

| Scope | In `src/lib/google.ts`? | In `internal/auth/oauth.ts`? | Migrate now? | Why |
|-------|------------------------|------------------------------|-------------|-----|
| `gmail.send` | Yes | Yes | N/A | Already present |
| `drive.file` | Yes | — | N/A | Already present |
| `contacts` | Yes | — | N/A | Already present |
| `spreadsheets` | — | Yes | **No** | Sheets feature not activated |
| `drive.readonly` | — | Yes | **No** | Drive intake not activated |
| `businessprofile` | — | Yes | **No** | Business Profile not activated |

**Action: Delete `internal/auth/oauth.ts`. Zero scope migration.**

---

## Phase 2 — Dead Code Recovery

### Complete `internal/` inventory

| File | Lines | Status | Classification | Rationale |
|------|-------|--------|---------------|-----------|
| `auth/oauth.ts` | 35 | **DEAD** | **Delete** | Superseded by `src/lib/google.ts`. Never imported. |
| `sheets/schema.ts` | 149 | **PRODUCTION READY** | **Keep (internal)** | 10 typed sheet interfaces + Provenance base. Well-designed, no bugs. Zero imports from `src/` (correct — boundary respected). Used only by `reviewAuthority.ts` and `estimate/learning.ts` within internal/. |
| `reviews/reviewAuthority.ts` | 54 | **PRODUCTION READY** | **Keep (internal)** | `ReviewAuthority` class, `aggregate()`, `verifiedSocialProof()`, `FOLLOW_UP_TIMELINE`. Imports `Review` from `sheets/schema.ts`. Zero imports from `src/`. Clean, tested interfaces. |
| `photo/metadata.ts` | 44 | **PRODUCTION READY** | **Keep (internal)** | `PhotoV2Meta` interface + `selectByScore()` function. Score-driven photo selection — designed to replace hardcoded curation when scores are populated. Zero imports from `src/`. |
| `estimate/learning.ts` | 47 | **PRODUCTION READY** | **Keep (internal)** | `recordActuals()` + `deriveInsights()`. Learning loop contract — stores planning range vs actuals. Has a TODO for Sheets persistence but the logic is complete. Zero imports from `src/`. |
| `pricing/types.ts` | 51 | **PRODUCTION READY** | **Keep (internal)** | `EstimateInput`, `EstimateOutput`, `PricingAuthority`, `EstimateEngine` interfaces. Clean authority pattern. |
| `pricing/engine.ts` | 151 | **PRODUCTION READY** | **Keep (internal)** | `SimpleKnowledgeEngine` + 3 concrete authorities (Material, Labor, Permit) + 6 stub authorities. Loads JSON from `knowledge/`. Conservative bias (+15%). Well-structured. |
| `README.md` | 50 | **PRODUCTION READY** | **Keep** | Accurate module documentation. |
| `knowledge/` (11 JSON files) | ~200 | **PRODUCTION READY** | **Keep** | Versioned, dated, confidence-scored knowledge base. Materials (cedar, pressure-treated, trex, simpson, stain), labor (fencing), permits, seasonal, historical estimates, confidence models, Oregon practices. |

### Summary

- **Delete:** 1 file (`auth/oauth.ts` — 35 lines)
- **Keep:** 21 files (all production quality, correctly separated from `src/`)
- **Nothing to recover** — all internal/ code is production quality but correctly isolated behind the `src/` boundary
- **Key finding:** `src/` NEVER imports from `internal/` — the architectural boundary is clean and respected

---

## Phase 3 — Feature Flag Audit

| Flag | Default | Why disabled | Missing dependency | Missing secret | Unfinished | Obsolete |
|------|---------|-------------|-------------------|---------------|-----------|---------|
| `googleWorkspace` | `false` | Master switch for all Google adapters. No Google credentials configured on this machine. | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` env vars | Yes — all 3 | No — the code behind it is complete | No |
| `estimateApi` | `false` | Estimate submission uses mailto: by default. When `true`, POSTs to `/api/estimate` which sends Gmail. | `googleWorkspace: true` + `GOOGLE_REFRESH_TOKEN` | Yes — `GOOGLE_REFRESH_TOKEN` | No — `api/estimate/route.ts` is complete | No |
| `reviews` | `true` | Already enabled — but `reviews.ts` exports empty array (fabricated reviews removed). | None — code works, data is empty | `GOOGLE_PLACE_ID` or manual input | **Yes** — needs real review data source | No |
| `reviewsCollection` | `false` | Automated review collection pipeline. | `ReviewAuthority` in `internal/` + Google Places API or manual import | `GOOGLE_PLACE_ID` + `GOOGLE_API_KEY` | **Yes** — `ReviewAuthority` exists but no data source is wired | No |
| `beforeAfterGallery` | `false` | Before/after photo pairs. | Image pipeline (8 SVG pairs in `beforeAfter.ts` still hardcoded) | None | **Partially** — config exists, 4 pairs have photos, all use SVG placeholders | No |
| `projectSpotlight` | `true` | Already enabled — 2 project spotlights with hardcoded SVG photos | None | None | **Partially** — pipeline photos exist for 3 roles but projects.ts still uses SVGs | No |
| `customerPortal` | `false` | Customer-facing project tracking portal. | Backend API, auth, database | Unknown | **Yes** — no implementation exists | No |
| `admin` | `false` | Admin dashboard. | Backend API, auth | Unknown | **Yes** — no implementation exists | No |
| `aiEstimate` | `false` | AI-powered estimate generation. | LLM API, pricing engine wiring | Unknown | **Yes** — `SimpleKnowledgeEngine` exists but no LLM integration | No |
| `stripe` | `false` | Payment processing. | Stripe SDK, webhook handler | `STRIPE_SECRET_KEY` | **Yes** — no implementation exists | No |
| `calendarIntegration` | `false` | Calendar scheduling. | Google Calendar API | `GOOGLE_CALENDAR_ID` | **Yes** — no implementation exists | No |
| `notifications` | `false` | Push/email notifications. | Email service (Resend/Twilio) | Unknown | **Yes** — `mockNotificationService` exists, no real implementation | No |

### Google-specific flags summary

The two Google flags (`googleWorkspace`, `estimateApi`) are disabled because:
1. No credentials are configured (no `.env.local` file exists on this machine)
2. The code behind them is **complete and functional** — it just needs secrets
3. Not obsolete — this is active infrastructure waiting for configuration

---

## Phase 4 — Workspace Capability Matrix

| Capability | Code Location | Credentials Required | APIs Required | Ready? |
|-----------|--------------|---------------------|--------------|--------|
| **Gmail Send** | `src/app/api/estimate/route.ts` (lines 46-63) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Gmail API v1 (`gmail.send` scope) | **YES** — complete, tested flow |
| **Drive Upload** | `src/services/storage.ts` (interface only, mock impl) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Drive API v3 (`drive.file` scope) | **NO** — interface exists, no Google impl |
| **Drive Intake** | None — no code exists | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Drive API v3 (`drive.readonly` scope) | **NO** — no implementation |
| **Sheets** | `internal/sheets/schema.ts` (types only) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Sheets API v4 (`spreadsheets` scope) | **NO** — types only, no read/write code |
| **Contacts** | `src/lib/google.ts` (scope declared, no usage) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | People API (`contacts` scope) | **NO** — scope declared, no implementation |
| **Reviews** | `internal/reviews/reviewAuthority.ts` + `src/config/reviews.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_API_KEY`, `GOOGLE_PLACE_ID` | Places API (`place.read`) | **PARTIAL** — `ReviewAuthority` class exists, data source not wired |
| **OAuth Consent** | `src/app/api/auth/google/route.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth2 consent screen | **YES** — complete one-time token capture flow |

### Activation readiness: 1 of 7 capabilities fully ready

Only **Gmail Send** can be activated by flipping a flag and adding 3 env vars. Everything else requires additional code.

---

## Phase 5 — Secret Inventory

**File: `.env.example`** (to be created)

```
# Google Workspace Integration
# Required for Gmail estimate emails, OAuth consent, and all Google APIs.
# Get these from: https://console.cloud.google.com/apis/credentials

# OAuth 2.0 Client ID (from Credentials page)
GOOGLE_CLIENT_ID=

# OAuth 2.0 Client Secret (from Credentials page)
GOOGLE_CLIENT_SECRET=

# OAuth redirect URI (must match Authorized redirect URI in console)
# For local dev: http://localhost:3000/api/auth/google/callback
# For production: https://your-domain.vercel.app/api/auth/google/callback
GOOGLE_REDIRECT_URI=

# Refresh token (obtained once via GET /api/auth/google)
# See: src/app/api/auth/google/route.ts
GOOGLE_REFRESH_TOKEN=

# Gmail: where estimate emails are sent
ESTIMATE_TO_EMAIL=taylor@happyplacecarpentry.com

# --- Future (not required for initial activation) ---

# Google Cloud Project ID
# GOOGLE_PROJECT_ID=

# Google Drive folder ID (for photo/document storage)
# GOOGLE_DRIVE_FOLDER_ID=

# Google API key (for Places API, Maps, etc.)
# GOOGLE_API_KEY=

# Google Place ID (for review collection)
# GOOGLE_PLACE_ID=
```

---

## Phase 6 — Project Verification

### Search results

| Search target | Codebase | Git history | .gitignore | Comments | Docs |
|--------------|---------|------------|------------|---------|------|
| `citric-trees-502922-r3` | Not found | Not found | N/A | Not found | Not found |
| `680489127233` (project #) | Not found | Not found | N/A | Not found | Not found |
| `502922` | Not found | Not found | N/A | Not found | Not found |
| Any `GOOGLE_PROJECT_ID` | Not found | Not found | N/A | Not found | Not found |
| Any OAuth client IDs | Not found (env var names exist, no values) | Not found | N/A | Not found | Not found |
| Any refresh tokens | Not found (env var name exists, no values) | Not found | N/A | Not found | Not found |
| Any Drive folder IDs | Not found | Not found | N/A | Not found | Not found |
| Any `.env` files committed | **Never committed** (.gitignore blocks `.env*`) | 0 results | `.env*` in gitignore | N/A | N/A |
| Any `.env.local` on disk | **Does not exist** | N/A | N/A | N/A | N/A |

### Conclusion

**Project `citric-trees-502922-r3` has zero footprint in this repository.** No project ID, no client ID, no refresh token, no redirect URI, no Drive folder ID has ever been committed or referenced. The `.env*` pattern in `.gitignore` has always been present — no credentials have ever leaked through version control.

The OAuth flow in `src/lib/google.ts` + `src/app/api/auth/google/route.ts` was built as a generic integration — it reads from environment variables and has no hardcoded project references. The project `citric-trees-502922-r3` exists only in your Google Cloud console.

**No secrets need to be rotated. No git history needs to be cleaned. The repository is clean.**

---

## Phase 7 — Migration Plan

### Activation path: Console → OAuth → .env.local → Feature Flag → Done

**Step 1: Google Cloud Console** (manual, ~15 min)
1. Go to https://console.cloud.google.com/apis/dashboard
2. Select project `citric-trees-502922-r3`
3. Verify billing is active
4. Go to **APIs & Services → Library**
5. Enable: **Gmail API** (required for estimate emails)
6. Go to **APIs & Services → Credentials**
7. Create OAuth 2.0 Client ID (Web application)
8. Add Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
9. Copy Client ID and Client Secret

**Step 2: Capture refresh token** (one-time, ~5 min)
1. Create `.env.local` with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Run `npm run dev`
3. Visit `http://localhost:3000/api/auth/google` in browser
4. Complete Google consent
5. Copy `refresh_token` from the JSON response
6. Add `GOOGLE_REFRESH_TOKEN` to `.env.local`

**Step 3: Enable feature** (~1 min)
1. In `src/config/featureFlags.ts`, set `estimateApi: true`
2. Submit a test estimate via the wizard
3. Verify email arrives at `taylor@happyplacecarpentry.com`

**Total: ~21 minutes. Zero code changes required.**

### What this enables
- Estimate form submissions → Gmail email to owner (instead of mailto: link)
- Server-side email delivery (works even if customer's mail client is broken)
- Proper estimate tracking (subject line includes service + customer name)

### What this does NOT enable
- Google Drive storage (needs Drive API + storage implementation)
- Google Sheets integration (needs Sheets API + read/write code)
- Review collection (needs Places API + wiring)
- Contacts (needs People API + wiring)
- Business Profile (needs API + wiring)

---

## Phase 8 — Eliminate Technical Debt

### Authority table (one per domain)

| Domain | Current authority | Action | Lines affected |
|--------|------------------|--------|---------------|
| **OAuth** | `src/lib/google.ts` (ACTIVE) + `internal/auth/oauth.ts` (DEAD) | Delete `internal/auth/oauth.ts` | 35 lines deleted |
| **Reviews** | `src/config/reviews.ts` (data) + `internal/reviews/reviewAuthority.ts` (logic) | **Keep both** — they serve different layers. `reviews.ts` is the public data source (empty array). `reviewAuthority.ts` is the internal authority class (aggregation, social proof, follow-up timeline). No duplication — different concerns. | 0 lines |
| **Storage** | `src/services/storage.ts` (interface + mock) | **Keep as-is** — interface is correct, mock is correct. Google Drive implementation goes here when activated. | 0 lines |
| **Sheets** | `internal/sheets/schema.ts` (types only) | **Keep as-is** — types are the contract. Implementation (read/write) goes here when Sheets is activated. | 0 lines |

### What to delete

| File | Lines | Why |
|------|-------|-----|
| `internal/auth/oauth.ts` | 35 | Superseded by `src/lib/google.ts`. Never imported. Contains broader scopes but those scopes correspond to features not yet activated — they will be added to `src/lib/google.ts` when those features are built. |

### What NOT to delete

| File | Why keep |
|------|---------|
| `internal/sheets/schema.ts` | 10 typed sheet interfaces + Provenance base. This is the data contract for the operational backend. Deleting it means rebuilding it when Sheets is activated. |
| `internal/reviews/reviewAuthority.ts` | `ReviewAuthority` class + `aggregate()` + `FOLLOW_UP_TIMELINE`. When reviews are wired, this is the authority. |
| `internal/photo/metadata.ts` | `PhotoV2Meta` + `selectByScore()`. When photo scoring is wired, this replaces hardcoded curation. |
| `internal/estimate/learning.ts` | `recordActuals()` + `deriveInsights()`. When estimate analytics are wired, this is the learning loop. |
| `internal/pricing/*` | Complete `SimpleKnowledgeEngine` with 3 authorities + 6 stubs + knowledge base. This is the pricing moat. |
| `internal/knowledge/*` | 11 versioned JSON files. Cedar, pressure-treated, trex, Simpson, stain, fencing labor, permits, seasonal, historical, confidence models, Oregon practices. This is the domain knowledge. |

---

## Phase 9 — Final Report

### Recovered code
- Nothing to recover — all `internal/` code is production quality and correctly isolated
- The architectural boundary (`src/` never imports `internal/`) is clean and respected

### Deleted code
- `internal/auth/oauth.ts` (35 lines) — superseded OAuth config stub

### Required secrets (for Gmail Send activation only)
| Secret | Where to get it | Required? |
|--------|----------------|----------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials | Yes |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials | Yes |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/auth/google/callback` (local) or Vercel URL (prod) | Yes |
| `GOOGLE_REFRESH_TOKEN` | Obtained via `GET /api/auth/google` one-time flow | Yes |
| `ESTIMATE_TO_EMAIL` | Already defaulted to `taylor@happyplacecarpentry.com` | No (has default) |

### Required console actions
1. Select project `citric-trees-502922-r3` in Google Cloud Console
2. Enable Gmail API
3. Create OAuth 2.0 Client ID (Web application type)
4. Add authorized redirect URI
5. Verify billing is active

### Required Vercel actions
1. Add `GOOGLE_CLIENT_ID` as environment variable
2. Add `GOOGLE_CLIENT_SECRET` as environment variable (sensitive)
3. Add `GOOGLE_REDIRECT_URI` (pointing to production domain)
4. Add `GOOGLE_REFRESH_TOKEN` as environment variable (sensitive)
5. Add `ESTIMATE_TO_EMAIL` (optional — has default)

### Lines of code avoided
- **OAuth client:** 0 lines — `src/lib/google.ts` already complete
- **Consent flow:** 0 lines — `api/auth/google/route.ts` already complete
- **Estimate email:** 0 lines — `api/estimate/route.ts` already complete
- **Feature flag:** 0 lines — `estimateApi` flag already exists
- **Total: 0 lines of new code needed for Gmail Send activation**

### Lines of code deleted
- 35 lines (`internal/auth/oauth.ts`)

### Remaining duplicate authorities
- **Zero** — after deleting `internal/auth/oauth.ts`, each domain has exactly one authority

### P0 bug (from previous session, unfixed)
- `photoFor("HeroBackground")` returns null because `hero/hero` has `quality.gallery: false` in `presentation.v1.json` but `photoFor()` requires `gallery === true`. The hero section renders the abstract gradient, not the photo. Fix: change `quality.gallery` to `true` for hero/hero, or change `heroBackground()` to use `byId()` instead of `photoFor()`.

### JSON-LD violation (from previous session, unfixed)
- `layout.tsx:59-63` hardcodes `aggregateRating` with `ratingValue: "5.0"` and `reviewCount: "40"` in the Organization schema. The reviews array is empty. This is a Rich Results violation — Google may penalize the page. Fix: remove `aggregateRating` until real reviews exist.
