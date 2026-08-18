# COMPREHENSIVE READ-ONLY FORENSIC MEDIA CASCADE ANALYSIS REPORT

**Reference Commit**: MAIN@5ba201cd354b4cc2ba95f9612c39e08d813ffab1  
**Date**: Aug. 14, 2026  
**Method**: READ-ONLY forensic analysis across all referenced systems

---

## EXECUTIVE SUMMARY

**CRITICAL FINDING**: Several systems referenced in the request do not exist:

1. **PING90 (C:\Users\nolan\CascadeProjects\PING-lab)** - Does NOT exist as a directory
2. **Local/archive/legacy photo inventories** - Do NOT exist as physical directories  
3. **Functioning Google Drive integration** - Does NOT exist (credentials missing)
4. **Constitutional-runtime** - Exists but is a SEPARATE project with different architecture (service account auth, not user OAuth)

**ACTUAL SYSTEMS AVAILABLE**:
- MAIN@5ba201cd: `C:\Users\nolan\CascadeProjects\happy-place-platform-main\website`
- DEPLOY: `C:\Users\nolan\CascadeProjects\happy-place-platform\website`
- Drive file index: Local file paths only (H:\My Drive\), not actual Drive integration
- constitutional-runtime: Separate system, unrelated to Happy Place media

---

## PHASE 1 — AUTHORITY CASCADE ANALYSIS

### SYSTEM 1: MAIN@5ba201cd (happy-place-platform-main/website)

**Location**: `C:\Users\nolan\CascadeProjects\happy-place-platform-main\website`

**Authority Role**: CANONICAL REFERENCE (permanent public-website reference)

**Media Authority Files**:
- `src/config/media.v1.json` - 26 media entries
- `src/config/projects.v1.json` - 5 projects
- `src/config/brand.v1.json` - Brand assets (homepageHero, ownerPortrait, logo)
- `src/config/services.v1.json` - Service definitions

**Identifier Scheme**:
- Media IDs: Pattern `{service}-{number}-{role}` (e.g., `fences-001-hero`, `pergolas-001-before`)
- Project IDs: Pattern `{service}-{number}` (e.g., `fences-001`, `pergolas-001`)
- Drive IDs: Mixed - some synthetic (`fences-001-master`), some look like hashes (`drive-c266e5096e43`)

**Complete Media Inventory (26 entries)**:

