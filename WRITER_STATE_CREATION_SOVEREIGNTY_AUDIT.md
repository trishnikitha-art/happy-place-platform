# WRITER / STATE-CREATION SOVEREIGNTY AUDIT

## CEO Directive
Every transition in the media lifecycle must be traced:
- Function
- API route
- Storage write
- Accepted input type
- Validation
- Resulting lifecycle state
- Whether constitutional authority is invoked
- Whether operation can be called directly without Workbench UI

## FINDINGS

### 🚨 CRITICAL: Development Authentication Bypass

**Location:** Both `/api/drive/reference` and `/api/drive/ingest`

**Code:**
```typescript
// TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
if (process.env.NODE_ENV === 'development') {
  // Proceed without authentication
} else {
  // Check Drive authentication
  // Check Workbench authentication
}
```

**Impact:**
- These constitutional media operations can be called without authentication in development
- This bypasses the constitutional authority gate entirely
- State can be created directly via HTTP without going through Workbench UI
- Same bypass exists in `/api/admin/services/card/route.ts`

**Assessment:**
- This is a **security hole** in the constitutional model
- In development, anyone who can reach the API can create invalid state
- The constitutional gates exist but are voluntarily disabled

---

## DRIVE REFERENCE CREATION PATH

### 1. Function
`POST /api/drive/reference` (route.ts lines 55-232)

### 2. API Route
`/api/drive/reference`

### 3. Storage Write
`storeMedia(mediaRecord)` (line 206)
- Writes to KV with key: `media:drive-ref-{sourceIdentityHash}`
- Uses `validateMedia()` for schema validation

### 4. Accepted Input Type
```typescript
{
  fileId: string;
  sharedDriveId?: string;
  projectId?: string;
  roles?: MediaRole[];
}
```

### 5. Validation
- **Bypassed in development:** Drive authentication
- **Bypassed in development:** Workbench authentication
- fileId required (line 83-88)
- Drive file metadata fetch (line 91-97)
- MIME type from Drive (no fallback)
- Idempotency check via `getMedia(referenceId)` (line 122)

### 6. Resulting Lifecycle State
`source_reference` (line 143, 168)

### 7. Constitutional Authority Invoked
**YES:** `storeMedia()` → `validateMedia()` (media-kv-store.ts lines 139-147)

**Validation in `validateMedia()`:**
- `source_reference` state requires `sourceIdentityHash` (not `contentHash`)
- `contentHash` can be undefined for source references
- Drive field is allowed for `source_reference`
- No dimensions validation for source references (line 78-80)

### 8. Can Be Called Directly Without Workbench UI
**YES** - This is a public API route
- No UI-specific validation
- No Workbench session state required (bypassed in dev)
- Can be called via curl/Postman

### 9. Constitutional Classification
**`source_reference` ≠ PublishedMediaAsset**
- Source field: `'google-drive'`
- Drive field: present (fileId, driveId, webViewUrl, etc.)
- No content hash (sourceIdentityHash instead)
- Placeholder dimensions (0, 0)
- Variants point to `/api/drive/files/{fileId}/thumbnail` (Drive proxy URL)

**Storage layer enforcement:**
- `validateMedia()` explicitly allows Drive field for `source_reference` (line 78-80)
- No dimension validation for source references
- This is **constitutional**: source references are allowed to have Drive dependencies

---

## DRIVE MATERIALIZATION PATH

### 1. Function
`POST /api/drive/ingest` (route.ts lines 115-552)

### 2. API Route
`/api/drive/ingest`

### 3. Storage Write
`storeMedia(mediaRecord)` (line 520)
- Writes to KV with key: `media:{contentHash}` (first 32 chars)
- Uses `validateMedia()` for schema validation

### 4. Accepted Input Type
```typescript
{
  driveId: string;
  driveIdParameter?: string; // Shared Drive ID
  projectId?: string;
  roles?: MediaRole[];
}
```

