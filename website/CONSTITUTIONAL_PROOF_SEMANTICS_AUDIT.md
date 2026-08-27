# Constitutional Proof Semantics Audit

## Current Implementation Analysis

### verifyConstitutionalProof() Function Location
`src/lib/media-kv-store.ts` - lines 167-226

### Current Behavior

#### Lifecycle State Exemptions
**Current:** `source_reference` lifecycle state is exempt from constitutional proof

**Analysis:**
- DriveReference records correctly exempt (they don't have Blob backing)
- No other lifecycle states are exempt
- This is correct - only source references should be exempt

#### Synthetic Content Hash Detection
**Current:** Rejects if `contentHash` equals `SHA256(canonicalId)`

**Analysis:**
- `isSyntheticContentHash()` detects if hash is derived from ID, not bytes
- This prevents fabricated hashes
- **Correct approach:** Content identity must be from actual bytes

**Issue:** Current media.v1.json records may have synthetic hashes
- This is causing brand-hero and fences-001-hero rejections
- Requires re-materialization with real byte-based hashes

#### Blob Metadata Verification
**Current:** Requires `blob_metadata:${contentHash}` record in KV

**Analysis:**
- Blob metadata is subordinate evidence, not authority
- KV is metadata authority, Blob is binary storage
- **Correct approach:** Blob metadata must exist to prove Blob backing

**Issue:** Blob metadata records may be missing for existing media
- This is causing PUBLIC_MEDIA_GATE REJECTED errors
- Requires creation of Blob metadata records

#### Physical Byte Verification
**Current:** Fetches Blob bytes and verifies hash match

**Analysis:**
- Calls `verifyBlobHash(blobUrl, contentHash)`
- Downloads actual bytes and computes SHA256
- Compares with recorded content hash
- **Correct approach:** Physical verification is the strongest proof

**Potential Issue:** Performance impact
- Every media read triggers Blob download
- May be appropriate for writes but not reads
- Consider caching or lazy verification

#### Variant URL Verification
**Current:** Requires `media.variants.original` to exist

**Analysis:**
- Ensures PublishedMediaAsset has physical backing
- Prevents Drive proxy URLs from crossing public boundary
- **Correct approach:** Original variant required for PublishedMediaAsset

### Authority Boundary Preservation

#### Current Model
```
KV = metadata authority
Blob = binary storage
contentHash = bytes-derived identity
Blob metadata = subordinate evidence
```

#### Audit Results
✅ KV is treated as metadata authority (first source of truth)
✅ Blob is treated as binary storage (physical verification)
✅ contentHash is bytes-derived (synthetic detection)
✅ Blob metadata is subordinate evidence (required but not authority)

**Status:** Authority boundaries are correctly preserved

### Verification Semantics Analysis

#### What Gets Verified
1. **PublishedMediaAsset (source: local, lifecycle: published)**
   - ✅ Synthetic content hash detection
   - ✅ Blob metadata presence
   - ✅ Physical byte verification
   - ✅ Variant URL presence

2. **DriveReference (source: google-drive, lifecycle: source_reference)**
   - ✅ Exempt from constitutional proof (correct)
   - Has no Blob backing by design

3. **MaterializingMedia (source: local, lifecycle: materializing)**
   - ❓ Not explicitly handled in current implementation
   - Should be exempt during materialization
   - Should require proof after materialization completes

#### What Does NOT Get Verified
- Media with `source: 'local'` but `lifecycleState !== 'published'`
- Media without `contentHash`
- Media with `source: 'google-drive'` but `lifecycleState !== 'source_reference'`

**Potential Gap:** Materializing state handling
- Materializing media may not have Blob backing yet
- Should be exempt during materialization phase
- Should require proof after materialization completes

### Access Control Considerations

#### Private Blob Access
**Current:** Uses `verifyBlobHash()` which likely requires Blob access

**Analysis:**
- If Blob is private, verification requires read access
- If Blob access fails, verification fails
- **Potential Issue:** Verification may fail due to access, not data integrity

**Recommendation:**
- Distinguish between "Blob inaccessible" vs "Blob hash mismatch"
- Consider using Blob metadata hash (if present) as fallback
- Document that verification requires Blob read access

### Performance Considerations

#### Current Behavior
- Every `getMedia()` call for PublishedMediaAsset triggers:
  1. KV read
  2. Blob metadata KV read
  3. Blob byte download
  4. SHA256 computation
  5. Hash comparison

**Analysis:**
- This is heavy for read operations
- Appropriate for write operations (materialization)
- May be excessive for read operations

**Recommendation:**
- Consider adding a `verifyOnRead` flag
- Default to skip physical verification on reads
- Require physical verification on writes
- Cache verification results with TTL

### Exemption Logic Analysis

#### Current Exemptions
1. `lifecycleState === 'source_reference'` - ✅ Correct
2. No `contentHash` - ⚠️ May allow incomplete records
3. KV unavailable - ⚠️ Returns false (fail closed)

**Missing Exemptions**
- `lifecycleState === 'materializing'` - Should be exempt during materialization
- `source: 'google-drive'` with non-source_reference lifecycle - Should reject

### Recommendations

#### P1 - Add Materializing State Handling
```typescript
// MaterializingMedia is exempt during materialization phase
if (media.lifecycleState === 'materializing') {
  return true; // Exempt during materialization
}
```

#### P1 - Add Verification Mode Parameter
```typescript
async function verifyConstitutionalProof(
  media: Media,
  mode: 'strict' | 'read' = 'strict'
): Promise<boolean>
```

#### P1 - Distinguish Access vs Integrity Errors
```typescript
// Distinguish between Blob inaccessible vs hash mismatch
if (blobAccessFailed) {
  console.warn('[MEDIA_KV] Blob inaccessible for verification', { mediaId });
  return mode === 'read'; // Allow on read, fail on strict
}
```

#### P1 - Add Verification Caching
```typescript
// Cache verification results with TTL
const verificationCache = new Map<string, { result: boolean, timestamp: number }>();
```

### Current Status

**Correct Implementations:**
✅ Lifecycle state exemption for source_reference
✅ Synthetic content hash detection
✅ Blob metadata verification
✅ Physical byte verification
✅ Authority boundary preservation

**Missing Implementations:**
❌ Materializing state exemption
❌ Verification mode parameter
❌ Access vs integrity error distinction
❌ Verification caching for performance

**Potential Issues:**
⚠️ Performance impact on every read
⚠️ Private Blob access may cause false failures
⚠️ No handling for incomplete records without contentHash

### Conclusion

The constitutional proof semantics are fundamentally correct but missing some edge cases and performance optimizations. The authority boundaries are properly preserved. The main issues are:

1. Materializing state not handled
2. Performance impact on read operations
3. Private Blob access not distinguished from hash mismatch
4. No verification caching

These are P1 issues - the core constitutional model is sound.