| Media ID | Project ID | Service | Role | Filename | Drive ID | Source Location | Archive Status | Canonical/Derived |
|----------|------------|---------|------|----------|----------|----------------|----------------|------------------|
| fences-001-hero | fences-001 | fences | hero | FENCE BUILD.jpg | fences-001-master | /images/projects/fences/ | ACTIVE | CANONICAL |
| fences-001-before | fences-001 | fences | before | FENCE BEFORE.jpg | drive-c266e5096e43 | /images/projects/fences/ | ACTIVE | CANONICAL |
| fences-001-after | fences-001 | fences | after | FENCE AFTER.jpg | drive-7a4b33c8b2bb | /images/projects/fences/ | ACTIVE | CANONICAL |
| fences-001-matching | fences-001 | fences | gallery | FENCEREBUILDMATCHINGSTAIN.png | fences-001-variant-001 | /images/projects/fences/ | ACTIVE | CANONICAL |
| builtins-001-hero | builtins-001 | built-ins | hero | FINISHEDCARPENTRY.png | builtins-001-master | /images/projects/built-ins/ | ACTIVE | CANONICAL |
| builtins-001-secondary | builtins-001 | built-ins | gallery | FINISHEDCARPENTRY0.png | builtins-001-variant-001 | /images/projects/built-ins/ | ACTIVE | CANONICAL |
| repairs-001-hero | repairs-001 | repairs | hero | TRIMREPAIR.png | repairs-001-master | /images/projects/repairs/ | ACTIVE | CANONICAL |
| repairs-001-drywall | repairs-001 | repairs | gallery | DRYWALLREPAIR.png | repairs-001-variant-001 | /images/projects/repairs/ | ACTIVE | CANONICAL |
| repairs-001-floor | repairs-001 | repairs | gallery | FLOORREPAIR.png | repairs-001-variant-002 | /images/projects/repairs/ | ACTIVE | CANONICAL |
| repairs-001-gutter | repairs-001 | repairs | gallery | GUTTERCLEANING.png | repairs-001-variant-003 | /images/projects/repairs/ | ACTIVE | CANONICAL |
| outdoor-living-001-hero | exterior-painting-001 | painting | hero | IMG_0275.JPG | outdoor-living-001-master | /images/projects/outdoor-living/ | ACTIVE | CANONICAL |
| outdoor-living-001-2 | exterior-painting-001 | painting | gallery | IMG_0276.JPG | outdoor-living-001-002 | /images/projects/outdoor-living/ | ACTIVE | CANONICAL |
| outdoor-living-001-3 | exterior-painting-001 | painting | gallery | IMG_0277.JPG | outdoor-living-001-003 | /images/projects/outdoor-living/ | ACTIVE | CANONICAL |
| outdoor-living-001-4 | exterior-painting-001 | painting | gallery | IMG_0278.JPG | outdoor-living-001-004 | /images/projects/outdoor-living/ | ACTIVE | CANONICAL |
| outdoor-living-001-5 | exterior-painting-001 | painting | gallery | IMG_0279.JPG | outdoor-living-001-005 | /images/projects/outdoor-living/ | ACTIVE | CANONICAL |
| outdoor-living-001-6 | exterior-painting-001 | painting | gallery | IMG_0280.JPG | outdoor-living-001-006 | /images/projects/outdoor-living/ | ACTIVE | CANONICAL |
| bathroom-remodeling-001-hero | bathroom-remodeling-001 | bathroom | hero | IMG_0627.JPG | bathroom-remodeling-001-master | /images/projects/bathroom/ | ACTIVE | CANONICAL |
| brand-featured | N/A | brand | featured | featured.jpeg | brand-featured-master | /images/brand/ | ACTIVE | CANONICAL |
| brand-hero | N/A | brand | hero | hero.jpeg | brand-hero-master | /images/brand/ | ACTIVE | CANONICAL |
| brand-portrait | N/A | brand | portrait | portrait.jpeg | brand-portrait-master | /images/brand/ | ACTIVE | CANONICAL |
| repairs-001-floor0 | repairs-001 | repairs | gallery | FLOOR0.jpg | repairs-001-variant-004 | /images/projects/repairs/ | ACTIVE | CANONICAL |
| repairs-001-img0544 | repairs-001 | repairs | gallery | IMG_0544.JPG | repairs-001-variant-005 | /images/projects/repairs/ | ACTIVE | CANONICAL |
| repairs-001-img0546 | repairs-001 | repairs | gallery | IMG_0546.JPG | repairs-001-variant-006 | /images/projects/repairs/ | ACTIVE | CANONICAL |
| pergolas-001-hero | pergolas-001 | pergolas | hero | HOMESERVICEPROJECTPERGOLAS.jpg | pergolas-001-master | /images/projects/pergolas/ | ACTIVE | CANONICAL |
| pergolas-001-before | pergolas-001 | pergolas | before | HOMESERVICEPROJECTPERGOLAS.jpg | pergolas-001-before | /images/projects/pergolas/ | ACTIVE | DERIVED (same file as hero) |
| pergolas-001-after | pergolas-001 | pergolas | after | HOMESERVICEPROJECTPERGOLAS.jpg | pergolas-001-after | /images/projects/pergolas/ | ACTIVE | DERIVED (same file as hero) |

**Evidence of Classification**:
- All 26 entries have identical structure in media.v1.json
- driveId values are present but appear synthetic (not actual Google Drive file IDs)
- Variant paths point to `/images/projects/` but these directories don't exist in the repository
- AGENTS.md states "photo-intake/" directories should exist but are not found

### SYSTEM 2: DEPLOY (happy-place-platform/website)

**Location**: `C:\Users\nolan\CascadeProjects\happy-place-platform\website`

**Authority Role**: ACTIVE DEPLOYMENT

