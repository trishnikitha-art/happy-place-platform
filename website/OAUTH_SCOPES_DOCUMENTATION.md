# OAuth Scopes Documentation

**Date**: 2025-01-06
**Scope**: Google OAuth scopes for Happy Place Platform Drive integration

## Scope Categories

The OAuth scopes are deliberately split into two categories:

### Identity Scopes
These scopes are used for extracting authoritative Google identity information:

- `openid` - Required for OpenID Connect authentication
- `profile` - Required for accessing basic profile information
- `email` - Required for accessing the user's email address

**Purpose**: These scopes enable the application to extract the user's Google `sub` (subject identifier) and other identity information for authoritative identity resolution.

**Security**: These are read-only identity scopes that do not grant access to user data beyond basic profile information.

### Drive Access Scopes
These scopes are used for accessing Google Drive files and metadata:

- `https://www.googleapis.com/auth/drive.readonly` - Read-only access to all Drive files
- `https://www.googleapis.com/auth/drive.metadata.readonly` - Read-only access to Drive file metadata
- `https://www.googleapis.com/auth/drive.photos.readonly` - Read-only access to Drive photos

**Purpose**: These scopes enable the application to browse Drive, download files, and view thumbnails for materialization into the public media authority.

**Security**: These are read-only scopes. The application cannot modify, delete, or upload files to Drive.

## Scope Verification

**No Write Scopes**: The application does NOT request any write scopes (e.g., `drive`, `drive.file`, `drive.appdata`). This is intentional - the application only reads from Drive for materialization purposes.

**No Hidden Scope Escalation**: The OAuth authorize endpoint explicitly lists all requested scopes in the code (see `/api/drive/oauth/authorize/route.ts` lines 60-68). There are no hidden or dynamically added scopes.

## Current Implementation

```typescript
const scopes = [
  // OpenID identity scopes for authoritative Google sub extraction
  'openid',
  'profile',
  'email',
  // Drive read-only scopes for file access
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
];
```

## Authorization Flow

1. User clicks "Connect Drive" or "Re-authenticate Drive"
2. Application redirects to Google OAuth with the above scopes
3. User reviews and consents to the requested scopes
4. Google returns authorization code
5. Application exchanges code for access token and refresh token
6. Access token is used for Drive API calls
7. Refresh token is stored for automatic token refresh

## Token Storage

- **Access Token**: Encrypted and stored in Redis (authorization repository)
- **Refresh Token**: Encrypted and stored in Redis (authorization repository)
- **Session ID**: Stored in browser cookie (drive_session_id)
- **No Credentials in Browser**: Tokens are never exposed to client-side JavaScript

## Security Considerations

1. **Read-Only Access**: All Drive scopes are read-only, preventing accidental or malicious modification of user data
2. **Explicit Consent**: Users must explicitly consent to each scope category
3. **Encrypted Storage**: All tokens are encrypted at rest in Redis
4. **Session Isolation**: Each user session is isolated with a unique session ID
5. **No Token Exposure**: Tokens are never sent to client-side JavaScript
6. **Automatic Refresh**: The application automatically refreshes expired access tokens using the refresh token
