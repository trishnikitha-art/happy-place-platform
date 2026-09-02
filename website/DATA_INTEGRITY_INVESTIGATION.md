# Data Integrity Investigation

## Finding: Duplicate Media References

### Critical Duplicate: fences-001-hero / fences-001-before

**fences-001-hero** (lines 5-50 in media.v1.json):
```json
{
  "id": "fences-001-hero",
  "filename": "FENCE BUILD.jpg",
  "variants": {
    "original": "/images/projects/fences/FENCE BUILD-1080.webp",
    "web": "/images/projects/fences/FENCE BUILD-1080.webp",
    "webp": "/images/projects/fences/FENCE BUILD-1080.webp",
    "avif": "/images/projects/fences/FENCE BUILD-1080.avif",
    "thumbnail": "/images/projects/fences/FENCE BUILD-thumb.webp"
  },
  "contentHash": "802ccc84e0637b56cdf517cc6ca39168e71681d24d523eaa5e7a255b3f10433a"
}
```

**fences-001-before** (lines 51-96 in media.v1.json):
```json
{
  "id": "fences-001-before",
  "filename": "FENCE BEFORE.jpg",
  "variants": {
    "original": "/images/projects/fences/FENCE BUILD-1080.webp",
    "web": "/images/projects/fences/FENCE BUILD-1080.webp",
    "webp": "/images/projects/fences/FENCE BUILD-1080.webp",
    "avif": "/images/projects/fences/FENCE BUILD-1080.avif",
    "thumbnail": "/images/projects/fences/FENCE BUILD-thumb.webp"
  },
  "contentHash": "802ccc84e0637b56cdf517cc6ca39168e71681d24d523eaa5e7a255b3f10433a"
}
```

### Other Duplicates Found

- **fences-001-after / fences-001-matching**: Same hash `d2824f848e00a433...`
- **pergolas-001-hero / pergolas-001-after**: Same hash `57b84a974acbebeb...`

### Placeholder Hash Records

**70 records** with contentHash: `"placeholder-hash"`

These appear to be auto-generated variant records (different sizes of the same photo) created during media pipeline processing. This is expected behavior for variant generation, but the placeholder hash indicates they were generated without actual content hashing.

Records include:
- bathroom-remodeling variants (4 records)
- built-ins variants (8 records)
- davis-bathroom-remodel variants (4 records)
- johnson-cedar-fence variants (8 records)
- outdoor-living variants (12 records)
- smith-built-ins variants (8 records)
- test-project-corvallis variants (4 records)
- wilson-home-repairs variants (20 records)
- martinez-pergola variants (2 records)

### Analysis

**Problem**: Different media IDs point to the same physical file with the same content hash, but different semantic roles (hero vs before, etc.)

**Possible Explanations**:
1. **Legitimate duplicates**: The same physical file was intentionally used for multiple roles
2. **Copy-paste error**: Records were accidentally copied without updating file references
3. **Missing files**: Actual before/after files don't exist, so records were pointed to hero file as fallback
4. **Pipeline artifact**: Auto-generation process created duplicate references

### Impact

**Functional Impact**: Minimal - all records resolve to valid physical files
**Data Integrity Impact**: Medium - semantic mismatch between filenames and actual file references
**Trust Impact**: Medium - undermines confidence in canonical media authority
**Priority**: Medium - doesn't block KV reconciliation but should be investigated

### Required Action

**DO NOT AUTO-FIX**: This requires explicit forensic determination:

1. **Verify physical files**: Check if actual "FENCE BEFORE.jpg" exists in photo-intake/
2. **Check file history**: Review git history to determine if duplicates were intentional
3. **Consult owner**: Determine if same photo was intentionally used for multiple states
4. **Determine correct action**:
   - If intentional: Update filename to match reality
   - If accidental: Either create proper before/after photos or remove duplicate references
   - If missing files: Locate or recreate proper photos

### Other Investigation Needed

- Full audit of all records with duplicate content hashes
- Verification that placeholder hash records have corresponding physical files
- Review of media pipeline generation process to understand placeholder hash usage

### Status

**Finding Date**: 2026-09-02
**Severity**: Medium (data integrity concern)
**Action Required**: Forensic investigation before correction
**Auto-Fix**: NOT RECOMMENDED
**Blocks KV Reconciliation**: NO - duplicates resolve to valid files