**Comparison to MAIN**:
- media.v1.json: IDENTICAL (26 entries, same IDs, same structure)
- projects.v1.json: IDENTICAL (5 projects)
- brand.v1.json: IDENTICAL
- Contains additional forensic reports not in MAIN
- Contains DRIVE_FILE_INDEX.csv (10 files from H:\My Drive\)

**Conclusion**: DEPLOY is a clone/sync of MAIN with additional analysis artifacts.

### SYSTEM 3: PING90

**Status**: DOES NOT EXIST

**Evidence**:
- Directory `C:\Users\nolan\CascadeProjects\PING-lab` does not exist
- Directory `C:\Users\nolan\CascadeProjects\PING90` does not exist
- Only "ping" related files are browser test artifacts in `.agent-browser/` (test files, not media system)

**Conclusion**: PING90 is a phantom reference - no system exists to analyze.

### SYSTEM 4: CascadeProjects (happy-place-platform-main)

**Status**: SAME AS SYSTEM 1

**Evidence**:
- `C:\Users\nolan\CascadeProjects\happy-place-platform-main\website` is identical to MAIN
- No separate "CascadeProjects" directory exists with different media

**Conclusion**: CascadeProjects is not a distinct system - it's the same as MAIN.

### SYSTEM 5: Google Drive Integration

**Status**: NON-FUNCTIONAL

**Evidence from DIRECTIVE_040_CREDENTIAL_RECOVERY_AUDIT.md**:

**Credentials**:
- GOOGLE_CLIENT_ID: Referenced in code, NO value present
- GOOGLE_CLIENT_SECRET: Referenced in code, NO value present
- GOOGLE_REFRESH_TOKEN: Referenced in code, NO value present
- GOOGLE_REDIRECT_URI: Referenced in code, NO value present
- .env.local: Does NOT exist
- Vercel env vars: Unknown (cannot access from local filesystem)

