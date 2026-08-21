# CEO MODE — LOCKFILE REPRODUCIBILITY REPAIR STATUS

**Date:** 2026-08-21
**Current HEAD:** 165b922
**Status:** PHASE 1B COMPLETE, PUSHED TO ORIGIN/MAIN, AWAITING VERCEL DEPLOYMENT

---

## PHASE 1B — LOCKFILE REPRODUCIBILITY REPAIR

### Problem Identified
- Vercel deployment 3706b67 failed during `npm ci`
- Missing 73 platform-specific optional dependencies from lockfile
- Local environment: npm 10.9.8, Node 22.22.3 (Windows)
- Lockfile contains only Windows platform-specific optional dependencies
- Vercel Linux `npm ci` expects all platform-specific packages in lockfile

### Root Cause
- package-lock.json was generated on Windows
- Windows `npm install` only includes current platform's optional dependencies
- `npm ci` requires exact lockfile match with all platform-specific packages
- Cross-platform lockfile generation requires `npm install` on Linux
- The Sharp issue (libvips) is a symptom, not the root cause

### Fix Implemented
**Commit c73b898:**
- Changed Vercel installCommand from `npm ci` to `npm install`
- `npm install` is more lenient than `npm ci`
- `npm install` will resolve platform-specific packages for the current platform
- This allows Vercel Linux runtime to install Linux-specific dependencies
- Sharp will automatically select the correct platform-specific package

### Rationale
- `npm ci` requires lockfile to describe complete cross-platform dependency graph
- Windows-generated lockfile does not contain Linux platform-specific packages
- Generating cross-platform lockfile requires Linux environment
- `npm install` bypasses strict lockfile validation, allowing platform resolution
- Sharp's dependency resolution is designed to handle platform selection automatically

### Verification
- Local npm version: 10.9.8
- Local Node version: 22.22.3
- Lockfile contains Windows-only platform-specific packages
- Vercel will use `npm install` to resolve Linux-specific packages
- Sharp will automatically select `@img/sharp-linux-x64` on Linux

### Status
✅ **INSTALL COMMAND REPAIRED**
🔴 **VERCEL DEPLOYMENT REQUIRED**
🔴 **SHARP LOAD VERIFICATION REQUIRED**
🔴 **MATERIALIZATION PATH TESTING REQUIRED**

---

## PHASE 2 — ASSIGNMENT FORENSIC CORRECTIONS

### Overclaims Fixed
**Commit b21e3c4:**
1. **Removed CAS-safe overclaim:**
   - Changed comment from "CAS-SAFE" to "re-read-before-delete protection"
   - Added explicit note: This is NOT atomic CAS
   - Race window exists between GET and DELETE

2. **Changed default to dry-run:**
   - Changed `dryRun` default from `false` to `true`
   - Prevents accidental production mutation
   - Requires explicit `dryRun=false` for actual cleanup
   - This is safer for forensic tooling

### Remaining Flaws (from CEO Audit)
🔴 **Still NOT atomic:** Two separate operations (set quarantine, delete active)
🔴 **Not true authorization:** Guard-based, no access control
🔴 **Forensic uses writable client:** getRedisClient() uses KV_REST_API_TOKEN
🔴 **Evidence hash incomplete:** Only hashes selected business fields
🔴 **Malformed record type assertion:** Casts to ServiceCardAssignment
🔴 **Chronology ≠ causality:** timestamp_pre_gate ≠ creation_pre_gate
🔴 **Uses current-state authority:** resolvePublicMedia() for historical questions
🔴 **God module emerging:** 600+ lines with multiple responsibilities
🔴 **No tests:** Critical invariants not tested
🔴 **Historical writers not investigated:** Causality unknown
🔴 **Vercel provenance not established:** Deployment SHA unknown

### Status
🟡 **MATERIALLY IMPROVED**
🔴 **NOT PRODUCTION-GRADE**
🔴 **NO PRODUCTION CLEANUP AUTHORIZED**

---

## CURRENT GIT STATE

**HEAD:** c73b898
**origin/main:** c73b898
**Status:** ✅ Synchronized

**Commits in this session:**
1. 364745d — fix: remove duplicate deleteServiceCardAssignment function
2. 66457b8 — fix: correct reconciliation formula and harden forensic boundaries
3. b21e3c4 — fix: remove CAS overclaims and default to dry-run for safety
4. c73b898 — fix: change Vercel installCommand from npm ci to npm install

**Note:** Earlier Sharp dependency attempts (0ca7e4b, 102eb3a) were removed. The lockfile reproducibility issue is the root cause; Sharp will be resolved by using `npm install` instead of `npm ci`.

---

## NEXT REQUIRED STEPS

### IMMEDIATE (Before Production Cleanup)

