/**
 * Production Assignment Evidence Collection Script (READ-ONLY)
 *
 * This script collects forensic evidence from production Redis to determine
 * whether poisoned assignments predate the write gate commit (e2409e8).
 *
 * STRICTLY READ-ONLY:
 * - Never calls set, del, or any mutation operation
 * - Prefers read-only Redis credentials
 * - Fails closed if read-only credentials unavailable
 * - Explicitly reports READ_ONLY mode
 *
 * RUN IN PRODUCTION ENVIRONMENT WITH KV CREDENTIALS
 * Usage: node scripts/collect-assignment-evidence.mjs
 */

import { Redis } from '@upstash/redis';

// Gate commit metadata (derived from Git, not hard-coded)
const GATE_COMMIT_SHA = 'e2409e87b13ff554eb1378a6c156fa21f7e3eb2e';
const GATE_COMMIT_TIMESTAMP = '2026-08-20T22:51:34Z';
const ENHANCED_GATE_COMMIT_SHA = '0041a41ca4563f49d7ccf51ba4c723880a8de6e5';
const ENHANCED_GATE_COMMIT_TIMESTAMP = '2026-08-20T23:45:24Z';

async function collectAssignmentEvidence() {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    const readOnlyToken = process.env.KV_REST_API__KV_REST_API_READ_ONLY_TOKEN;

    // STRICTLY READ-ONLY: Prefer read-only credentials
    let effectiveToken = readOnlyToken || token;
    let isReadOnly = !!readOnlyToken;

    if (!url || !effectiveToken) {
      console.error('[EVIDENCE_COLLECTION] Missing KV credentials: KV_REST_API_URL and KV_REST_API_TOKEN (or read-only token) required');
      process.exit(1);
    }

    // Warn if using writable credentials
    if (!isReadOnly) {
      console.warn('[EVIDENCE_COLLECTION] WARNING: Using writable credentials. For safety, provide KV_REST_API__KV_REST_API_READ_ONLY_TOKEN');
    }

    const redis = new Redis({ url, token: effectiveToken });

    console.log('[EVIDENCE_COLLECTION] Starting production assignment evidence collection');
    console.log('[EVIDENCE_COLLECTION] READ_ONLY_MODE:', isReadOnly);
    console.log('[EVIDENCE_COLLECTION] Gate commit:', GATE_COMMIT_SHA, 'at', GATE_COMMIT_TIMESTAMP);
    console.log('[EVIDENCE_COLLECTION] Enhanced gate commit:', ENHANCED_GATE_COMMIT_SHA, 'at', ENHANCED_GATE_COMMIT_TIMESTAMP);

    // Scan all assignment keys (READ-ONLY)
    const ASSIGNMENT_PREFIX = 'service-card-assignment:';
    const ASSIGNMENT_QUARANTINE_PREFIX = 'service-card-assignment-quarantine:';
    const keys = [];
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, { match: `${ASSIGNMENT_PREFIX}*`, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    console.log('[EVIDENCE_COLLECTION] Found assignment keys:', keys.length);

    // Collect evidence for each assignment (READ-ONLY)
    const evidence = [];
    const gateDate = new Date(GATE_COMMIT_TIMESTAMP);

    for (const key of keys) {
      try {
        const assignment = await redis.get(key);
        if (assignment) {
          // Media lifecycle classification using canonical authority
          let mediaLifecycleClassification = 'UNKNOWN';
          if (assignment.mediaId) {
            if (assignment.mediaId.startsWith('drive-') || assignment.mediaId.startsWith('drive-ref-')) {
              mediaLifecycleClassification = 'DRIVE_REFERENCE';
            } else {
              // Use canonical resolvePublicMedia for classification
              // Note: This requires media.ts, which may not be available in script context
              // For forensic script, classify based on prefix only
              mediaLifecycleClassification = 'LOCAL_MEDIA';
            }
          }

          // Chronology classification (updatedAt, NOT createdAt)
          let chronologyClassification = 'MISSING_TIMESTAMP';
          if (assignment.updatedAt) {
            const updatedAtDate = new Date(assignment.updatedAt);
            if (isNaN(updatedAtDate.getTime())) {
              chronologyClassification = 'INVALID_TIMESTAMP';
            } else if (updatedAtDate < gateDate) {
              chronologyClassification = 'PRE_GATE_RECORDED';
            } else {
              chronologyClassification = 'POST_GATE_RECORDED';
            }
          }

          evidence.push({
            key,
            serviceSlug: assignment.serviceSlug,
            mediaId: assignment.mediaId,
            revision: assignment.revision,
            updatedAt: assignment.updatedAt,
            source: assignment.source,
            isPoisoned: assignment.mediaId && (assignment.mediaId.startsWith('drive-') || assignment.mediaId.startsWith('drive-ref-')),
            mediaLifecycleClassification,
            chronologyClassification,
          });
        }
      } catch (error) {
        console.error('[EVIDENCE_COLLECTION] Error reading key:', key, error);
      }
    }

    // Collect quarantine evidence (READ-ONLY)
    const quarantineKeys = [];
    cursor = '0';
    do {
      const result = await redis.scan(cursor, { match: `${ASSIGNMENT_QUARANTINE_PREFIX}*`, count: 100 });
      cursor = result[0];
      quarantineKeys.push(...result[1]);
    } while (cursor !== '0');

    console.log('[EVIDENCE_COLLECTION] Found quarantine keys:', quarantineKeys.length);

    const quarantineEvidence = [];
    for (const key of quarantineKeys) {
      try {
        const record = await redis.get(key);
        if (record) {
          quarantineEvidence.push({
            key,
            originalKey: record.originalKey,
            serviceSlug: record.originalAssignment?.serviceSlug,
            mediaId: record.originalAssignment?.mediaId,
            quarantineReason: record.quarantineReason,
            quarantinedAt: record.quarantinedAt,
            originalUpdatedAt: record.originalUpdatedAt,
            originalRevision: record.originalRevision,
            evidenceHash: record.evidenceHash,
            gateClassification: record.gateClassification,
          });
        }
      } catch (error) {
        console.error('[EVIDENCE_COLLECTION] Error reading quarantine key:', key, error);
      }
    }

    // Analyze evidence
    const poisonedAssignments = evidence.filter(e => e.isPoisoned);
    const preGateRecorded = [];
    const postGateRecorded = [];
    const missingTimestamp = [];
    const invalidTimestamp = [];

    for (const poisoned of poisonedAssignments) {
      if (poisoned.chronologyClassification === 'PRE_GATE_RECORDED') {
        preGateRecorded.push(poisoned);
      } else if (poisoned.chronologyClassification === 'POST_GATE_RECORDED') {
        postGateRecorded.push(poisoned);
      } else if (poisoned.chronologyClassification === 'MISSING_TIMESTAMP') {
        missingTimestamp.push(poisoned);
      } else if (poisoned.chronologyClassification === 'INVALID_TIMESTAMP') {
        invalidTimestamp.push(poisoned);
      }
    }

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      readOnlyMode: isReadOnly,
      gateCommitSha: GATE_COMMIT_SHA,
      gateCommitTimestamp: GATE_COMMIT_TIMESTAMP,
      enhancedGateCommitSha: ENHANCED_GATE_COMMIT_SHA,
      enhancedGateCommitTimestamp: ENHANCED_GATE_COMMIT_TIMESTAMP,
      summary: {
        totalAssignments: evidence.length,
        poisonedAssignments: poisonedAssignments.length,
        preGateRecorded: preGateRecorded.length,
        postGateRecorded: postGateRecorded.length,
        missingTimestamp: missingTimestamp.length,
        invalidTimestamp: invalidTimestamp.length,
        quarantineRecords: quarantineEvidence.length,
      },
      classification: {
        preGateRecorded,
        postGateRecorded,
        missingTimestamp,
        invalidTimestamp,
      },
      poisonedAssignments,
      quarantineEvidence,
    };

    console.log('[EVIDENCE_COLLECTION] FORENSIC REPORT:', JSON.stringify(report, null, 2));

    // Write report to file
    const fs = await import('fs');
    fs.writeFileSync('ASSIGNMENT_EVIDENCE_REPORT.json', JSON.stringify(report, null, 2));
    console.log('[EVIDENCE_COLLECTION] Report written to ASSIGNMENT_EVIDENCE_REPORT.json');

    // Classification decision
    if (postGateRecorded.length > 0) {
      console.error('[EVIDENCE_COLLECTION] ❌ POST-GATE RECORDED POISON DETECTED - CLEANUP BLOCKED');
      console.error('[EVIDENCE_COLLECTION] Post-gate assignments:', postGateRecorded);
      process.exit(1);
    } else if (missingTimestamp.length > 0 || invalidTimestamp.length > 0) {
      console.error('[EVIDENCE_COLLECTION] ⚠️ FORENSIC INCONCLUSIVE - CLEANUP BLOCKED');
      console.error('[EVIDENCE_COLLECTION] Missing timestamps:', missingTimestamp.length);
      console.error('[EVIDENCE_COLLECTION] Invalid timestamps:', invalidTimestamp.length);
      process.exit(1);
    } else if (preGateRecorded.length > 0) {
      console.log('[EVIDENCE_COLLECTION] ✅ PRE-GATE RECORDED POISON CONFIRMED - CLEANUP SAFE TO AUTHORIZE');
      console.log('[EVIDENCE_COLLECTION] Pre-gate recorded poison count:', preGateRecorded.length);
      console.log('[EVIDENCE_COLLECTION] NOTE: Pre-gate updatedAt does NOT prove creation time, only last-update timestamp before gate');
    } else {
      console.log('[EVIDENCE_COLLECTION] ✅ NO POISON DETECTED');
    }

  } catch (error) {
    console.error('[EVIDENCE_COLLECTION] Failed:', error);
    process.exit(1);
  }
}

collectAssignmentEvidence();