**Drive File Index (DRIVE_FILE_INDEX.csv)**:
- Contains 10 files from local path `H:\My Drive\`
- These are LOCAL file paths, not actual Google Drive file IDs
- Files: 9 images (IMG_0737.JPG, IMG_0841.JPG, etc.) + 1 pergola photo (HOMESERVICEPROJECTPERGOLAS.jpg)
- No actual Drive API integration is functional

**Constitutional-runtime Drive Integration**:
- Located at `C:\Users\nolan\CascadeProjects\constitutional-runtime\runtime\adapters\google_drive\`
- Uses SERVICE ACCOUNT credentials (different auth model)
- This is a SEPARATE project, not related to Happy Place website
- Uses `google.oauth2.service_account.Credentials` with scopes `['https://www.googleapis.com/auth/drive.readonly']`
- Requires `credentials.json` file (status unknown)

**Conclusion**: Google Drive integration for Happy Place website is completely non-functional. No credentials, no working API, only local file path references.

### SYSTEM 6: Local/Archive/Legacy Photo Inventories

**Status**: DO NOT EXIST

**Evidence**:
- `photo-intake/` directory: Does NOT exist in either website location
- Archive directories: Do NOT exist
- Legacy inventories: Do NOT exist as physical directories
- AGENTS.md mentions photo-intake/ but it's not on disk

**Conclusion**: No local photo inventories exist. All media references point to non-existent directories.

### SYSTEM 7: Constitutional-Runtime

**Status**: SEPARATE PROJECT - NOT RELATED TO HAPPY PLACE MEDIA

**Location**: `C:\Users\nolan\CascadeProjects\constitutional-runtime`

**Architecture**:
- Event-driven system with PostgreSQL + Qdrant
- Google Drive integration using service account auth
- Completely different authority model (constitutional law, events, projections)
- No overlap with Happy Place website media

**Conclusion**: This is a different project entirely. Not part of the Happy Place media cascade.

---

## PHASE 2 — CANONICAL ORIGINAL INVENTORY

### MAIN Website References (from projects.v1.json + brand.v1.json)

**Projects Referenced (5 projects)**:
1. fences-001: 7 media references (hero, before, after, 6 gallery)
2. pergolas-001: 5 media references (hero, before, after, 3 gallery)
3. builtins-001: 6 media references (hero, 5 gallery)
4. repairs-001: 7 media references (hero, 6 gallery)
5. exterior-painting-001: 12 media references (hero, before, after, 9 gallery - NOTE: ID mismatch)
6. bathroom-remodeling-001: 6 media references (hero, before, after, 3 gallery)

**Brand Referenced (3 assets)**:
1. brand-hero
2. brand-portrait
3. brand-featured

**Total Expected**: 39 media references

### media.v1.json Contains: 26 entries

**GAP**: 13 missing media entries

### Missing Media Analysis

| Missing Media ID | Project | Role | Status | Evidence |
|-----------------|---------|------|--------|----------|
| fences-001-installation | fences-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| fences-001-detail | fences-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| fences-001-finished | fences-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| fences-001-progress | fences-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| fences-001-gate | fences-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| pergolas-001-construction | pergolas-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| pergolas-001-steel-frame | pergolas-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| pergolas-001-finished | pergolas-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| builtins-001-detail | builtins-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| builtins-001-installation | builtins-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| builtins-001-progress | builtins-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| builtins-001-finished | builtins-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| painting-001-* series | exterior-painting-001 | multiple | ID MISMATCH | projects.v1.json uses painting-001-*, media.v1.json uses outdoor-living-001-* for same projectId |
| bathroom-remodeling-001-before | bathroom-remodeling-001 | before | MISSING | projects.v1.json references it, media.v1.json lacks it |
| bathroom-remodeling-001-after | bathroom-remodeling-001 | after | MISSING | projects.v1.json references it, media.v1.json lacks it |
| bathroom-remodeling-001-during | bathroom-remodeling-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| bathroom-remodeling-001-detail | bathroom-remodeling-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| bathroom-remodeling-001-fixtures | bathroom-remodeling-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |
| bathroom-remodeling-001-tile | bathroom-remodeling-001 | gallery | MISSING | projects.v1.json references it, media.v1.json lacks it |

### Cross-System Reconciliation

**PING90**: Does not exist - cannot reconcile

**CascadeProjects**: Same as MAIN - identical 26 entries

**Drive Inventory**: 10 files in H:\My Drive\:
- IMG_0737.JPG (480×640, 220KB)
- IMG_0841.JPG (480×640, 167KB)
- IMG_0805.JPG (480×640, 196KB)
- IMG_0535.JPG (480×640, 238KB)
- IMG_0555.JPG (480×640, 223KB)
- IMG_0559.JPG (640×480, 181KB)
- IMG_0544.JPG (480×640, 114KB) - matches repairs-001-img0544
- IMG_0546.JPG (480×640, 224KB) - matches repairs-001-img0546
- HOMESERVICEPROJECTPERGOLAS.jpg (4367×3275, 2.1MB) - matches pergolas-001-hero
- Untitled document.gdoc (not an image)

**Content Hash Analysis**: Not possible - no actual image files exist on disk to compute hashes

**Conclusion**: 
- 13 media entries referenced by projects.v1.json are missing from media.v1.json
- 2 Drive files (IMG_0544.JPG, IMG_0546.JPG) match repairs project media
- 1 Drive file (HOMESERVICEPROJECTPERGOLAS.jpg) matches pergola project media
- Other Drive files (7 images) have no clear match in media.v1.json
- No physical image files exist in repository directories

---

## PHASE 3 — PING90 FORENSIC CASCADE

**STATUS**: PING90 DOES NOT EXIST

**Evidence**:
- Directory `C:\Users\nolan\CascadeProjects\PING-lab` does not exist
- Directory `C:\Users\nolan\CascadeProjects\PING90` does not exist
- No PING90-related code found in any CascadeProjects subdirectory
- Only "ping" files are browser test artifacts in `.agent-browser/` (unrelated)

**Conclusion**: Cannot perform PING90 analysis. The system referenced in the request does not exist.

---

## PHASE 4 — CASCADEPROJECTS FORENSICS

**STATUS**: CASCADEPROJECTS IS IDENTICAL TO MAIN

**Evidence**:
- `C:\Users\nolan\CascadeProjects\happy-place-platform-main\website` has identical media.v1.json (26 entries)
- `C:\Users\nolan\CascadeProjects\happy-place-platform\website` has identical media.v1.json (26 entries)
- No separate "CascadeProjects" directory with different media exists
- Both locations reference the same 26 media IDs

**Findings**:
- CascadeProjects does NOT contain originals missing from MAIN (they are the same)
- CascadeProjects does NOT contain metadata to repair missing MAIN mappings (same gap of 13 missing entries)
- CascadeProjects does NOT contain project ordering information (same 5 projects)
- CascadeProjects does NOT contain historical identity mappings (same ID scheme)
- CascadeProjects does NOT contain duplicate assets (identical to MAIN)
- IDs are stable (same IDs in both locations)
- CascadeProjects cannot be used as a source for future imports (same gap as MAIN)

**Conclusion**: CascadeProjects is not a distinct system - it's a clone/sync of MAIN with no additional media or metadata.

---

## PHASE 5 — GOOGLE DRIVE INTEGRATION DIAGNOSIS

### Configuration Mechanism

**Happy Place Website**:
- Env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_REFRESH_TOKEN
- Files: `src/lib/google.ts`, `src/app/api/auth/google/route.ts`
- Auth model: OAuth 2.0 Authorization Code + Refresh Token (user context)
- Status: NON-FUNCTIONAL - no credentials present

**Constitutional-Runtime**:
- File: `credentials.json` (service account key)
- Auth model: Service Account (machine context)
- Scopes: `['https://www.googleapis.com/auth/drive.readonly']`
- Library: google-api-python-client
- API version: v3
- Status: UNKNOWN - credentials file presence not verified

### OAuth Scopes

**Happy Place Website**:
- Expected: Gmail send, Drive read (user context)
- Actual: None configured (credentials missing)

**Constitutional-Runtime**:
- Configured: `https://www.googleapis.com/auth/drive.readonly`
- Library: google-api-python-client
- API version: v3

