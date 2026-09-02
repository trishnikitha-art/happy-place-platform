# KV Reconciliation Instructions

## Current Status

**Fixed**: Reconciliation mechanism now inspects and repairs instead of blindly skipping incomplete records.

**Fixed**: Production restoration script now uses correct authority path (media.v1.json).

**Pending**: Actual KV reconciliation needs to be executed in production environment.

## What Was Fixed

### 1. Reconciliation Endpoint (POST /api/admin/diagnostic/reconcile-static-media)

**Before**: 
- Existing records were blindly skipped
- Incomplete records (e.g., storage: undefined) were never repaired
- This caused KV to contain poisoned/incomplete records

**After**:
- Existing records are inspected for completeness
- Classification system: missing, incomplete, valid-static, valid-blob, corrupt, synthetic, unexpected
- Missing records: written with storage: 'static' for local assets
- Incomplete records: repaired through authoritative saveMedia()
- Valid records: preserved without modification
- Blob records: preserved without repair (safety check)
- Returns detailed classification breakdown

### 2. Production Restoration Script (scripts/production-media-restoration.mjs)

**Before**:
- Read from obsolete `media.v1.main.json` (doesn't exist)
- Used skip logic for existing records

**After**:
- Reads from correct `media.v1.json` (current canonical)
- Uses same inspection-based repair logic as reconciliation endpoint
- Both endpoints now use identical repair logic

## How to Execute KV Reconciliation

### Option 1: Via API Endpoint (Recommended)

1. **Authenticate to Workbench**
   - Navigate to `/workbench/login`
   - Complete OAuth authentication
   - Ensure you have admin/workbench session

2. **Execute Reconciliation**
   ```bash
   curl -X POST https://happyplacecarpentry.com/api/admin/diagnostic/reconcile-static-media \
     -H "Cookie: your-workbench-session-cookie"
   ```

3. **Review Results**
   - The endpoint returns classification breakdown
   - Check for any failures or errors
   - Verify that incomplete records were repaired

### Option 2: Via Production Script

1. **Set Environment Variables**
   ```bash
   export KV_REST_API_URL=<your-kv-url>
   export KV_REST_API_TOKEN=<your-kv-token>
   ```

2. **Execute Script**
   ```bash
   node scripts/production-media-restoration.mjs
   ```

3. **Review Results**
   - Script outputs detailed classification breakdown
   - Check for any failures
   - Verify reconciliation success

## Expected Results

### Successful Reconciliation

```
canonical: 96
classification: {
  missing: N,
  incomplete: N,
  validStatic: N,
  validBlob: 0,
  corrupt: 0,
  synthetic: 0,
  unexpected: 0
}
repaired: N
preserved: N
failed: 0
```

### Current Production State (Before Reconciliation)

Based on Vercel telemetry:
- 408 MEDIA_RESOLUTION_FAILED events
- Many records missing from KV or incomplete (storage: undefined)
- 147 Missing or invalid storage field failures
- Older records failing Blob verification

## Verification After Reconciliation

Once KV reconciliation is complete:

1. **Check Visual Slots**
   - Navigate to homepage
   - Verify hero background renders
   - Verify owner portrait renders
   - Verify service cards render
   - Navigate to `/our-work` and verify gallery renders

2. **Check Logs**
   - Verify no new MEDIA_RESOLUTION_FAILED events
   - Verify resolvePublicMedia() calls succeed

3. **Test End-to-End**
   - `/` - homepage with hero and service cards
   - `/services` - service pages with card media
   - `/our-work` - gallery with project photos
   - `/projects/[slug]` - individual project pages
   - `/about` - about page with owner portrait

## Data Integrity Note

There are known data integrity issues documented in `DATA_INTEGRITY_INVESTIGATION.md`:
- 4 duplicate content hash groups (same file used for different semantic roles)
- 70 records with placeholder-hash (auto-generated variants)

These do NOT block KV reconciliation (all resolve to valid files) but should be investigated separately for data integrity.

## Next Steps After Reconciliation

1. **Verify visual slots end-to-end** (todo item #4)
2. **Generate production reconciliation evidence report** (todo item #5)
3. **Address data integrity issues** (separate investigation)
4. **Monitor Vercel logs** for new MEDIA_RESOLUTION_FAILED events

## Safety Notes

- **Blob records are preserved**: The reconciliation logic will NOT repair Blob-backed records to avoid data loss
- **Valid records are preserved**: Records that are materially equivalent to canonical are not modified
- **Classification is explicit**: Each record is classified before any action is taken
- **Fail-closed**: If reconciliation fails, it reports errors rather than corrupting data

## Support

If reconciliation fails:
1. Check KV credentials are valid
2. Check Workbench authentication is active
3. Review error messages in reconciliation response
4. Check Vercel logs for detailed error information