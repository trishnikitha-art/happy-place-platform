# CI Remediation Steps

## Blocker 0: Workbench Drive File Listing Errors (FIXED)

**Problem**: Workbench Drive browser showing `TypeError: Cannot read properties of undefined (reading 'length')` and `TypeError: Cannot read properties of undefined (reading 'filter')`.

**Root Cause**: 
1. API response structure mismatch - Drive API returns `{ items: [...] }` but code was accessing `data.files`
2. Missing null safety for array operations on `driveFiles`, `registeredSlots`, and `assets`

**Fix**: 
- Changed `data.files` to `data.items` to match Drive API response structure
- Added null safety checks: `(state.driveFiles || [])`, `(state.registeredSlots || [])`, `(state.assets || [])`
- Prevents undefined access errors during Drive browsing

**Status**: ✅ Fixed and committed (cb61794)

---

## Blocker 1: Lightningcss Linux Dependency Missing

**Problem**: CI build fails with `Error: Cannot find module '../lightningcss.linux-x64-gnu.node'`

**Root Cause**: `package-lock.json` was generated on Windows and only includes `lightningcss-win32-x64-msvc` binary. The Linux x64 binary (`lightningcss-linux-x64-gnu`) is listed as an optional dependency but has no actual entry in the lockfile's installed package tree.

**Fix**: Regenerate `package-lock.json` in a Linux environment or add the Linux binary explicitly.

### Option A: Regenerate lockfile on Linux (Recommended)

```bash
# On a Linux machine or GitHub Actions runner:
cd website
rm package-lock.json
npm install
```

This will install all platform-specific binaries including the Linux x64 binary.

### Option B: Add Linux binary explicitly

If you cannot regenerate the lockfile, add the Linux binary as a direct dependency:

```bash
npm install --save-optional lightningcss-linux-x64-gnu@1.32.0
```

This will add the Linux binary to `optionalDependencies` in `package.json` and the lockfile.

### Verification

After applying the fix, verify the lockfile contains the Linux binary entry:

```bash
grep -A 10 "lightningcss-linux-x64-gnu" package-lock.json
```

Should show a complete entry with `resolved`, `integrity`, `cpu`, `os`, and `libc` fields.

---

## Blocker 2: Production OAuth Invalid Grant

**Problem**: Vercel runtime telemetry shows `Error: invalid_grant` when refreshing Google authorization token for `c00d0121-239f-4c12-bfb7-7a950f10b38b`.

**Root Cause**: The stored Google refresh token has been revoked or expired. Google returns `invalid_grant` when attempting to use it.

**Fix**: Complete a fresh OAuth flow to obtain a new authorization.

### Remediation Steps

1. **Navigate to Workbench**: `https://happyplacecarpentry.com/workbench/login`

2. **Complete OAuth flow**:
   - Click "Connect Google Drive"
   - Authorize with Google
   - This will create a new authorization record with a fresh refresh token

3. **Verify new authorization**:
   - Check `/api/drive/auth/status` returns authenticated
   - Check `/api/drive/discovery` returns corpus structure
   - Verify no `invalid_grant` errors in Vercel logs

### Alternative: Revoke and Reauthorize

If the old authorization is causing issues, you can revoke it via the Workbench before reauthorizing. The system supports authorization revocation through the OAuth manager.

---

## Blocker 3: Production Media KV Reconciliation

**Problem**: Vercel shows 812 `PUBLIC_GATE_REJECTED` errors because records have `storage: undefined`. Also 211 media-resolution failures for project media IDs returning null from KV.

**Root Cause**: Production KV authority contains incomplete/missing records that need reconciliation with canonical media authority.

**Fix**: Execute production KV reconciliation via Workbench.

### Remediation Steps

1. **Navigate to Workbench**: `https://happyplacecarpentry.com/workbench/login`

2. **Execute reconciliation**:
   ```bash
   node scripts/execute-production-reconciliation.mjs
   ```

   Or via API endpoint:
   ```bash
   curl -X POST https://happyplacecarpentry.com/api/admin/diagnostic/reconcile-static-media \
     -H "Cookie: your-workbench-session-cookie"
   ```

3. **Expected results**:
   - 96 canonical records processed
   - Classification breakdown showing missing/incomplete records repaired
   - Zero failures
   - Evidence report with before/after state

4. **Verify after reconciliation**:
   - Check homepage visual slots render (hero, service cards, owner portrait)
   - Check `/our-work` gallery renders
   - Check project pages render
   - Verify no new `PUBLIC_GATE_REJECTED` errors in Vercel logs

---

## Execution Order

1. **Fix CI lightningcss dependency** (enables green CI builds)
2. **Reauthorize Google OAuth** (fixes Drive connectivity)
3. **Execute KV reconciliation** (fixes media authority)
4. **Verify visual slots** (confirms end-to-end health)

---

## Documentation References

- `KV_RECONCILIATION_INSTRUCTIONS.md` - Detailed reconciliation instructions
- `PRODUCTION_EXECUTION_PLAN.md` - Comprehensive production execution plan
- `CORPUS_AUTHORIZATION_MODEL.md` - HPP corpus authorization configuration