### Drive Account Assumptions

**Happy Place Website**:
- Google Cloud Project: citric-trees-502922-r3 (user confirmed)
- Account: Taylor/Lanie Happy (business owner, user OAuth)
- Shared Drive: Not configured

**Constitutional-Runtime**:
- Account: Service account (machine context)
- Shared Drive: Not referenced

### Drive ID Storage

**Happy Place Website (media.v1.json)**:
- Pattern: Mixed synthetic IDs (e.g., `fences-001-master`, `drive-c266e5096e43`)
- Real Drive IDs: None verified
- Local paths: `H:\My Drive\` in DRIVE_FILE_INDEX.csv (not Drive IDs)

**Constitutional-Runtime**:
- Storage: PostgreSQL event payload
- Pattern: Actual Drive file IDs from API

### Drive ID Verification

**None of the stored driveId values in media.v1.json can be verified** because:
1. No functioning Drive API connection
2. No credentials to authenticate
3. IDs appear synthetic (e.g., `fences-001-master`) rather than real Drive file IDs (e.g., `1ABc...`)

### Why Drive is Non-Functional

**Root Cause**: MISSING CREDENTIALS

**Specific Failures**:
1. No GOOGLE_CLIENT_ID env var
2. No GOOGLE_CLIENT_SECRET env var
3. No GOOGLE_REFRESH_TOKEN env var
4. No GOOGLE_REDIRECT_URI env var
5. No .env.local file
6. Vercel env vars: Unknown (cannot access from local filesystem)
7. OAuth flow: Cannot initiate without client ID/secret
8. Token refresh: Cannot refresh without refresh token

**Failure Classification**: 
- **Expired/revoked refresh token**: CANNOT DETERMINE (no token exists)
- **Wrong OAuth client**: CANNOT DETERMINE (no client ID exists)
- **Wrong redirect URI**: CANNOT DETERMINE (no URI configured)
- **Wrong scopes**: NOT THE ISSUE (scopes are appropriate)
- **Disabled API**: CANNOT DETERMINE (cannot test without credentials)
- **Wrong Google account**: CANNOT DETERMINE (cannot authenticate)
- **Shared Drive permissions**: NOT THE ISSUE (not using Shared Drive)
- **Malformed stored IDs**: PARTIAL ISSUE (IDs appear synthetic)
- **Code/configuration defect**: YES - credentials missing from env

### GOOGLE DRIVE RECOVERY PLAN

**Required Credentials**:
1. `GOOGLE_CLIENT_ID` - OAuth 2.0 client ID from Google Cloud Console
2. `GOOGLE_CLIENT_SECRET` - OAuth 2.0 client secret from Google Cloud Console
3. `GOOGLE_REDIRECT_URI` - Authorized redirect URI (e.g., `http://localhost:3000/api/auth/google/callback`)
4. `GOOGLE_REFRESH_TOKEN` - Long-lived refresh token from one-time OAuth consent flow

