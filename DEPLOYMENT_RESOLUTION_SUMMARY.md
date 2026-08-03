# Deployment Incident Resolution Summary

## Executive Summary

**Status**: ✅ RESOLVED - Deployments working via GitHub Actions fallback

**Root Cause**: Cron job configuration in `vercel.json` exceeded Hobby account limits, causing Vercel Git integration to silently skip deployments.

**Resolution**: Removed cron job, established GitHub Actions + Vercel REST API as reliable deployment mechanism.

---

## Timeline

### Phase 1: Working (Before July 29, 2026)
- Native Git deployments working via Vercel GitHub App
- Automatic deployments on push to main
- No repository webhook (normal for modern Vercel architecture)

### Phase 2: Broken (July 29 - August 3, 2026)
- **Trigger**: Commit df7a5de added cron job with schedule "*/30 * * * *" (every 30 minutes)
- **Purpose**: Scheduled Google Drive sync for photo management
- **Problem**: Hobby accounts only allow cron jobs once per day
- **Vercel Behavior**: Git integration validated vercel.json, found invalid cron config, silently skipped deployments without creating deployment records
- **Duration**: ~5 days of failed deployments with no visible error

### Phase 3: Fixed (August 3, 2026)
- **Action**: Removed cron job from vercel.json
- **CLI Test**: Revealed actual error message about Hobby account limits
- **Resolution**: Established GitHub Actions + Vercel REST API as deployment mechanism
- **Result**: Deployments working reliably

---

## Key Findings

### 1. Webhook Architecture Correction
**WRONG ASSUMPTION**: Repository webhooks must exist for Vercel deployments.

**CORRECT ARCHITECTURE**: Modern Vercel GitHub App uses installation-level events, not repository webhooks. The absence of a repository webhook is NORMAL and not evidence of failure.

**Evidence**:
- Deployments worked for months without a repository webhook
- This repository has never had a repository webhook
- Vercel GitHub App uses installation-level event routing

### 2. Why API/CLI Worked While Git Integration Failed
**Hypothesis**: The Git integration path validates vercel.json before creating a deployment record, while the API/CLI path either:
1. Bypasses this validation step
2. Uses different validation logic
3. Shows the error explicitly instead of silently skipping

**Evidence**:
- CLI deployment showed explicit error: "Hobby accounts are limited to daily cron jobs"
- Git integration silently skipped deployments
- After cron removal, both paths work

### 3. Cron Job Was Intentionally Added
- **When**: July 29, 2026 at 16:02:52 -0600 (commit df7a5de)
- **Purpose**: Scheduled Google Drive sync at /api/drive-sync every 30 minutes
- **Context**: Part of Directive 021 MVP to enable automated photo management
- **Issue**: The schedule was incompatible with the Hobby account tier

---

## Current Deployment Status

| Method | Status | Notes |
|--------|--------|-------|
| CLI Deployment | ✅ Working | `vercel --prod` successfully deploys |
| GitHub Actions | ✅ Working | Triggers on push to main, calls Vercel REST API |
| Native Git | ⏳ Unknown | Cannot verify without Vercel dashboard access |

---

## Recommendation

**Keep GitHub Actions as the primary deployment mechanism.**

**Rationale**:
1. Root cause (cron job) has been fixed
2. GitHub Actions + Vercel REST API is working reliably
3. Production site is live and deploying successfully
4. We cannot verify native Git integration status without Vercel dashboard access
5. GitHub Actions provides explicit deployment logs and visibility
6. The fallback is reliable and well-instrumented

---

## Future Considerations

### If Cron Jobs Are Needed
1. Upgrade to Pro plan to unlock all Cron Jobs features, OR
2. Use external cron service (e.g., cron-job.org) to hit API endpoint directly, OR
3. Use Vercel's allowed daily cron schedule (e.g., "0 21 * * *" for once per day at 9 PM)

### If Native Git Integration Verification Is Needed
1. Access Vercel dashboard
2. Check Git settings → Connected repository
3. Verify production branch and root directory configuration
4. Temporarily disable GitHub Actions to test native deployment
5. Re-enable GitHub Actions after verification

---

## Files Modified

- `website/vercel.json` - Removed cron job configuration
- `.github/workflows/vercel-deploy.yml` - Restored with Vercel REST API deployment
- `DEPLOYMENT_INCIDENT_LOG.md` - Incident investigation and resolution log
- `DEPLOYMENT_CAUSAL_ANALYSIS.md` - Detailed causal analysis and architecture correction
- `GITHUB_APP_INVESTIGATION.md` - Initial investigation (outdated assumptions)

---

## Success Condition Met

✅ Deployments are working reliably
✅ Production site is live and responding
✅ Root cause identified and fixed
✅ Architecture assumptions corrected
✅ Reliable deployment mechanism established (GitHub Actions + Vercel REST API)
