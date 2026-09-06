# Production Storage Classification and Repair Execution Guide

**Commit:** `ee976f0` — P0 SEAM REPAIRS: Connect diagnostic/repair authority, clean OAuth telemetry
**Status:** Ready for production execution after Vercel deployment

## Prerequisites

1. Vercel deployment is READY on commit `ee976f0`
2. Workbench authentication is working (OAuth → session)
3. You have access to the production environment

## Execution Steps

### Step 1: Authenticate in Workbench

Navigate to:
```
https://happy-place-platform.vercel.app/workbench/login
```

Complete the Google OAuth flow to establish an authenticated session.

### Step 2: Extract Session Cookie

After authentication, extract your `drive_session_id` cookie from the browser:
- Chrome DevTools → Application → Cookies → `https://happy-place-platform.vercel.app`
- Copy the value of `drive_session_id`

### Step 3: Execute Storage Classification Diagnostic

Run the classification diagnostic to inspect the 17 records with missing storage:

```bash
curl -X POST https://happy-place-platform.vercel.app/api/admin/diagnostic/classify-storage-contract \
  -H "Cookie: drive_session_id=<your-session-cookie>" \
  -H "Content-Type: application/json"
```

**Expected Response Structure:**
```json
{
  "totalRecords": 114,
  "missingStorage": {
    "count": 17,
    "ids": ["07c0eae1...", "0d43db8a...", ...]
  },
  "classification": {
    "definitelyStatic": {
      "count": <number>,
      "ids": [...],
      "description": "No contentHash - should be storage: static"
    },
    "definitelyBlob": {
      "count": <number>,
      "ids": [...],
      "description": "Has contentHash + Blob metadata - should be storage: blob"
    },
    "staticMarkedBlob": {
      "count": <number>,
      "ids": [...],
      "description": "Contract violation: static URL but marked as blob"
    },
    "blobMarkedStatic": {
      "count": <number>,
      "ids": [...],
      "description": "Contract violation: Blob URL but marked as static"
    },
    "ambiguous": {
      "count": <number>,
      "ids": [...],
      "description": "Has contentHash but no Blob metadata - requires manual review"
    }
  }
}
```

**Classification Logic:**
- `DEFINITELY_STATIC`: No contentHash → `storage: static`
- `DEFINITELY_BLOB`: Has contentHash + Blob metadata + URL match + physical hash verification → `storage: blob`
- `STATIC_MARKED_BLOB`: Static URL but marked as blob → contract violation
- `BLOB_MARKED_STATIC`: Blob URL but marked as static → contract violation
- `AMBIGUOUS`: Has contentHash but no Blob metadata → manual review

### Step 4: Review Classification Results

Document the classification results:
- How many records in each category?
- Which specific IDs are in each category?
- Are there any unexpected classifications?

**DO NOT repair `AMBIGUOUS` records.** These require manual review.

### Step 5: Execute Storage Repair

Run the repair endpoint to apply the classification:

```bash
curl -X POST https://happy-place-platform.vercel.app/api/admin/diagnostic/repair-media-storage \
  -H "Cookie: drive_session_id=<your-session-cookie>" \
  -H "Content-Type: application/json"
```

**Expected Response Structure:**
```json
{
  "totalRecords": 114,
  "repaired": <number>,
  "skipped": <number>,
  "failed": <number>,
  "repairs": [
    {
      "mediaId": "...",
      "reason": "...",
      "addedStorage": "static" | "blob"
    }
  ],
  "skips": [
    {
      "mediaId": "...",
      "reason": "..."
    }
  ],
  "errors": { ... } // only if failed > 0
}
```

**Repair Logic:**
- For `DEFINITELY_STATIC`: Sets `storage: static` if record exists in static manifest
- For `DEFINITELY_BLOB`: Sets `storage: blob` only if:
  - `lifecycleState === 'published'`
  - `contentHash` exists
  - Blob metadata exists for that contentHash
  - `media.variants.original === blobMetadata.url`
  - Physical Blob hash verification succeeds
- For all other cases: Skips with reason

**Safety Guarantees:**
- Never infers Blob merely from Drive provenance
- Never overwrites existing valid storage
- Never deletes records
- Skips ambiguous cases for manual review

### Step 6: Verify Repair Results

Review the repair response:
- Which records were repaired?
- Which records were skipped and why?
- Were there any failures?

### Step 7: Re-run Classification

Re-run the classification diagnostic to verify the repair:

```bash
curl -X POST https://happy-place-platform.vercel.app/api/admin/diagnostic/classify-storage-contract \
  -H "Cookie: drive_session_id=<your-session-cookie>" \
  -H "Content-Type: application/json"
```

**Expected Outcome:**
- `missingStorage.count` should be 0 (or significantly reduced)
- `ambiguous.count` should remain unchanged (manual review)
- `staticMarkedBlob.count` and `blobMarkedStatic.count` should be 0

### Step 8: Verify Public Media Gate