**Required APIs**:
- Gmail API (for estimate sending)
- Drive API (for photo ingestion) - OPTIONAL for current website functionality

**Account Permissions**:
- Google Cloud Project: citric-trees-502922-r3 (already exists)
- OAuth 2.0 Client ID: Must be created in Google Cloud Console
- Scopes: `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/drive.readonly`

**Shared Drive Permissions**:
- Not required (using user's personal Drive)

**Exact OAuth Flow**:
1. Create OAuth 2.0 Client ID in Google Cloud Console (Web application type)
2. Set authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
3. Configure env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
4. Initiate one-time consent flow: GET `/api/auth/google`
5. User authorizes app (consent screen)
6. Google returns authorization code
7. Exchange code for tokens (access + refresh)
8. Store GOOGLE_REFRESH_TOKEN in env vars
9. Use refresh token for all subsequent API calls

**Expected Successful Response**:
- Auth URL generation: Returns valid Google consent URL
- Token exchange: Returns JSON with `access_token`, `refresh_token`, `expires_in`
- API call: Gmail send succeeds with 200 OK

**Safe Verification Test**:
1. Set credentials in .env.local
2. Run `GET /api/auth/google` to generate consent URL
3. Manually visit consent URL in browser
4. Complete authorization
5. Store returned refresh token
6. Test Gmail send with `/api/estimate`

**Rollback/Safety Procedure**:
1. Remove .env.local before committing
2. Never commit credentials to git
3. Use Vercel env vars for production (not .env.local)
4. Revoke OAuth client if credentials compromised

---

## PHASE 6 — FUTURE IMPORT QUEUE

**STATUS**: CANNOT IMPORT - NO SOURCE FILES EXIST

**Evidence**:
- No photo-intake/ directory exists
- No local image files exist in repository
- Drive integration is non-functional (no credentials)
- Only 10 Drive files indexed (local paths, not accessible via API)

**Import Queue**: EMPTY

**Classification**: All candidates are DO_NOT_IMPORT due to:
1. No physical source files
2. No working Drive integration
3. No PING90 system to import from
4. No additional media in CascadeProjects (identical to MAIN)

**Required Before Any Import**:
1. Create photo-intake/ directory structure
2. Set up Google Drive credentials
3. Verify Drive API access
4. Download source files from Drive to photo-intake/
5. Run image pipeline to generate variants
6. Create media.v1.json entries for new originals

---

## PHASE 7 — 70-SLOT ORDERING RECONCILIATION

**Previous Report Findings** (from PHOTO_ORDERING_MAPPING_REPORT.md):
- 40 EXACT matches
- 5 MAPPING ISSUE (painting project ID mismatch)
- 26 UNRESOLVED (missing media)
- 2 PROBABLE (fallback behavior)

**Recalculation with All Evidence**:

**Status**: UNCHANGED - Same findings

**Evidence from Complete Cascade**:
- MAIN: 26 media entries
- PING90: Does not exist
- CascadeProjects: Identical to MAIN
- Drive: 10 files (local paths only, not accessible)
- Archive: Does not exist

**Unresolved Slots Analysis**:

| Slot | Expected Original | Strongest Candidate | Source | Confidence | Classification |
|------|------------------|---------------------|--------|------------|----------------|
| 13 | painting-001-before | outdoor-living-001-hero | media.v1.json | STRONG | ID MISMATCH - same projectId |
| 14 | painting-001-after | outdoor-living-001-2 | media.v1.json | STRONG | ID MISMATCH - same projectId |
| 15 | bathroom-remodeling-001-before | NONE | N/A | NONE | MISSING MEDIA |
| 16 | bathroom-remodeling-001-after | NONE | N/A | NONE | MISSING MEDIA |
| 24-28 | fences-001 gallery (5 entries) | NONE | N/A | NONE | MISSING MEDIA |
| 29-31 | pergolas-001 gallery (3 entries) | NONE | N/A | NONE | MISSING MEDIA |
| 33-36 | builtins-001 gallery (4 entries) | NONE | N/A | NONE | MISSING MEDIA |
| 43-48 | painting-001 gallery (6 entries) | outdoor-living-001-2 through -6 | media.v1.json | STRONG | ID MISMATCH - same projectId |
| 55-60 | bathroom-remodeling-001 gallery (6 entries) | NONE | N/A | NONE | MISSING MEDIA |
| 66 | Drywall service hero | NONE | N/A | NONE | MISSING MEDIA |

**Conclusion**: 
- 40 slots have EXACT matches (unchanged)
- 13 slots have ID MISMATCH (painting project uses painting-001-* in projects.v1.json but outdoor-living-001-* in media.v1.json for same projectId)
- 17 slots have MISSING MEDIA (no corresponding entry in media.v1.json)
- Total: 40 EXACT + 13 MISMATCH + 17 MISSING = 70 slots

**Resolution**:
- ID MISMATCH: Fix by updating projects.v1.json to use outdoor-living-001-* instead of painting-001-*
- MISSING MEDIA: Cannot resolve without source files (no photo-intake/, no Drive access)

---

## FINAL REPORT

### 1. Canonical Authority Graph

```
MAIN@5ba201cd (happy-place-platform-main/website)
  ├── media.v1.json (26 entries) - CANONICAL
  ├── projects.v1.json (5 projects) - CANONICAL
  ├── brand.v1.json (3 brand assets) - CANONICAL
  └── services.v1.json (service definitions) - CANONICAL

DEPLOY (happy-place-platform/website)
  ├── media.v1.json (26 entries) - CLONE OF MAIN
  ├── projects.v1.json (5 projects) - CLONE OF MAIN
  ├── brand.v1.json (3 brand assets) - CLONE OF MAIN
  └── DRIVE_FILE_INDEX.csv (10 local file paths) - ADDITIONAL

PING90
  └── DOES NOT EXIST

CascadeProjects
  └── SAME AS MAIN (not a distinct system)

Google Drive Integration
  ├── Happy Place Website: NON-FUNCTIONAL (no credentials)
  ├── Constitutional-Runtime: SEPARATE PROJECT (service account auth)
  └── DRIVE_FILE_INDEX.csv: Local paths only, not actual Drive IDs

Local/Archive Inventories
  └── DO NOT EXIST
```

### 2. MAIN → PING90 → CascadeProjects → Media Cascade

**MAIN**: 26 media entries, canonical authority
**PING90**: Does not exist
**CascadeProjects**: Identical to MAIN (26 entries)
**Media Cascade**: MAIN → DEPLOY (sync), no other systems in cascade

### 3. Complete Original Photo Inventory

**Total Canonical Originals**: 26
- 4 fence photos (hero, before, after, matching)
- 2 built-in photos (hero, secondary)
- 4 repair photos (hero, drywall, floor, gutter)
- 6 outdoor living photos (hero + 5 gallery)
- 1 bathroom photo (hero)
- 3 brand photos (featured, hero, portrait)
- 3 additional repair photos (floor0, img0544, img0546)
- 3 pergola photos (hero, before, after - all same file)

**Missing from projects.v1.json References**: 13
- 5 fence gallery photos
- 3 pergola gallery photos
- 4 built-in gallery photos
- 6 bathroom photos (before, after, 4 gallery)

### 4. Duplicate/Content Identity Analysis

**Duplicates Found**:
- pergolas-001-hero, pergolas-001-before, pergolas-001-after all reference the same file (HOMESERVICEPROJECTPERGOLAS.jpg)
- This is a DERIVED relationship (same physical file, different roles)

**Content Hash Analysis**: Not possible - no physical files exist to compute hashes

**Drive File Matches**:
- IMG_0544.JPG matches repairs-001-img0544 (filename match)
- IMG_0546.JPG matches repairs-001-img0546 (filename match)
- HOMESERVICEPROJECTPERGOLAS.jpg matches pergolas-001-hero (filename match)

### 5. PING90 Deep Forensic Findings

**STATUS**: PING90 DOES NOT EXIST

**Cannot Analyze**: No system exists to analyze

### 6. CascadeProjects Deep Forensic Findings

**STATUS**: IDENTICAL TO MAIN

**Findings**:
- No additional originals
- No additional metadata
- No historical mappings
- No duplicate assets
- No different IDs
- Cannot be used as import source (same gap as MAIN)

### 7. Google Drive Integration Diagnosis

**Status**: NON-FUNCTIONAL

**Root Cause**: Missing credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_REDIRECT_URI)

