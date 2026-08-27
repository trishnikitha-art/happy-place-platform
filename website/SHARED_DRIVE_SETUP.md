# Shared Drive Authorization Setup

## Required Configuration

The application requires explicit HPP authorization for Shared Drives. Google OAuth access is NOT sufficient for HPP authorization.

## Shared Drive ID

**Target Shared Drive:** "Happy Place Carpentry Website"
**Drive ID:** `0ALeA98MLc-s_Uk9PVA`

## Configuration Steps

### 1. Vercel Production Environment Variable

Add the following environment variable to your Vercel production deployment:

```
HPP_AUTHORIZED_SHARED_DRIVES=0ALeA98MLc-s_Uk9PVA
```

### 2. Configure in Vercel

1. Go to Vercel project settings
2. Navigate to Environment Variables
3. Add `HPP_AUTHORIZED_SHARED_DRIVES` with value `0ALeA98MLc-s_Uk9PVA`
4. Apply to Production environment
5. Redeploy production

## Security Model

**Constitutional Rule:** Google OAuth access ≠ HPP authorization

- Google OAuth establishes what the authenticated Google identity can access
- HPP establishes which corpus the application is permitted to use
- Only explicitly configured Shared Drives are authorized
- The application can discover available Shared Drives but will only use those in the allowlist

## Verification

After configuration, verify the complete chain:

1. ✅ Workbench session → Drive OAuth session
2. ✅ Google Drive access → drives.list()
3. ✅ HPP_AUTHORIZED_SHARED_DRIVES → authorized
4. ✅ /api/drive/discovery → Shared Drive appears
5. ✅ Select Shared Drive → driveId set
6. ✅ /api/drive/files?driveId=0ALeA98MLc-s_Uk9PVA → Shared Drive root
7. ✅ Folder navigation → breadcrumbs preserve driveId
8. ✅ Search → preserves Shared Drive corpus
9. ✅ Thumbnails → work with driveId
10. ✅ Reference → preserves sharedDriveId
11. ✅ Ingest → preserves Drive provenance

## Troubleshooting

If the Shared Drive does not appear after configuration:

1. Verify the environment variable is set in Production (not Preview/Development)
2. Check Vercel deployment logs for the variable being loaded
3. Ensure the Google OAuth session has access to the Shared Drive
4. The diagnostic endpoint `/api/admin/diagnostic/shared-drives` can reveal accessible drives
