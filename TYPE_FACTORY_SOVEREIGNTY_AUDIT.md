# TYPE/FACTORY SOVEREIGNTY AUDIT — PHASE 7

## CEO MODE: FORENSIC VERIFICATION

**Status:** ⚠️ UNVERIFIED (Type system audit complete, architectural concerns identified)

---

## TYPE SYSTEM ARCHITECTURE

### Media Type Hierarchy

**Base Types:**
- `BaseMedia` - Shared fields across all lifecycle states
- `DriveReference` - Source metadata only (extends BaseMedia)
- `MaterializingMedia` - Bytes in progress (extends BaseMedia)
- `PublishedMediaAsset` - Fully validated public asset (extends BaseMedia)
- `StaleMedia` - Needs refresh (extends BaseMedia)

**Union Type:**
- `Media` - Discriminated union of all lifecycle states

**Type Guards:**
- `isDriveReference(media: Media): boolean`
- `isMaterializingMedia(media: Media): boolean`
- `isPublishedMediaAsset(media: Media): boolean`
- `isStaleMedia(media: Media): boolean`

---

## TYPE CAST ANALYSIS

### Type Casting Found

**Location:** `src/app/projects/[slug]/page.tsx` (line 54)
```typescript
const photos = galleryMediaIds
  .map(id => getMediaById(id))
  .filter(m => m !== null && (m.variants?.web || m.variants?.original)) as Media[];
```

**Assessment:** ⚠️ TYPE ASSERTION
- This is a type assertion (`as Media[]`)
- The filter ensures null-safety but not type narrowing
- The assertion assumes all filtered items are valid Media objects
- No lifecycle state validation
- No constitutional validation

**Risk:** ⚠️ MEDIUM
- If `getMediaById()` returns malformed data, it will be asserted as valid Media
- No runtime validation of lifecycle state
- No validation of constitutional invariants

---

## OBJECT SPREADING ANALYSIS

### Object Spreading Found

**Location:** `src/lib/assignment-store.ts` (line 185)
```typescript
const assignmentWithRevision = {
  ...assignment,
  revision: newRevision,
};
```

**Assessment:** ✅ SAFE
- Assignment object spreading is for revision tracking
- Schema validation follows the spread
- No constitutional concerns

**Location:** `src/lib/media-kv-store.ts` (line 284)
```typescript
const updated: Media = {
  ...media,
  lifecycleState: 'source_reference',
  sourceIdentityHash: media.contentHash,
  contentHash: undefined,
};
```

**Assessment:** ⚠️ LIFECYCLE MUTATION
- Direct mutation of lifecycle state
- Object spreading from existing Media object
- Schema validation follows the mutation
- Constitutional rules enforced via `validateMedia()`

**Risk:** ⚠️ LOW
- Mutation is followed by schema validation
- Storage layer enforces constitutional rules
- No bypass of type guards

---

## MEDIA RECORD CREATION SITES

### DriveReference Creation

**Location:** `src/app/api/drive/reference/route.ts` (line 163)
```typescript
const mediaRecord: Media = {
  id: referenceId,
  sourceIdentityHash,
  contentHash: undefined,
  source: 'google-drive',
  lifecycleState: 'source_reference',
  drive: { /* ... */ },
  // ... other fields
};
```

**Assessment:** ⚠️ DIRECT OBJECT CONSTRUCTION
- Direct object construction without factory function
- No type narrowing at construction time
- Constitutional validation deferred to `storeMedia()` → `validateMedia()`

**Risk:** ⚠️ MEDIUM
- Invalid DriveReference could be constructed at API level
- Storage layer enforces constitutional rules
- No compile-time guarantee of validity

### PublishedMediaAsset Creation

**Location:** `src/app/api/drive/ingest/route.ts` (line 470)
```typescript
const mediaRecord: Media = {
  id: mediaId,
  contentHash,
  source: 'local',
  lifecycleState: 'published',
  // CRITICAL: No drive field
  // ... other fields
};
```

**Assessment:** ⚠️ DIRECT OBJECT CONSTRUCTION
- Direct object construction without factory function
- No type narrowing at construction time
- Constitutional validation deferred to `storeMedia()` → `validateMedia()`

**Risk:** ⚠️ MEDIUM
- Invalid PublishedMediaAsset could be constructed at API level
- Storage layer enforces constitutional rules
- No compile-time guarantee of validity

---

## TYPE GUARD EFFECTIVENESS

### Type Guard Implementation

**Location:** `src/types/media.ts` (lines 241-265)

**isPublishedMediaAsset() Implementation:**
```typescript
export function isPublishedMediaAsset(media: Media): boolean {
  return media.lifecycleState === 'published' && 
         media.source === 'local' && 
         typeof media.contentHash === 'string' &&
         media.contentHash.length > 0 &&
         media.dimensions.width > 0 &&
         media.dimensions.height > 0 &&
         !media.drive && // No Drive dependency
         !media.id.startsWith('drive-') && // No drive- prefix
         !media.id.startsWith('drive-ref-'); // No drive-ref- prefix
}
```

**Assessment:** ✅ CONSTITUTIONAL VALIDATION
- Type guard performs full constitutional validation
- Checks lifecycle state, source, content hash, dimensions
- Checks for Drive dependency
- Checks for drive-prefixed IDs
- Runtime enforcement of constitutional rules

**Type Narrowing:**
- ℹ️ INFORMATIONAL
- Type guards return boolean, not type predicates
- Comment acknowledges this limitation (line 235-239)
- "Type predicates require the predicate type to be assignable to the parameter type"
- Future improvement needed for proper type narrowing

---

## FACTORY FUNCTION ANALYSIS

### Factory Functions Found