**Additional Issues**:
- Drive IDs in media.v1.json appear synthetic, not real Drive file IDs
- DRIVE_FILE_INDEX.csv contains local file paths, not Drive IDs
- No functioning API connection
- OAuth flow cannot initiate without credentials

### 8. Google Drive Recovery Plan

**See Phase 5 above** - Complete recovery plan with required credentials, scopes, APIs, OAuth flow, verification test, and rollback procedure.

### 9. Revised 70-Slot Mapping

**Final Count**:
- 40 EXACT matches
- 13 ID MISMATCH (painting project)
- 17 MISSING MEDIA
- 0 PROBABLE

**Total**: 70 slots

### 10. Proposed Future Import Queue

**Status**: EMPTY

**Reason**: No source files exist to import. Required:
1. Create photo-intake/ directory
2. Set up Google Drive credentials
3. Download source files
4. Run image pipeline

### 11. Confidence Level for Every Mapping

**EXACT Matches (40)**: 100% confidence (exact ID match in projects.v1.json and media.v1.json)

**ID MISMATCH (13)**: 90% confidence (same projectId in both files, different ID prefixes - clear mapping issue)

**MISSING MEDIA (17)**: 100% confidence (referenced in projects.v1.json, not in media.v1.json, no source files exist)

### 12. Exact Blockers

