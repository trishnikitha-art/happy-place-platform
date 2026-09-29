# Visibility Authority Completion Status

## Deployed Commits

**32a36c2a** - fix(visibility): connect gallery and visibility lifecycle and eliminate initialization race
- Gallery bootstrap now atomically initializes visibility authority
- Visibility mutation now uses atomic initialization inside Lua
- Lua script validates schemaVersion and projectId
- Route handles MALFORMED_AUTHORITY and INVALID_DATA_TYPE errors
- Documented authorization model (Workbench auth = any project mutation)
- Fixed OAuth cookie leakage

**e12ca3a7** - fix(bootstrap): scripts now initialize visibility authority with gallery
- bootstrap-runtime-authority.mjs now initializes visibility authority
- bootstrap-all-runtime-authority.mjs now initializes visibility authority
- Both scripts use NX (create-if-absent) semantics

Both commits are deployed to Vercel production and verified via GitHub API.

## PROVEN (Code Changes)

✅ Gallery bootstrap API (POST /api/admin/projects/gallery/bootstrap) now atomically initializes visibility authority
✅ Visibility mutation Lua script now validates schemaVersion and projectId
✅ Visibility mutation Lua script now atomically initializes missing authority
✅ Malformed authority fails closed (MALFORMED_AUTHORITY error)
✅ Wrong projectId fails closed
✅ Invalid data type fails closed (INVALID_DATA_TYPE error)
✅ Bootstrap scripts now initialize visibility authority with NX semantics
✅ TypeScript compilation passes
✅ Vercel production deployments complete for both commits

## UNPROVEN (Runtime Evidence)

⏳ Production bootstrap execution to initialize visibility authority for all projects
⏳ Hide → public projection exclusion in production
⏳ Unhide → public projection restoration in production
⏳ Visibility authority initialization on existing gallery
⏳ Concurrent hide/hide idempotence
⏳ Concurrent hide/unhide behavior
⏳ Malformed visibility authority fail-closed behavior
⏳ Wrong projectId fail-closed behavior
⏳ VisibilityRevision monotonicity
⏳ InitializedAt preservation across mutations
⏳ Hidden state survives gallery removal/re-addition
⏳ Visibility authority survives second bootstrap

## Next Steps for Runtime Verification

The production bootstrap can be executed through either:

1. **Via Workbench API** (recommended):
   - Authenticate to Workbench
   - Call POST /api/admin/projects/gallery/bootstrap for each project
   - Or use POST /api/admin/projects/gallery/bootstrap-all if available

2. **Via bootstrap script** (requires production credentials):
   - Set KV_REST_API_URL and KV_REST_API_TOKEN to production values
   - Run: node scripts/bootstrap-all-runtime-authority.mjs
   - This will initialize both gallery and visibility authority for all projects

The bootstrap scripts are now ready to initialize visibility authority alongside gallery authority for all projects, using atomic create-if-absent semantics to prevent overwriting existing state.

## Authorization Model Documentation

**Current Authorization Model:**
- Workbench authentication (workbenchSession.isAuthenticated) is sufficient for all project mutations
- Any authenticated Workbench user may mutate any project's gallery/visibility
- Platform is owner-only (implicit through Workbench session issuance)
- No project-level authorization (consistent with existing model)

**Security Implications:**
- The platform assumes a single owner/admin user model
- Workbench session issuance is the implicit project authorization boundary
- Google Drive authorization is separate and does not control project mutations
- This is intentional for the current owner-only platform model

## Authority Chain Invariants

**Lifecycle Invariant:**
Every initialized gallery membership authority has a corresponding initialized visibility authority.

**Implementation:**
- Gallery bootstrap creates both authorities atomically with NX semantics
- Visibility mutation creates authority atomically if missing
- Second bootstrap skips existing authority (preserves hidden state)

**Fail-Closed Invariant:**
Missing or malformed visibility authority → empty public gallery (production)

**Implementation:**
- Lua script validates schemaVersion and projectId before applying mutations
- Malformed authority returns MALFORMED_AUTHORITY error
- Wrong projectId fails closed
- Invalid data type returns INVALID_DATA_TYPE error
- Production effective-project-gallery.ts returns empty gallery on missing/malformed authority

**Durability Invariant:**
Visibility authority persists until explicitly unhidden (no TTL)

**Implementation:**
- Lua script writes visibility without EXPIRE
- Bootstrap scripts write visibility without EXPIRE
- Hidden state survives gallery removal/re-addition