**Search for factory functions:** None found

**Assessment:** ❌ NO FACTORY FUNCTIONS
- No dedicated factory functions for Media objects
- No dedicated factory functions for PublishedMediaAsset
- No dedicated factory functions for DriveReference
- All object construction is direct

**Risk:** ⚠️ HIGH
- No compile-time guarantee of valid construction
- Invalid objects can be constructed before validation
- Relies entirely on runtime validation

---

## OPTIONAL FIELD ANALYSIS

### Optional Fields in Media Type

**BaseMedia Optional Fields:**
- `description?: string`
- `createdAt?: string`
- `uploadedAt?: string`
- `fileSize?: number`
- `format?: string`
- `colorSpace?: string`

**Media Optional Fields:**
- `contentHash?: string` (required for PublishedMediaAsset)
- `sourceIdentityHash?: string` (required for DriveReference)
- `source?: 'google-drive' | 'local'` (required for all states)
- `lifecycleState?: MediaLifecycleState` (required for all states)
- `drive?: {...}` (allowed for DriveReference, not for PublishedMediaAsset)

**Assessment:** ⚠️ TYPE SYSTEM HOLE
- Media type has optional fields that are required for specific lifecycle states
- No compile-time enforcement of required fields per state
- Relies on runtime validation

---

## LIFECYCLE MUTATION ANALYSIS

### Lifecycle State Mutations Found

**Location:** `src/lib/media-kv-store.ts` (line 284)
```typescript
const updated: Media = {
  ...media,
  lifecycleState: 'source_reference',
  sourceIdentityHash: media.contentHash,
  contentHash: undefined,
};
```

**Assessment:** ⚠️ DIRECT LIFECYCLE MUTATION
- Direct mutation of lifecycle state
- Used for migration from legacy Drive references
- Schema validation follows mutation
- No dedicated state transition function

**Risk:** ⚠️ MEDIUM
- No compile-time guarantee of valid state transitions
- No state machine enforcement
- Relies on runtime validation

---

## ID MUTATION ANALYSIS

### ID Construction Sites

**DriveReference ID Construction:**
```typescript
const sourceIdentityHash = crypto.createHash('sha256').update(identityString).digest('hex').substring(0, 16);
const referenceId = `drive-ref-${sourceIdentityHash}`;
```

**PublishedMediaAsset ID Construction:**
```typescript
const stableId = generateStableId(contentHash); // First 32 chars of content hash
const mediaId = stableId; // Content-based ID, no drive- prefix
```

**Assessment:** ✅ ID CONSTRUCTION RULES
- DriveReference IDs use `drive-ref-` prefix
- PublishedMediaAsset IDs do NOT use drive prefixes
- ID construction is deterministic
- No ID mutation after construction

---

## TYPE SYSTEM CONCLUSION

### VERIFIED ITEMS
- ✅ Type hierarchy is well-defined
- ✅ Type guards perform constitutional validation
- ✅ ID construction follows constitutional rules
- ✅ Storage layer enforces constitutional rules

### UNVERIFIED ITEMS
- ⚠️ No factory functions for Media objects
- ⚠️ Direct object construction without compile-time guarantees
- ⚠️ Type guards do not provide type narrowing
- ⚠️ Optional fields not enforced per lifecycle state
- ⚠️ Direct lifecycle state mutations
- ⚠️ Type assertions without validation

### FAILED ITEMS
- ❌ No compile-time guarantee of valid PublishedMediaAsset construction
- ❌ No compile-time guarantee of valid DriveReference construction
- ❌ No state machine enforcement for lifecycle transitions

---

## CEO MODE ASSESSMENT

**Type System Status:** ⚠️ WEAK CONSTITUTIONAL GUARANTEES

**Evidence:**
- Type hierarchy is well-defined conceptually
- Type guards perform full constitutional validation at runtime
- Storage layer enforces constitutional rules
- No compile-time guarantees of valid construction
- No factory functions to enforce valid construction
- Type assertions without validation

**Architectural Concern:**
The system relies heavily on runtime validation rather than compile-time guarantees. Invalid Media objects can be constructed at the API level, and constitutional validity is only enforced at the storage layer.

**CEO Directive Concern:**
"A PublishedMediaAsset should be created by a narrow constructor/factory that makes invalid construction difficult or impossible."

**Current State:**
- No narrow constructor/factory exists
- Direct object construction is the norm
- Constitutional validity is deferred to runtime validation

**Conclusion:**
The type system provides constitutional guarantees at runtime but not at compile time. This is a type-system hole that should be addressed by introducing factory functions and improving type narrowing.

---

## RECOMMENDATIONS

### P1: Introduce Factory Functions
- Create `createPublishedMediaAsset()` factory function
- Create `createDriveReference()` factory function
- Enforce required fields at construction time
- Provide compile-time guarantees of validity

### P1: Improve Type Narrowing
- Restructure type hierarchy to support proper type predicates
- Make type guards return type predicates
- Enable compile-time type narrowing

### P2: Implement State Machine
- Create state machine for lifecycle transitions
- Enforce valid state transitions at compile time
- Prevent invalid lifecycle mutations

### P2: Remove Type Assertions
- Replace `as Media[]` with proper type narrowing
- Add runtime validation before type assertions
- Remove unsafe type assertions

---

## NEXT PHASE

**PHASE 8 — PUBLIC MEDIA BOUNDARY REPOSITORY-WIDE AUDIT**
- Audit every public route for Drive URL exposure
- Audit every public route for KV/media registry reads
- Audit every public route for drive-prefixed IDs
- Audit server components, loaders, API responses
- Audit serialized props, metadata, OG images
- Audit sitemap generation, static generation, caches