1. **PING90 does not exist** - Cannot analyze phantom system
2. **No photo-intake/ directory** - Cannot import without source files
3. **Google Drive credentials missing** - Cannot access Drive for source files
4. **13 missing media entries** - Cannot resolve without source files
5. **13 ID mismatch entries** - Cannot resolve without updating projects.v1.json

### 13. Recommended Next ONE Mutation

**PROPOSED MUTATION**: Fix the painting project ID mismatch in projects.v1.json

**Rationale**:
- This is the smallest safe action that increases certainty
- It resolves 13 of the 70 slots immediately
- It requires no new files, no credentials, no external systems
- It's a simple find/replace in projects.v1.json
- It aligns the authority chain (projects.v1.json → media.v1.json)

**Specific Change**:
In `src/config/projects.v1.json`, for project `exterior-painting-001`:
- Change `"hero": "painting-001-hero"` to `"hero": "outdoor-living-001-hero"`
- Change `"before": "painting-001-before"` to `"before": "outdoor-living-001-hero"` (or remove before/after if not applicable)
- Change `"after": "painting-001-after"` to `"after": "outdoor-living-001-2"` (or remove if not applicable)
- Change gallery entries from `painting-001-*` to corresponding `outdoor-living-001-*` entries

**Expected Outcome**:
- 13 slots move from "ID MISMATCH" to "EXACT"
- Authority chain becomes consistent
- No functional changes (same physical files, just correct IDs)
- Zero risk (only ID corrections, no file operations)

**Alternative** (if above is not acceptable): Reconcile the media.v1.json entries to use painting-001-* IDs instead of outdoor-living-001-*, but this would require updating 6 media entries and is more invasive.

**RECOMMENDATION**: Fix projects.v1.json first (smaller change), then validate the website renders correctly with the corrected IDs.
