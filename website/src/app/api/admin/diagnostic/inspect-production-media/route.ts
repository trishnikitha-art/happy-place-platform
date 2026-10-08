/**
 * Production Media Inspection Diagnostic
 * 
 * EVIDENCE STATE MACHINE: NOT_CONFIGURED → CONFIGURED → ENUMERATED → CLASSIFIED
 * 
 * NOTE: CLASSIFIED ≠ VERIFIED ≠ PROVEN
 * - CLASSIFIED: All records received a classification determination
 * - VERIFIED: All records passed physical verification tests (NOT IMPLEMENTED)
 * - PROVEN: System-level invariants independently satisfied (NOT IMPLEMENTED)
 * 
 * CLASSIFICATION: SYNTHETIC-READ
 * - Inspects production KV media records and R2 objects
 * - Classifies records by health status with fail-closed logic
 * - Does NOT perform repairs (inspection-only diagnostic)
 * - Does NOT provide physical verification evidence (classification only)
 * - Must be run with explicit admin authorization
 * 
 * TEST ID: production-media-inspection
 * 
 * POST /api/admin/diagnostic/inspect-production-media
 * 
 * Performs:
 * - Enumerate all media:* records in KV (ENUMERATED)
 * - Classify each record by health status (CLASSIFIED)
 * - Return classification evidence without repairs
 * 
 * Classification categories (stricter than production public gate):
 * - SYNTHETIC_HASH: Hash derived from canonical ID, not actual bytes → QUARANTINE
 * - MISSING_CONTENT_HASH: No contentHash present → INVALID
 * - MISSING_R2_OBJECT: No original variant present → INVALID
 * - R2_NOT_FOUND: R2 object doesn't exist → INVALID
 * - R2_HASH_MISMATCH: R2 bytes don't match expected hash → QUARANTINE
 * - R2_UNVERIFIABLE: Infrastructure error prevents verification → UNVERIFIABLE
 * - PHYSICALLY_VERIFIED: Real hash + valid R2 object + bytes match → VALID
 * - ERROR: Classification error
 * 
 * P0 FIXES:
 * - Requires Workbench authentication (admin authorization boundary)
 * - Missing contentHash is explicit failure classification
 * - Missing original variant is explicit failure classification
 * - Never uses web variant as substitute for original hash verification
 * - Storage errors have typed classification (UNVERIFIABLE vs R2_NOT_FOUND)
 * - Enumeration/classification accounting is exact (no double-counting)
 * - CLASSIFIED verdict only after accounting validation
 * - Diagnostic is stricter than production public gate
 * - No repair operations (inspection-only)
 * - Renamed from reconcile to inspect (no repairs implemented)
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { getMediaRecordRaw, listMediaIds } from "@/lib/media-kv-store";
import { verifyR2Hash } from "@/lib/r2-storage";
import staticManifest from "@/config/media.v1.json";
import type { Media } from "@/types/media";
import { getKvNamespace } from "@/lib/environment";
import crypto from "crypto";

// Inspection-only helpers. These do not alter published eligibility or assignment.
function matchesStaticManifestIdentity(media: Media): boolean {
  if (media.lifecycleState !== 'published' || media.source !== 'local' || media.storage !== 'static') return false;
  const approved = staticManifest.media.find(asset => asset.contentHash === media.contentHash
    && asset.variants.original === media.variants?.original);
  if (!approved || !media.variants) return false;
  return Object.entries(approved.variants).every(([key, value]) =>
    (media.variants as Record<string, unknown>)[key] === value)
    && Object.entries(media.variants).every(([key, value]) =>
      (approved.variants as Record<string, unknown>)[key] === value);
}

function getVerifiedR2ObjectKey(address: string): string | null {
  try {
    const base = new URL(process.env.R2_PUBLIC_BASE_URL || '');
    const object = new URL(address);
    if (base.protocol !== 'https:' || object.protocol !== 'https:'
      || base.username || base.password || base.search || base.hash
      || object.username || object.password || object.search || object.hash
      || object.origin !== base.origin) return null;
    const prefix = base.pathname.replace(/\/$/, '') + '/';
    if (!object.pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(object.pathname.slice(prefix.length));
    if (!key || key.includes('\\') || key.split('/').some(part => part === '.' || part === '..')) return null;
    return key;
  } catch { return null; }
}

interface EvidenceResult {
  testId: string;
  startTime: string;
  endTime: string;
  deploymentSha: string;
  environment: string;
  dependency: string;
  operation: string;
  expectedInvariant: string;
  observedResult: string;
  evidence: Record<string, unknown>;
  cleanupStatus: string;
  verdict: 'NOT_CONFIGURED' | 'CONFIGURED' | 'ENUMERATED' | 'CLASSIFIED' | 'FAILED';
}

interface MediaClassification {
  mediaId: string;
  classification: 'DRIVE_REFERENCE' | 'STATIC_MANIFEST_MATCH' | 'STATIC_MANIFEST_MISMATCH' | 'SYNTHETIC_HASH' | 'MISSING_CONTENT_HASH' | 'MISSING_R2_OBJECT' | 'R2_NOT_FOUND' | 'R2_HASH_MISMATCH' | 'R2_UNVERIFIABLE' | 'PHYSICALLY_VERIFIED' | 'ERROR';
  contentHash?: string;
  isSynthetic?: boolean;
  hasR2Object?: boolean;
  r2Url?: string;
  r2Exists?: boolean;
  r2HashValid?: boolean;
  lifecycleState?: string;
  source?: string;
  storage?: string;
  error?: string;
  errorType?: string;
}

interface InspectionRequest {
  // inspection-only diagnostic - no repair mode
}

export async function POST(request: Request) {
  const testId = `production-media-reconciliation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date().toISOString();
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  
  console.log('[PRODUCTION_MEDIA_RECONCILIATION] TEST_STARTED', { testId, startTime, deploymentSha, environment });

  // REQUIRE ADMIN AUTHORIZATION
  // Workbench authentication serves as the admin authorization boundary for this codebase
  // The Workbench password (WORKBENCH_PASSWORD) is the owner/admin access control mechanism
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      dependency: 'Production Media Inspection',
      operation: 'authentication',
      expectedInvariant: 'Workbench session authenticated (admin authorization)',
      observedResult: 'Unauthorized',
      evidence: { authenticated: false },
      cleanupStatus: 'not_required',
      verdict: 'FAILED',
    }, { status: 401 });
  }

  try {
    const body: InspectionRequest = await request.json();
    // Authenticated presence flags only: never expose credentials or key hashes.
    const variableNames = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'ENCRYPTION_KEY',
      'ENCRYPTION_KEY_V1', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI',
      'WORKBENCH_PASSWORD', 'HPP_WORKBENCH_PRINCIPAL_ID', 'BLOB_READ_WRITE_TOKEN',
      'R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_BASE_URL'];
    const runtimeConfiguration = Object.fromEntries(variableNames.map(name =>
      [name, process.env[name] ? 'PRESENT' : 'MISSING']));

    console.log('[PRODUCTION_MEDIA_INSPECTION] CONFIGURED', { 
      testId,
    });

    // STATE: CONFIGURED → ENUMERATED
    const mediaIds = [...new Set(await listMediaIds())];
    
    console.log('[PRODUCTION_MEDIA_INSPECTION] ENUMERATED', { 
      testId, 
      mediaCount: mediaIds.length 
    });

    // STATE: ENUMERATED → CLASSIFIED
    const classifications: MediaClassification[] = [];
    const classificationCounts: Record<string, number> = {
      DRIVE_REFERENCE: 0,
      STATIC_MANIFEST_MATCH: 0,
      STATIC_MANIFEST_MISMATCH: 0,
      SYNTHETIC_HASH: 0,
      MISSING_CONTENT_HASH: 0,
      MISSING_R2_OBJECT: 0,
      R2_NOT_FOUND: 0,
      R2_HASH_MISMATCH: 0,
      R2_UNVERIFIABLE: 0,
      PHYSICALLY_VERIFIED: 0,
      ERROR: 0,
    };
    let missingRecords = 0;

    for (const mediaId of mediaIds) {
      try {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) {
          console.warn('[PRODUCTION_MEDIA_INSPECTION] MEDIA_RECORD_MISSING', { testId, mediaId });
          missingRecords++;
          continue;
        }

        const classification: MediaClassification = {
          mediaId,
          classification: 'ERROR',
          lifecycleState: media.lifecycleState,
          source: media.source,
          storage: media.storage,
        };

        // Source references have their own lifecycle. Missing published fields
        // do not justify deleting a reference or classifying it as published.
        if (media.source === 'google-drive' || media.lifecycleState === 'source_reference'
          || mediaId.startsWith('drive-')) {
          classification.classification = 'DRIVE_REFERENCE';
          classificationCounts.DRIVE_REFERENCE++;
          classifications.push(classification);
          continue;
        }

        // P0: Missing contentHash is explicit failure
        const contentHash = media.contentHash;
        if (!contentHash) {
          classification.classification = 'MISSING_CONTENT_HASH';
          classificationCounts.MISSING_CONTENT_HASH++;
          classifications.push(classification);
          continue;
        }

        classification.contentHash = contentHash;

        // Check for synthetic content identity
        const syntheticHash = crypto.createHash('sha256').update(mediaId).digest('hex');
        classification.isSynthetic = (contentHash === syntheticHash);

        if (classification.isSynthetic) {
          classification.classification = 'SYNTHETIC_HASH';
          classificationCounts.SYNTHETIC_HASH++;
          classifications.push(classification);
          continue;
        }

        // R2-SPECIFIC: Check storage type
        if (media.storage !== 'r2' && media.storage !== 'static') {
          classification.classification = 'ERROR';
          classification.errorType = 'INVALID_STORAGE_TYPE';
          classification.error = `Invalid storage type: ${media.storage}`;
          classificationCounts.ERROR++;
          classifications.push(classification);
          continue;
        }

        if (media.storage === 'static') {
          // Manifest identity is release evidence, not deployed byte proof.
          classification.classification = matchesStaticManifestIdentity(media)
            ? 'STATIC_MANIFEST_MATCH' : 'STATIC_MANIFEST_MISMATCH';
          classificationCounts[classification.classification]++;
          classifications.push(classification);
          continue;
        }

        // For R2 storage, verify R2 object exists and hash matches
        if (media.storage === 'r2') {
          const originalUrl = media.variants?.original;
          if (!originalUrl) {
            classification.classification = 'MISSING_R2_OBJECT';
            classificationCounts.MISSING_R2_OBJECT++;
            classification.errorType = 'MISSING_ORIGINAL_VARIANT';
            classifications.push(classification);
            continue;
          }

          classification.r2Url = originalUrl;

          // Extract R2 object key from URL
          const objectKey = getVerifiedR2ObjectKey(originalUrl);
          if (!objectKey) {
            classification.classification = 'R2_UNVERIFIABLE';
            classification.errorType = 'UNVERIFIED_PUBLIC_ORIGIN';
            classificationCounts.R2_UNVERIFIABLE++;
            classifications.push(classification);
            continue;
          }

          // Verify R2 object hash
          const verificationResult = await verifyR2Hash(objectKey, contentHash);
          
          classification.r2Exists = verificationResult.success || verificationResult.errorType === 'INTEGRITY_FAILURE'
            ? true : verificationResult.errorType === 'OBJECT_NOT_FOUND' ? false : undefined;
          classification.r2HashValid = verificationResult.success;

          if (!verificationResult.success) {
            switch (verificationResult.errorType) {
              case 'OBJECT_NOT_FOUND':
                classification.classification = 'R2_NOT_FOUND';
                classificationCounts.R2_NOT_FOUND++;
                classification.errorType = 'OBJECT_NOT_FOUND';
                break;
              case 'AUTH_FAILURE':
                classification.classification = 'R2_UNVERIFIABLE';
                classificationCounts.R2_UNVERIFIABLE++;
                classification.errorType = 'AUTH_FAILURE';
                break;
              case 'INTEGRITY_FAILURE':
                classification.classification = 'R2_HASH_MISMATCH';
                classificationCounts.R2_HASH_MISMATCH++;
                classification.errorType = 'INTEGRITY_FAILURE';
                classification.error = `Hash mismatch: expected ${contentHash}, got ${verificationResult.actualHash}`;
                break;
              case 'TRANSPORT_ERROR':
                classification.classification = 'R2_UNVERIFIABLE';
                classificationCounts.R2_UNVERIFIABLE++;
                classification.errorType = 'TRANSPORT_ERROR';
                break;
              default:
                classification.classification = 'R2_UNVERIFIABLE';
                classificationCounts.R2_UNVERIFIABLE++;
                classification.errorType = 'UNKNOWN_ERROR';
                break;
            }
            classifications.push(classification);
            continue;
          }

          // P0: Physical verification succeeded
          classification.classification = 'PHYSICALLY_VERIFIED';
          classificationCounts.PHYSICALLY_VERIFIED++;
          classifications.push(classification);
        }

      } catch (error) {
        console.error('[PRODUCTION_MEDIA_INSPECTION] CLASSIFICATION_ERROR', {
          testId,
          mediaId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        classificationCounts.ERROR++;
        classifications.push({
          mediaId,
          classification: 'ERROR',
          // P1: Safe error code - no sensitive infrastructure details
          error: 'CLASSIFICATION_ERROR',
        });
      }
    }

    // P0: Exact accounting requirement - structurally impossible to double-count
    // Every attempted record receives exactly one classification (including ERROR)
    // Missing records receive no classification
    // Invariant: enumerated = all_classifications + missing_records
    const totalClassified = classifications.length;
    const accountingValid = (totalClassified + missingRecords) === mediaIds.length;

    // Explicit assertion test for accounting invariant
    if (!accountingValid) {
      console.error('[PRODUCTION_MEDIA_INSPECTION] ACCOUNTING_INVARIANT_VIOLATION', {
        testId,
        enumerated: mediaIds.length,
        totalClassified,
        missingRecords,
        expectedSum: totalClassified + missingRecords,
        actualSum: mediaIds.length,
      });
    }

    console.log('[PRODUCTION_MEDIA_INSPECTION] CLASSIFIED', { 
      testId, 
      classificationCounts,
      totalMediaRecords: mediaIds.length,
      totalClassified,
      missingRecords,
      accountingValid,
    });

    const endTime = new Date().toISOString();

    // P0: PROVEN verdict only if accounting is valid and all required checks succeed
    const verdict = accountingValid ? 'CLASSIFIED' : 'FAILED';

    // Return classification evidence without repairs (inspection-only diagnostic)
    return NextResponse.json({
      testId,
      startTime,
      endTime,
      deploymentSha,
      environment,
      dependency: 'Production Media Inspection',
      operation: 'classification',
      expectedInvariant: 'All media records classified with exact accounting',
      observedResult: accountingValid 
        ? `Classified ${totalClassified} media records with exact accounting`
        : `Accounting mismatch: ${totalClassified + missingRecords} accounted vs ${mediaIds.length} enumerated`,
      evidence: {
        namespace: getKvNamespace(),
        runtimeConfiguration,
        verificationScope: {
          static: 'committed-manifest-identity-only',
          r2: 'original-object-byte-hash-only',
          publicRenditions: 'not-audited-by-this-route',
        },
        classificationCounts,
        // Aggregate counts cover ALL records (no truncation)
        totalMediaRecords: mediaIds.length,
        totalClassified,
        missingRecords,
        accountingValid,
        // Sampled classification details (first 100 for response size)
        // Full classification details require pagination mechanism
        sampledClassifications: classifications.slice(0, 100),
        sampledCount: Math.min(classifications.length, 100),
        hasMoreSamples: classifications.length > 100,
      },
      cleanupStatus: 'not_required',
      verdict,
    });

  } catch (error) {
    console.error('[PRODUCTION_MEDIA_INSPECTION] FAILED', {
      testId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      dependency: 'Production Media Inspection',
      operation: 'classification',
      expectedInvariant: 'Classification completes without errors',
      observedResult: 'Classification failed',
      evidence: { error: error instanceof Error ? error.message : 'Unknown error' },
      cleanupStatus: 'not_required',
      verdict: 'FAILED',
    }, { status: 500 });
  }
}