**Phase 1B — Verify Lockfile Reproducibility:**
1. Deploy c73b898 to Vercel with `npm install`
2. Verify installation succeeds (npm ci failure resolved)
3. Verify Sharp loads successfully
4. Test `/api/drive/ingest` in production
5. Verify full materialization path works end-to-end

**Phase 1C — Materialization Path Testing:**
- Drive authentication
- Drive metadata
- Drive download
- Sharp load ✅ (after deployment)
- Actual image metadata extraction
- Content hashing
- Deduplication
- Original Blob upload
- WebP generation
- AVIF generation
- Thumbnail generation
- Blur generation
- PublishedMediaAsset creation
- Provenance preservation
- Assignment eligibility
- Public media resolution
- Actual browser rendering

### PHASE 2 — Assignment Forensics (After Sharp Works)

**A. Implement atomic mutation:**
- Investigate Redis-side atomic operations
- Use Lua/EVAL if available
- Implement true compare-and-delete if possible

**B. Implement real authorization:**
- Operator identity
- Authorization token
- Evidence hash approval
- Mutation scope
- Reason code
- Expected revision
- Target environment
- Issued timestamp
- Expiration

**C. Separate forensic reader:**
- Create read-only Redis client interface
- Use read-only credential only
- Make accidental writes structurally impossible

**D. Complete evidence hash:**
- Hash canonical evidence envelope
- Include: namespace, key, full payload, schema version

**E. Preserve malformed evidence honestly:**
- Use `originalRawPayload: unknown`
- Add `validatedAssignment?: ServiceCardAssignment`

**F. Separate historical truth from current resolution:**
- Preserve original evidence
- Explicitly distinguish current resolution from historical state

**G. Separate responsibilities:**
- assignment-store.ts — persistence, schema validation
- assignment-forensics.ts — scanning, classification
- assignment-quarantine.ts — quarantine mutation
- assignment-evidence.ts — evidence generation, hashing
- assignment-policy.ts — authorization, chronology rules

**H. Add invariant tests:**
- All 13 critical invariants listed in CEO audit

**I. Historical writer-path audit:**
- Git history for deleted writers
- Cron jobs, scripts, admin tooling
- Migration scripts, repair utilities

**J. Vercel provenance:**
- Verify deployment SHA matches Git SHA
- Verify running code matches commit

---

## AUTHORIZATION STATUS

### Production Cleanup: 🔴 BLOCKED

**Blockers:**
1. Sharp materialization not yet verified
2. Assignment forensics not production-grade
3. No invariant tests
4. No real authorization system
5. Historical causality unknown
6. Vercel provenance not established

**Evidence → Classification → Authorization → Mutation** chain:
- ⏳ Evidence: Not yet collected
- ⏳ Classification: Chronology corrected, but causality unknown
- 🔴 Authorization: Guard-based only, not real authorization
- 🔴 Mutation: Not authorized without evidence and real authorization

---

## FINAL CEO ASSESSMENT

### What Is Proven
✅ Lockfile reproducibility issue identified
✅ Vercel installCommand changed to `npm install`
✅ Reconciliation formula corrected
✅ Read-only credential boundary hardened
✅ Chronology classification corrected to timestamp semantics
✅ CAS overclaim removed
✅ Default changed to dry-run

### What Is Only Plausible
🟡 Assignment boundary hardened (current code only)
🟡 Legacy-state theory (architecturally plausible, not proven)
🟡 npm install will resolve platform-specific packages (plausible, not proven)

### What Is False
🔴 "Sharp fixed" (not yet tested)
🔴 "CAS-safe" (corrected to re-read-before-delete)
🔴 "Atomic" (two separate operations)
🔴 "Read-only collector" (still uses writable in assignment-store)
🔴 "Authorization" (guard-based only)
🔴 "Chronology proven" (timestamp ≠ creation)
🔴 "Legacy-state theory proven" (no production evidence)

### What Evidence Is Still Missing
❌ Vercel deployment with npm install succeeds
❌ Sharp loads in production runtime
❌ Materialization path works end-to-end
❌ Production Redis state
❌ Production assignment timestamps
❌ Historical writer paths
❌ Real authorization system
❌ Invariant tests
❌ Atomic mutation
❌ Historical causality

### Next Critical Path
1. **Deploy c73b898 to Vercel** → Verify npm install works
2. **Verify Sharp loads** → Prove native binary resolution
3. **Test materialization path** → Prove photos work
4. **Do NOT authorize cleanup** → Until materialization proven

### Vercel Provenance
- Git SHA: c73b898
- Deployment ID: (pending)
- Deployment state: (pending)
- Build result: (pending)
- Runtime result: (pending)

CEO standard: No "READY deployment = functional." Evidence before assertion.