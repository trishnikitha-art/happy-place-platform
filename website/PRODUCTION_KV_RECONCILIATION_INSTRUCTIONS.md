# Production KV Reconciliation Instructions (2026-09-03)

## Current Production State

**Deployment**: 76405fd on Vercel (READY)
**Problem**: 197 PUBLIC_GATE_REJECTED errors due to missing storage fields in KV records
**Affected Routes**: /our-work, /services, /estimate, /projects/[slug]
**Example Failed Media IDs**: outdoor-living-001-3, 2df4fe450b3b35d38be23538e2fdcf0d, repairs-001-hero

## Root Cause Analysis

**Canonical Authority**: HEALTHY
- 96 canonical media records in media.v1.json
- 0 missing storage fields
- 0 non-static storage
- 0 missing content hashes
- 0 missing original variants

**Runtime KV State**: CORRUPTED
- 197 records have missing storage fields
- Public media gate rejects assets without storage field
- Previous reconciliation endpoint (/api/admin/media/reconcile) does not repair missing storage fields
- That endpoint only checks content hash, not storage field

## Correct Reconciliation Endpoint

**Use**: POST /api/admin/diagnostic/reconcile-static-media

**Why this endpoint**:
- Explicitly checks: lifecycle state, source, storage, content hash, variants
- Repairs incomplete static records
- Does not overwrite legitimate Blob records
- Designed to fix the exact production corruption we're seeing

## Execution Steps

### Option 1: Through Production Workbench (Recommended)

1. Navigate to: https://happyplacecarpentry.com/admin
2. Authenticate with Workbench credentials
3. Navigate to: https://happyplacecarpentry.com/api/admin/diagnostic/reconcile-static-media
4. Execute POST request with Workbench session cookie
5. Verify reconciliation evidence

### Option 2: Through Local Script

**Prerequisites**: Need production KV credentials (KV_REST_API_URL, KV_REST_API_TOKEN)

1. Add production KV credentials to local .env.local
2. Run: node scripts/execute-production-reconciliation.mjs
3. Verify reconciliation evidence

## Expected Reconciliation Results

**Before Reconciliation**:
- 96 canonical records (healthy)
- 197 KV records with missing storage fields (corrupted)
- Public gate rejects 197 assets

**After Reconciliation**:
- 96 canonical records (preserved)
- 96 KV records with complete storage fields (repaired)
- Public gate accepts 96 assets
- 0 failed records

## Verification Steps

After reconciliation, verify:

1. **Home Page**: All hero and service card images render
2. **Services Page**: All service card images render
3. **Our Work Page**: All project gallery images render
4. **Project Pages**: All hero, before/after, and gallery images render
5. **Brand Media**: Hero and portrait images render
6. **Public Gate**: No PUBLIC_GATE_REJECTED errors in telemetry

## Evidence Table Template

| Page | Slot | Intended Media | Media ID | Authority | Assignment | Public Gate | Physical Variant | Rendered |
| ---- | ---- | -------------- | -------- | --------- | ---------- | ----------- | ---------------- | -------- |
| Home | Hero | brand-hero | brand-hero | static | brand.v1.json | PASS | PASS | PASS |
| Services | Card 1 | fences-001-hero | fences-001-hero | static | services.v1.json | PASS | PASS | PASS |
| Services | Card 2 | pergolas-001-hero | pergolas-001-hero | static | services.v1.json | PASS | PASS | PASS |
| Our Work | Project 1 | fences-001-hero | fences-001-hero | static | projects.v1.json | PASS | PASS | PASS |
| Our Work | Gallery 1 | outdoor-living-001-3 | outdoor-living-001-3 | static | projects.v1.json | PASS | PASS | PASS |

## P0-E: Drive OAuth Reauthorization

**Problem**: invalid_grant for authorization c00d0121-239f-4c12-bfb7-7a950f10b38b
**Endpoint**: /api/drive/discovery
**Solution**: Reauthorize Google Drive

**Steps**:
1. Navigate to: https://happyplacecarpentry.com/workbench/explorer/drive
2. Click "Authorize with Google"
3. Complete OAuth flow
4. Verify Drive discovery succeeds
5. Verify stored authorization is valid

## CEO Rule Compliance

**ROOT CAUSE**: Runtime KV has incomplete media records (missing storage fields)
**PROOF**: 197 PUBLIC_GATE_REJECTED errors in production telemetry
**MINIMAL FIX**: Execute /api/admin/diagnostic/reconcile-static-media against production
**PRESERVED**: All current OAuth + Drive + constitutional architecture

**DO NOT**:
- Add more static fallbacks
- Declare victory because Home renders
- Reduce gallery to working subset
- Delete old photos
- Rewrite project records
- Bypass public media gate

**DO**:
- Execute production KV reconciliation
- Restore all 96 canonical media records
- Verify every visual slot
- Reauthorize Drive OAuth
- Provide evidence table of all slots