### 5. Validation
- **Bypassed in development:** Drive authentication
- **Bypassed in development:** Workbench authentication
- Blob storage configured (line 119-133)
- driveId required (line 186-199)
- Drive file metadata fetch (line 203-223)
- Drive file download (line 226-249)
- **Sharp validation required** (line 251-300)
  - Fails if Sharp unavailable (503 error)
  - Validates actual image metadata (width, height, format)
  - Rejects invalid/corrupted images
- Content hash computation (line 304-308)
- Deduplication check via `findMediaByContentHash()` (line 312-330)

### 6. Resulting Lifecycle State
`published` (line 474)

### 7. Constitutional Authority Invoked
**YES:** `storeMedia()` → `validateMedia()` (media-kv-store.ts lines 139-147)

**Validation in `validateMedia()`:**
- `published` state requires `contentHash` (not `sourceIdentityHash`)
- `sourceIdentityHash` is not checked for published media
- **Published media must NOT have Drive field** (line 111-113)
- **Published media must NOT have Drive URLs in variants** (line 116-129)
- **Published media must be `source: 'local'`** (line 106-108)
- Full dimension validation required (line 83-92)
- Full variant validation required (line 95-101)

### 8. Can Be Called Directly Without Workbench UI
**YES** - This is a public API route
- No UI-specific validation
- No Workbench session state required (bypassed in dev)
- Can be called via curl/Postman

### 9. Constitutional Classification
**`published` = PublishedMediaAsset**
- Source field: `'local'` (line 473)
- **Drive field: removed** (line 475-476)
- Content hash present (line 472)
- Real dimensions from Sharp (line 479-482)
- Variants point to Blob URLs (local storage)
- Provenance tracks Drive origin via `august3_driveId` (line 510)
- **No Drive dependency** (bytes are in Blob)

**Storage layer enforcement:**
- `validateMedia()` explicitly rejects Drive field for `published` (line 111-113)
- `validateMedia()` explicitly rejects Drive URLs in variants (line 116-129)
- `validateMedia()` explicitly requires `source: 'local'` (line 106-108)
- This is **constitutional**: published media cannot have Drive dependencies

---

## ASSIGNMENT CREATION PATH

### 1. Function
`POST /api/admin/services/card` (route.ts lines 21-175)

### 2. API Route
`/api/admin/services/card`

### 3. Storage Write
`storeServiceCardAssignment(assignment)` (line 138)
- Writes to KV with key: `service-card-assignment:{serviceSlug}`
- Uses `validateServiceCardAssignment()` for schema validation

### 4. Accepted Input Type
```typescript
{
  serviceSlug: string;
  mediaId: string;
}
```

### 5. Validation
- **Bypassed in development:** Workbench authentication (line 25-36)
- serviceSlug required (line 47-52)
- mediaId required (line 54-59)
- Service exists in static configuration (line 62-70)
- **DriveReference rejection** (line 88-103)
  - Rejects `isDriveReference(media)` via type guard
  - Returns 400 error with `requiresMaterialization: true`
- **PublishedMediaAsset validation** (line 106-122)
  - Rejects if not `isPublishedMediaAsset(media)`
  - Returns 400 error with lifecycle state details

### 6. Resulting State
Service card assignment (not a Media object)
- `serviceSlug` → `mediaId` mapping
- Persists in KV independently of static services.v1.json

### 7. Constitutional Authority Invoked
**YES:** `storeServiceCardAssignment()` → validation chain

**Validation in `storeServiceCardAssignment()`:**
- **Drive-prefixed ID rejection at write time** (line 114-122)
  - Rejects `drive-` and `drive-ref-` prefixes
  - Throws error before KV write
- **PublishedMediaAsset resolution validation** (line 126-155)
  - Calls `resolvePublicMedia(assignment.mediaId)`
  - Rejects if mediaId does not resolve to valid PublishedMediaAsset
  - Throws error before KV write
- Schema validation (line 158-166)

### 8. Can Be Called Directly Without Workbench UI
**YES** - This is a public API route
- No UI-specific validation beyond media type checks
- No Workbench session state required (bypassed in dev)
- Can be called via curl/Postman

