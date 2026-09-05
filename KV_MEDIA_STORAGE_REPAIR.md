# KV Media Storage Field Repair Instructions

## Problem

Production Vercel telemetry shows hundreds of `PUBLIC_GATE_REJECTED` errors with:
```
Missing or invalid storage field
```

Existing KV media records have `storage: undefined` instead of the required `storage: 'static'` or `storage: 'blob'`.

## Root Cause

The storage field was added to the PublishedMediaAsset schema, but existing KV records were persisted before this field was required. The code fixes ensure new records have the field, but do not automatically repair existing records.

## Solution

### Option 1: HTTP Endpoint (Recommended for Production)

The `/api/admin/diagnostic/sync-media-authority` endpoint repairs existing KV records:

1. Authenticate to Workbench (required for admin endpoints)
2. Execute sync:
   ```bash
   curl -X POST https://happy-place-carpentry.vercel.app/api/admin/diagnostic/sync-media-authority \
     -H "Cookie: workbench_session=<session_cookie>"
   ```

3. Response will show:
   - `synced`: new records written
   - `updated`: existing records repaired with storage field
   - `skipped`: records missing constitutional fields
   - `failed`: records that could not be repaired

### Option 2: Diagnostic Script (For Local Testing)

1. Inspect current KV state:
   ```bash
   cd website
   node scripts/inspect-kv-media-storage.mjs
   ```

2. Execute sync script:
   ```bash
   cd website
   node scripts/sync-media-to-kv.mjs
   ```

### Option 3: Manual Verification After Repair

After executing the sync, verify specific media IDs:
```bash
curl https://happy-place-carpentry.vercel.app/api/media/public?id=<media_id>
```

Expected response includes `"storage": "static"` or `"storage": "blob"`.

## Verification Steps

1. Execute the sync endpoint
2. Verify response shows `updated > 0` (existing records repaired)
3. Check Vercel production telemetry for reduced `PUBLIC_GATE_REJECTED` errors
4. Test public media resolution for known affected IDs
5. Verify `storage` field is present in response

## Important Notes

- The sync endpoint requires Workbench authentication
- Records with missing constitutional fields (lifecycleState, source, contentHash) are skipped
- Static files get `storage: 'static'`
- Drive-ingested assets get `storage: 'blob'`
- The public media gate remains strict - it will still reject records without valid storage

## Expected Outcome

After successful repair:
- All existing KV media records have valid `storage` field
- `PUBLIC_GATE_REJECTED` errors decrease significantly
- Public media resolution succeeds for repaired records
- No weakening of public media security gate
