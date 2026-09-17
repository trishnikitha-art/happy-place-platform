# Vercel Environment Variables Configuration Required

## Broken Boundary Identified

Production Drive discovery returns empty results because corpus authorization environment variables are not configured in Vercel production.

## Required Configuration

Add the following environment variables to your Vercel production deployment:

### 1. HPP_AUTHORIZED_MY_DRIVE
- **Value**: `true`
- **Environment**: Production
- **Purpose**: Authorize My Drive access for the authenticated Google identity
- **Security**: Explicit opt-in required (fail-closed by default)

### 2. HPP_AUTHORIZED_SHARED_DRIVES
- **Value**: `0ALeA98MLc-s_Uk9PVA`
- **Environment**: Production
- **Purpose**: Authorize the "Happy Place Carpentry Website" Shared Drive
- **Security**: Explicit allowlist required (only drives in this list are accessible)

## Configuration Steps

### Via Vercel Dashboard

1. Go to https://vercel.com/trishnikitha-art/happy-place-platform/settings/environment-variables
2. Click "Add New"
3. Add `HPP_AUTHORIZED_MY_DRIVE` with value `true`
4. Select "Production" environment
5. Click "Save"
6. Click "Add New" again
7. Add `HPP_AUTHORIZED_SHARED_DRIVES` with value `0ALeA98MLc-s_Uk9PVA`
8. Select "Production" environment
9. Click "Save"
10. Trigger a production deployment (push to main or use Redeploy in dashboard)

### Via Vercel CLI (if installed)

```bash
vercel env add HPP_AUTHORIZED_MY_DRIVE production --value "true" --yes
vercel env add HPP_AUTHORIZED_SHARED_DRIVES production --value "0ALeA98MLc-s_Uk9PVA" --yes
vercel deploy --prod
```

## Verification After Configuration

After adding these variables and redeploying, verify:

```bash
# Test Workbench login
curl -X POST https://happy-place-platform.vercel.app/api/workbench/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin"}' \
  -c cookies.txt

# Test Drive discovery
curl -H "Cookie: workbench_session_id=$(grep workbench_session_id cookies.txt | cut -f7)" \
  https://happy-place-platform.vercel.app/api/drive/discovery
```

Expected result:
```json
{
  "myDrive": {
    "id": "root",
    "name": "My Drive",
    "type": "my_drive"
  },
  "sharedDrives": [
    {
      "id": "0ALeA98MLc-s_Uk9PVA",
      "name": "Happy Place Carpentry Website",
      "type": "shared_drive"
    }
  ]
}
```

## Constitutional Rule

**Google OAuth access ≠ HPP authorization**

- Google OAuth establishes what the authenticated Google identity can access
- HPP establishes which corpus the application is permitted to use
- Even if Google permits access to a corpus, HPP must explicitly authorize it

These environment variables implement the fail-closed security boundary at the application level.

## Documentation References

- `CORPUS_AUTHORIZATION_MODEL.md` - Full authorization model documentation
- `SHARED_DRIVE_SETUP.md` - Shared Drive configuration details
- `.env.example` - Updated with corpus authorization variables

## Next Steps After Configuration

1. Configure environment variables in Vercel
2. Redeploy production
3. Verify Drive discovery returns authorized corpora
4. Test OAuth callback flow with real Google consent
5. Verify Drive session issuance and credential resolution
6. Test Drive browsing, search, thumbnail, and ingestion
7. Verify DriveReference → PublishedMediaAsset boundary
8. Verify public media gate acceptance
