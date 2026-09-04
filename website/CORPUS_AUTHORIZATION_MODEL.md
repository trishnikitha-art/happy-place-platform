# HPP Corpus Authorization Model

**Date**: 2025-01-06
**Scope**: Application-level Drive corpus authorization

## Constitutional Rule

**Google OAuth access ≠ HPP authorization**

- Google OAuth establishes what the authenticated Google identity can access
- HPP establishes which corpus the application is permitted to use
- Even if Google permits access to a corpus, HPP must explicitly authorize it

## Authorization Model

### My Drive Authorization

**Environment Variable**: `HPP_AUTHORIZED_MY_DRIVE`
**Format**: Boolean string (`"true"` or `"false"`)
**Default**: `true` (DEPRECATED - will change to `false` in future)
**Required**: No (but recommended to set explicitly)

**Status**: My Drive is currently authorized by default for backward compatibility. This will change in a future release. Set `HPP_AUTHORIZED_MY_DRIVE=true` explicitly to maintain current behavior.

**Rationale**: The intended model is that HPP must explicitly authorize all corpora, including My Drive. This prevents Google OAuth access from automatically granting HPP authority over a user's entire My Drive.

### Shared Drive Authorization

**Environment Variable**: `HPP_AUTHORIZED_SHARED_DRIVES`
**Format**: Comma-separated list of Shared Drive IDs
**Example**: `HPP_AUTHORIZED_SHARED_DRIVES=0AEd3EhGxxxxx,0AEd3EhGyyyyy`
**Default**: None (no Shared Drives authorized)
**Required**: Yes (for Shared Drive access)

**Status**: Shared Drives require explicit configuration. Google OAuth access is NOT sufficient for HPP authorization.

## Current Production Configuration

### Shared Drive (Configured)
- **Drive ID**: `0ALeA98MLc-s_Uk9PVA`
- **Environment Variable**: `HPP_AUTHORIZED_SHARED_DRIVES=0ALeA98MLc-s_Uk9PVA`
- **Status**: ✅ Explicitly authorized

### My Drive (Implicit)
- **Environment Variable**: Not set
- **Status**: ⚠️ Authorized by default (DEPRECATED)

## Migration Path

### Phase 1: Current (Backward Compatible)
- My Drive: Authorized by default with deprecation warning
- Shared Drives: Explicitly authorized via `HPP_AUTHORIZED_SHARED_DRIVES`

### Phase 2: Explicit Opt-In (Recommended)
- Set `HPP_AUTHORIZED_MY_DRIVE=true` explicitly in production
- Document the configuration
- Remove deprecation warning

### Phase 3: Explicit Only (Future)
- Change default from `true` to `false`
- My Drive: Only authorized if `HPP_AUTHORIZED_MY_DRIVE=true`
- Shared Drives: Only authorized if in `HPP_AUTHORIZED_SHARED_DRIVES`

## Security Implications

### Current Model (Implicit My Drive)
- Risk: Google OAuth access automatically grants HPP authority over entire My Drive
- Mitigation: Workbench authentication is still required
- Exposure: Any authenticated Workbench user can access their entire My Drive through HPP

### Intended Model (Explicit All)
- Risk: None - all corpora require explicit HPP authorization
- Mitigation: Google OAuth access ≠ HPP authorization enforced at application level
- Exposure: Only explicitly configured corpora are accessible through HPP

## Verification

After setting environment variables, verify:

1. ✅ Workbench session → Drive OAuth session
2. ✅ `HPP_AUTHORIZED_MY_DRIVE` → My Drive authorization
3. ✅ `HPP_AUTHORIZED_SHARED_DRIVES` → Shared Drive authorization
4. ✅ `/api/drive/discovery` → Authorized corpora appear
5. ✅ Unauthorized corpora → Rejected

## Example Configuration

### Vercel Production Environment Variables

```
HPP_AUTHORIZED_MY_DRIVE=true
HPP_AUTHORIZED_SHARED_DRIVES=0ALeA98MLc-s_Uk9PVA
```

### Development Environment Variables (.env.local)

```
HPP_AUTHORIZED_MY_DRIVE=true
HPP_AUTHORIZED_SHARED_DRIVES=0ALeA98MLc-s_Uk9PVA
```
