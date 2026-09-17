# OAuth Flow Completion Required

## Current State

**Workbench Session**: ✅ Authenticated
- `workbench_session_id` cookie exists
- Workbench login successful

**Drive Session**: ❌ Missing
- No `drive_session_id` cookie
- No Drive authorization record
- No Google OAuth credentials stored

## Broken Boundary

The Drive discovery returns `{"myDrive":null,"sharedDrives":[]}` because there is no Drive session. The system has only completed the Workbench authentication step.

## Required OAuth Flow

To obtain a Drive session, the complete OAuth flow must be executed:

1. **Workbench Login** ✅ (completed)
   - POST `/api/workbench/login` with password
   - Returns `workbench_session_id` cookie

2. **OAuth Authorize** ✅ (tested)
   - GET `/api/drive/oauth/authorize` with Workbench session
   - Returns Google OAuth authorization URL
   - Creates browser-bound OAuth state

3. **Google Consent** ❌ (not completed)
   - User visits Google OAuth URL in browser
   - User grants consent for Drive access
   - Google redirects to callback with authorization code

4. **OAuth Callback** ❌ (not completed)
   - GET `/api/drive/oauth/callback?code=...&state=...`
   - Consumes OAuth state (CSRF protection)
   - Exchanges authorization code for tokens
   - Extracts Google identity (subject)
   - Stores encrypted credentials in authorization store
   - Creates Drive session
   - Issues `drive_session_id` cookie

5. **Drive Discovery** ❌ (blocked by missing session)
   - GET `/api/drive/discovery` with `drive_session_id` cookie
   - Resolves session → authorization → credentials
   - Calls Drive API to discover My Drive and Shared Drives

## Manual OAuth Completion Steps

Since browser automation is not available, complete the OAuth flow manually:

### Step 1: Get OAuth Authorization URL

```bash
# Login to Workbench
curl -X POST https://happy-place-platform.vercel.app/api/workbench/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin"}' \
  -c cookies.txt

# Get OAuth authorization URL
curl -H "Cookie: workbench_session_id=$(grep workbench_session_id cookies.txt | cut -f7)" \
  https://happy-place-platform.vercel.app/api/drive/oauth/authorize
```

Response will contain:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=...&state=..."
}
```

### Step 2: Complete Google Consent

1. Copy the `authUrl` from the response
2. Open it in a browser
3. Sign in with the Google test account
4. Grant consent for Drive access
5. Google will redirect to: `https://happy-place-platform.vercel.app/api/drive/oauth/callback?code=...&state=...`

### Step 3: Verify Drive Session

After successful callback, verify:

```bash
# Check Drive auth status
curl -H "Cookie: drive_session_id=$(grep drive_session_id cookies.txt | cut -f7)" \
  https://happy-place-platform.vercel.app/api/drive/auth/status
```

Expected response:
```json
{
  "authenticated": true,
  "has_access_token": true,
  "has_refresh_token": true,
  "has_expiry_date": true,
  "has_scope": true
}
```

### Step 4: Test Drive Discovery

```bash
# Test Drive discovery
curl -H "Cookie: drive_session_id=$(grep drive_session_id cookies.txt | cut -f7)" \
  https://happy-place-platform.vercel.app/api/drive/discovery
```

Expected response:
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

## Why This Cannot Be Automated

The OAuth flow requires:
- Real browser interaction with Google's consent screen
- Actual Google user authentication
- Valid authorization code from Google (cannot be fabricated)
- Browser cookie context for state consumption

These are security requirements that cannot be bypassed or simulated without actual Google OAuth interaction.

## Next Steps After OAuth Completion

Once the Drive session is established, the following chain can be tested:

1. ✅ My Drive navigation
2. ✅ Shared Drive navigation
3. ✅ Folder navigation with corpus preservation
4. ✅ Search within active corpus
5. ✅ Thumbnail access
6. ✅ Asset selection and DriveReference creation
7. ✅ Materialization to PublishedMediaAsset
8. ✅ Assignment to gallery slot
9. ✅ Public resolver verification
10. ✅ Multiple swaps (A → B → C)

## Current Architecture Validation

The current implementation correctly enforces:
- Workbench authentication before OAuth initiation
- Browser-bound OAuth state for CSRF protection
- Server-side authorization resolution (no caller-controlled authorizationId)
- Principal binding verification
- Corpus authorization enforcement
- ExpectedRevision/CAS semantics
- Public media gate protection

No architectural changes are needed. The only missing piece is completing the OAuth flow to obtain a Drive session.