### 9. Constitutional Classification
**Assignment ≠ Media object**
- Assignment is a serviceSlug → mediaId mapping
- Constitutional gate: **only PublishedMediaAsset can be assigned**
- Gate enforced at TWO levels:
  1. API route level (`isDriveReference()`, `isPublishedMediaAsset()`)
  2. Store level (drive-prefix rejection, resolvePublicMedia validation)

---

## STORAGE LAYER CONSTITUTIONAL ENFORCEMENT

### `validateMedia()` - Media Schema Validation (media-kv-store.ts)

**Gate 1: Source Reference Validation (lines 53-80)**
- Requires `sourceIdentityHash` for `source_reference` state
- Allows Drive field for `source_reference`
- Allows placeholder dimensions (0, 0)
- Allows `contentHash` to be undefined

**Gate 2: Published Media Validation (lines 83-130)**
- Requires `contentHash` for non-source_reference states
- Requires real dimensions (width > 0, height > 0)
- Requires full variants (original, web, thumbnail)
- **Published media must be `source: 'local'`** (line 106-108)
- **Published media must NOT have Drive field** (line 111-113)
- **Published media must NOT have Drive URLs in variants** (line 116-129)

**Gate 3: Quarantine System (lines 179-182, 320-330)**
- Corrupted media is quarantined on read
- Invalid media is quarantined on migration
- Quarantine namespace: `media_quarantine:{id}:{timestamp}`

### `storeServiceCardAssignment()` - Assignment Validation (assignment-store.ts)

**Gate 1: Drive-Prefix Rejection (lines 114-122)**
- Rejects `drive-` and `drive-ref-` prefixes at write time
- Throws error before KV write
- Prevents Drive references from becoming assignments

**Gate 2: PublishedMediaAsset Resolution (lines 126-155)**
- Calls `resolvePublicMedia(assignment.mediaId)`
- Rejects if mediaId does not resolve to valid PublishedMediaAsset
- Enforces semantic validation at write time
- Throws error before KV write

**Gate 3: Schema Validation (lines 158-166)**
- Validates ServiceCardAssignment schema
- Rejects invalid assignment structures

**Gate 4: Read-Time Semantic Validation (lines 336-367)**
- On `getAllServiceCardAssignments()`, validates each assignment
- Quarantines assignments where mediaId no longer resolves
- Removes quarantined assignments from active namespace

---

## SOVEREIGNTY ASSESSMENT

### ✅ CONSTITUTIONAL GATES ARE WORKING

**Evidence:**
1. **DriveReference creation** → `source_reference` state allowed by storage layer
2. **DriveReference → PublishedMediaAsset** → Materialization removes Drive dependency
3. **PublishedMediaAsset** → No Drive field, no Drive URLs, source: 'local'
4. **Assignment write** → Rejects drive-prefixed IDs at write time
5. **Assignment write** → Validates mediaId resolves to PublishedMediaAsset
6. **Assignment read** → Semantic validation and quarantine
7. **Public resolver** → Rejects drive-prefixed IDs (previous audit)

### ⚠️ STORAGE LAYER DISTINCTIONS ARE CONSTITUTIONAL

**DriveReference (`source_reference`):**
- Allowed to have Drive field
- Allowed to have Drive URLs in variants
- No content hash required
- Placeholder dimensions allowed
- **Purpose:** Workbench browsing state, ephemeral reference

**PublishedMediaAsset (`published`):**
- NOT allowed to have Drive field
- NOT allowed to have Drive URLs in variants
- Content hash required
- Real dimensions required
- **Purpose:** Public presentation, permanent asset

**This is NOT a "poison factory feeding a poison detector"**
- The storage layer explicitly allows different constitutional rules for different lifecycle states
- `source_reference` is a constitutional state with different rules than `published`
- The distinction is enforced at the storage layer via `validateMedia()`

### 🚨 DEVELOPMENT AUTHENTICATION BYPASS IS A HOLE

**Problem:**
- All constitutional gates can be bypassed in development
- State can be created directly via HTTP without authentication
- The constitutional authority exists but is voluntarily disabled

