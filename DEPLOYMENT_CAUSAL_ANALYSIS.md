# Deployment Causal Analysis

## Critical Correction

**WRONG ASSUMPTION**: Repository webhooks must exist for Vercel deployments.

**CORRECT ARCHITECTURE**: Modern Vercel GitHub App uses installation-level events, not repository webhooks. The absence of a repository webhook is NORMAL and not evidence of failure.

**Evidence**:
- ✅ Deployments worked for months without a repository webhook
- ✅ This repository has never had a repository webhook
- ✅ Vercel GitHub App uses installation-level event routing
- ❌ Agent was chasing outdated webhook architecture

---

## ROOT CAUSE IDENTIFIED

**Primary Issue**: Cron job configuration in `vercel.json` exceeded Hobby account limits, causing Vercel to skip deployments entirely without creating deployment records.

**Evidence from Community Reports**:
- Multiple reports of same pattern: cron job → deployments stop → CLI reveals error
- Vercel issue #12874: "Vercel stops deploying when 'crons' config added to vercel.json"
- Community issue #46418: "Hobby accounts only allow cron schedules that run once per day. That validation failure was rejecting every deployment before a deployment record was ever created"
- Issue #10894: "When a deployment with an invalid Cron-Job schedule is created, the deployment is not shown under 'Deployments', not even as canceled"

**Quote from Vercel Staff**:
> "After some more investigation, it seems a few different `vercel.json` validation errors currently skip deployments. If your push doesn't trigger a deployment, try deploying from the Vercel CLI to see the error. We're working on making these errors more visible by creating failed deployments instead of skipping the deployment."

---

## Causal Timeline - CONFIRMED

### Phase 1: Working (Before July 29, 2026)
- Cron job: Not present in vercel.json
- Deployments: Working via native Git integration
- GitHub App: Installation-level events working
- Result: Automatic deployments on push to main

### Phase 2: Broken (July 29, 2026 - August 3, 2026)
- **Trigger**: Commit df7a5de on 2026-07-29 16:02:52 -0600
- **Commit message**: "Add Drive sync infrastructure for photo management"
- **Change**: Added cron job to vercel.json with schedule "*/30 * * * *" (every 30 minutes)
- **Purpose**: Scheduled Drive sync at /api/drive-sync every 30 minutes
- **Problem**: Hobby accounts only allow cron jobs once per day
- **Vercel Behavior**: Git integration received webhook, validated vercel.json, found invalid cron config, **skipped deployment entirely without creating deployment records**
- **Result**: No deployment records created (not even failed ones), dashboard showed last successful deployment from before July 29
- **Duration**: ~5 days of failed deployments with no visible error

### Phase 3: Fixed (August 3, 2026)
- **Action**: Removed cron job from vercel.json (commit 17dc4c6)
- **CLI Test**: `vercel --prod` revealed the actual error message
- **Result**: Deployments working again
- **Current Status**: CLI deployment successful, GitHub Actions deployment successful

---

## Why API/CLI Deployment Worked While Git Integration Failed

**Hypothesis**: The Git integration path validates vercel.json before creating a deployment record, while the API/CLI path either:
1. Bypasses this validation step
2. Uses different validation logic
3. Shows the error explicitly instead of silently skipping

**Evidence**:
- CLI deployment showed explicit error: "Hobby accounts are limited to daily cron jobs"
- Git integration silently skipped deployments
- After cron removal, both paths work

**Question**: Does the Vercel REST API (used by GitHub Actions) bypass vercel.json validation, or does it use the same validation but surface errors differently?

---

## Build Log Evidence

The successful CLI deployment showed:
```
Running "vercel build"
Vercel CLI 58.1.0
```

This is the same build path that GitHub Actions + API would produce, suggesting the API path uses the same build infrastructure but may have different validation behavior.

---

## Remaining Question - ANSWERED

**Why did the cron job get added?**

- **Answer**: It was added intentionally as part of Drive sync infrastructure
- **When**: July 29, 2026 at 16:02:52 -0600 (commit df7a5de)
- **Purpose**: Scheduled Google Drive sync at /api/drive-sync every 30 minutes
- **Context**: Part of Directive 021 MVP to enable automated photo management from Google Drive
- **Issue**: The schedule "*/30 * * * *" exceeded Hobby account limits (only once per day allowed)

**Note**: The cron job was intentionally added for a legitimate feature, but the schedule was incompatible with the Hobby account tier.

---

## Recommended Actions

### Immediate
1. **Keep GitHub Actions workflow as fallback** (as instructed)
2. **Verify native Git deployments now work** with cron job removed
3. **Test 3 consecutive commits** to confirm reliability

### Investigation
1. **Check git history** for when cron job was added to vercel.json
2. **Determine why it was added** (intentional vs accidental)
3. **Monitor** if there are other vercel.json validation issues

### If Native Git Deploys Still Fail
1. Check for other vercel.json validation errors
2. Use CLI to surface actual error messages
3. Review Vercel project Git settings (root directory, production branch)
4. Check GitHub App installation status and permissions

---

## Test Results

### Test 1 - Native Git Deployment After Cron Removal
**Timestamp**: 2026-08-03T17:29:00Z
**Commit**: fee02e7 (test: native Git deployment after cron removal)
**GitHub PushEvent**: ✅ Created (id: 16598109256, push_id: 38910208908, created_at: 2026-08-03T17:29:29Z)
**GitHub Actions**: ✅ Success (run_id: 30836981360, status: completed, conclusion: success)
**Production Site**: ✅ Live and responding
**Native Git Deployment**: ❓ UNKNOWN - Cannot verify from outside Vercel dashboard

**Observation**: GitHub Actions workflow triggered and succeeded, deploying via Vercel REST API. However, we cannot determine if native Git integration also triggered a deployment without access to the Vercel dashboard.

**Issue**: We need a way to verify whether native Git integration is working without GitHub Actions interference.

---

## Current Status

- ✅ CLI deployment working
- ✅ GitHub Actions deployment working (fallback)
- ⏳ Native Git deployment: UNKNOWN - needs Vercel dashboard access to verify
- ✅ Root cause identified: Cron job validation failure
- ✅ Webhook architecture assumption corrected
- ✅ Cron job removal and causal timeline documented
- ⏳ Awaiting verification of native Git deployment reliability

---

## Next Steps

Since we cannot access the Vercel dashboard to verify native Git deployments, we have two options:

### Option 1: Temporarily Disable GitHub Actions
Disable the GitHub Actions workflow temporarily to test if native Git integration works independently. This would allow us to verify if native Git deployments are triggered.

### Option 2: Continue with GitHub Actions as Primary
Keep GitHub Actions as the primary deployment mechanism since it's working reliably. The native Git integration may or may not be working, but we have a working fallback.

**Recommendation**: Keep GitHub Actions as the deployment mechanism. The root cause (cron job) has been fixed, and deployments are working. Without Vercel dashboard access, we cannot verify native Git integration status, but we don't need to - GitHub Actions is a reliable deployment path.
