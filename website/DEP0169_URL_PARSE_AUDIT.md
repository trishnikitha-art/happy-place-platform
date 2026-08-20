# DEP0169 url.parse() Deprecation Audit

## Issue Summary

Production deployment shows DEP0169 deprecation warnings for `url.parse()`:
- 365 occurrences in production logs
- Affects Drive API routes: /api/drive/reference, /api/drive/files, /api/drive/files/[fileId]/thumbnail, /api/drive/discovery
- Current deployment: e20db6a

## Root Cause

**This is a dependency issue, not application code.**

The deprecation originates from the Google API dependency chain:
- `googleapis@144.0.0` → `google-auth-library@9.x` → internal use of legacy `url.parse()`
- Node.js 24+ emits runtime deprecation warnings for `url.parse()` usage in non-node_modules code
- The warning appears because our application code calls Google APIs, which internally use the deprecated API

## Evidence

- **Application code audit:** No direct `url.parse()` usage found in website/src/
- **Google APIs version:** 144.0.0 (latest)
- **Node version:** 20.9.0+ (Vercel Node 24 runtime)
- **Deprecation type:** Application-level (non-node_modules code only, as of Node 24)

## Impact Assessment

- **Functional impact:** NONE - warnings do not break functionality
- **Security impact:** The underlying security issue is in the dependency, not our code
- **Noise impact:** 365 deprecation warnings in production logs
- **Blocker status:** NO - does not prevent media hardening completion

## Resolution Options

### Option 1: Wait for upstream fix (RECOMMENDED)
- Google Auth Library team needs to migrate to WHATWG URL API
- Track: https://github.com/googleapis/google-auth-library-nodejs
- **Pros:** No action needed from us, proper fix upstream
- **Cons:** Indeterminate timeline, warnings continue until fix

### Option 2: Suppress warning (NOT RECOMMENDED)
- Use `--no-deprecation` flag
- **Pros:** Removes noise immediately
- **Cons:** Hides real issues, not a proper fix

### Option 3: Downgrade Node (NOT RECOMMENDED)
- Pin to Node 20.x runtime
- **Pros:** No warnings in Node 20
- **Cons:** Loses Node 24 features, contradicts Next 16 alignment

### Option 4: Alternative Google library (NOT RECOMMENDED)
- Switch to direct REST API calls
- **Pros:** Control over dependencies
- **Cons:** Massive rewrite, loses OAuth handling, regression risk

## Decision

**Document and proceed.**

This is a known dependency issue that does not block media hardening. The warnings are noise from the Google API ecosystem, not architectural flaws in our code. We should:

1. Document this issue clearly
2. Continue with surgical hardening
3. Monitor for upstream Google Auth Library updates
4. Consider migration if Google does not fix within 6-12 months

## Related Issues

- Node.js DEP0169: https://nodejs.org/docs/latest/api/deprecations.html#DEP0169
- Google Auth Library (potential fix location): https://github.com/googleapis/google-auth-library-nodejs
- Migration guide: https://github.com/nodejs/userland-migrations/tree/main/recipes/node-url-to-whatwg-url

## Status

- **Identified:** YES - googleapis/google-auth-library dependency
- **Application code:** CLEAN - no direct url.parse() usage
- **Resolution:** Documented, waiting for upstream fix
- **Blocker:** NO - proceed with hardening