**Impact:**
- Development environment is not constitutionally secure
- Invalid state can be created in development
- This invalid state could potentially migrate to production

**Recommendation:**
- Remove or restrict the development bypass
- Even in development, require some form of authentication
- Consider using a development-only API key or session token

---

## CAN INVALID STATE BE CREATED WITHOUT GATES SEEING IT?

### DriveReference Creation
**Path:** Direct HTTP call to `/api/drive/reference`
**Gates:** `validateMedia()` (storage layer)
**Assessment:** ✅ Storage layer gate WILL see it
- Even with auth bypass, `storeMedia()` calls `validateMedia()`
- `validateMedia()` enforces `source_reference` constitutional rules
- Invalid DriveReference will be rejected at storage layer

### Drive Materialization
**Path:** Direct HTTP call to `/api/drive/ingest`
**Gates:** Sharp validation + `validateMedia()` (storage layer)
**Assessment:** ✅ Storage layer gate WILL see it
- Even with auth bypass, `storeMedia()` calls `validateMedia()`
- `validateMedia()` enforces `published` constitutional rules
- Invalid PublishedMediaAsset will be rejected at storage layer
- Sharp validation will reject non-images

### Assignment Creation
**Path:** Direct HTTP call to `/api/admin/services/card`
**Gates:** API route validation + store validation
**Assessment:** ✅ Multiple gates WILL see it
- API route rejects DriveReference
- API route rejects non-PublishedMediaAsset
- Store rejects drive-prefixed IDs
- Store validates mediaId resolves to PublishedMediaAsset
- Assignment has multiple redundant gates

### Conclusion
**Every writer has constitutional gates that will see invalid state**
- The gates are not just at the reader level
- The storage layer enforces constitutional rules
- Invalid state cannot be created without passing constitutional validation

---

## FINAL VERDICT

### Constitutional Sovereignty: ✅ VALID
- Every state transition has constitutional validation
- Storage layer enforces lifecycle state rules
- Invalid state cannot be created without gate detection
- DriveReference and PublishedMediaAsset are constitutionally distinct

### Development Security: 🚨 COMPROMISED
- Authentication bypass exists in development
- Constitutional gates can be bypassed by removing auth checks
- This is a security hole that should be addressed

### Storage Layer Architecture: ✅ CONSTITUTIONAL
- Distinct rules for different lifecycle states
- Explicit enforcement at storage layer
- Not a "poison factory" - different states have different constitutional permissions

### Assignment Gates: ✅ REDUNDANT AND EFFECTIVE
- Multiple validation layers
- Write-time and read-time validation
- Drive-prefixed ID rejection at write time
- PublishedMediaAsset resolution validation

---

## RECOMMENDATIONS

### P0: Fix Development Authentication Bypass
- Remove or restrict the `NODE_ENV === 'development'` bypass
- Even in development, require some form of authentication
- Consider using a development-only API key

### P1: Add Constitutional Audit Logging
- Log all state transitions with constitutional validation results
- Log gate rejections with detailed reasoning
- This would make the constitutional enforcement more visible

### P2: Consider State Machine Formalization
- Formalize the constitutional state machine in code
- Make lifecycle state transitions explicit and validated
- Prevent invalid state transitions at the type level

---

## EVIDENCE OF CONSTITUTIONAL VALIDITY

**The gates are working correctly at the storage layer:**
1. `validateMedia()` enforces different rules for different lifecycle states
2. `source_reference` is allowed to have Drive dependencies
3. `published` is NOT allowed to have Drive dependencies
4. Assignment store rejects drive-prefixed IDs at write time
5. Assignment store validates mediaId resolves to PublishedMediaAsset

**This is NOT a "poison factory" scenario:**
- The storage layer explicitly allows different constitutional rules for different states
- DriveReference is a constitutional state with specific permissions
- PublishedMediaAsset is a constitutional state with different permissions
- The distinction is enforced at the storage layer

**The remaining issue is the development authentication bypass:**
- Constitutional gates exist and work correctly
- But they can be bypassed in development by removing auth checks
- This is a security hole that should be addressed