Test that previously rejected records now resolve:

```bash
curl -X POST https://happy-place-platform.vercel.app/api/media/reconciliation \
  -H "Cookie: drive_session_id=<your-session-cookie>" \
  -H "Content-Type: application/json"
```

Check Vercel runtime logs for:
- No new `PUBLIC_GATE_REJECTED` errors
- No new `MEDIA_RESOLUTION_FAILED` errors
- Previously rejected assignments now resolve

### Step 9: Full Chain Verification

After storage repair is verified, test the complete OAuth → Drive → media → assignment chain:

1. **OAuth:**
   - Navigate to `/api/drive/oauth/authorize`
   - Complete Google OAuth flow
   - Verify session creation

2. **Authorization:**
   - Call `/api/drive/auth/status`
   - Verify `authenticated: true`

3. **Corpus Authorization:**
   - Call `/api/workbench/drive-corpus`
   - Verify Shared Drive `0ALeA98MLc-s_Uk9PVA` is discovered

4. **My Drive:**
   - Call `/api/drive/files?folderId=root`
   - Verify My Drive returns items

5. **Shared Drive Navigation:**
   - Call `/api/drive/files?folderId=0ALeA98MLc-s_Uk9PVA&corpusId=0ALeA98MLc-s_Uk9PVA`
   - Verify Shared Drive returns items
   - Navigate to a folder: `/api/drive/files?folderId=<folderId>&corpusId=0ALeA98MLc-s_Uk9PVA`
   - Verify folder contents

6. **Search:**
   - Call `/api/drive/search?query=<term>&corpusId=0ALeA98MLc-s_Uk9PVA`
   - Verify search preserves corpus

7. **Thumbnail:**
   - Call `/api/drive/files/[fileId]/thumbnail`
   - Verify thumbnail loads

8. **Ingest:**
   - Select an image from Shared Drive
   - Call `/api/drive/ingest` or `/api/workbench/materialize-drive`
   - Verify materialization creates PublishedMediaAsset

9. **Public Assignment:**
   - Call `/api/workbench/assign-media` with the new asset
   - Verify assignment is created

10. **Public Website:**
    - Navigate to the public page with the assignment
    - Verify the image loads correctly
    - Verify no public gate rejections

## Troubleshooting

### Classification Returns Empty Records
- **Cause:** `getMediaRecordRaw` may not be accessing the correct KV namespace
- **Fix:** Verify KV_REST_API_URL and KV_REST_API_TOKEN are set correctly in production

### Repair Skips All Records
- **Cause:** Records may not meet the evidence criteria
- **Fix:** Review the `skips` array in the repair response to understand why each record was skipped

### Blob Hash Verification Fails
- **Cause:** Blob URL may be incorrect or Blob may be corrupted
- **Fix:** Manually verify the Blob exists and is accessible via Vercel Blob dashboard

### Public Gate Still Rejects After Repair
- **Cause:** Record may have other issues beyond storage (e.g., missing contentHash, invalid variants)
- **Fix:** Run `/api/admin/media/verify-complete` to check full record validity

## Rollback Plan

If repair causes issues:
1. The repair endpoint preserves all other record fields
2. You can manually revert storage field changes via KV admin tools
3. Static manifest backup exists at `website/src/config/media.v1.json.backup`

## Success Criteria

- ✅ Classification diagnostic returns accurate categorization
- ✅ Repair endpoint only repairs DEFINITELY_STATIC and DEFINITELY_BLOB records
- ✅ AMBIGUOUS records remain untouched
- ✅ Public media gate accepts repaired records
- ✅ No new PUBLIC_GATE_REJECTED errors in Vercel logs
- ✅ Full OAuth → Drive → media → assignment chain works end-to-end

## Notes

- The 17 affected IDs are:
  ```
  07c0eae184dc5a375f943a3ac2b67e95
  0d43db8a4d30037caaaed1c6287102fe
  216cc8b78507866480d0238cc650eaf3
  2a1d4ae6e3b81282259174af113bac3c
  2df4fe450b3b35d38be23538e2fdcf0d
  6e5fd45ff9bcd36d04d0ac53da8ccf21
  6fd33914d4c27fbf71871bbc6405ff1c
  78e29fe65034376a95759135c6c3fd8d
  8151ae20b8c6b889b35dbd5571fa4d84
  8ba3872848826e78609c7f04e02b75e7
  a2e488b435a03af26f7f75df8606f517
  a6d9b68b55547787bc22087d17c0f421
  c148cedee481f1e3a5fa13d85efbac1c
  c65e27844063e63ad2c300f88a9e7479
  cc9978ce72542130c926d44dd0222c1e
  ebd80b34246d925500dea1148ff614e4
  f3272a08fa5696f588d0780b26d34381
  ```

- Current production deployment: `dpl_5YDYwXPS9kDxtFnaZ1VYnk25m8Y2` (on commit `2699367`)
- Target deployment: Will be on commit `ee976f0` after CI passes
