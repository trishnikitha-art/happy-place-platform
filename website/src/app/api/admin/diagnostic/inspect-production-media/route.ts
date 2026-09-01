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
 * - Inspects production KV media records and Blob metadata
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
 * - MISSING_ORIGINAL_BLOB: No original variant present → INVALID
 * - MISSING_BLOB_METADATA: Media exists but blob_metadata:* record missing → INVALID
 * - BLOB_NOT_FOUND: Blob URL present but object doesn't exist → INVALID
 * - BLOB_HASH_MISMATCH: Blob bytes don't match expected hash → QUARANTINE
 * - BLOB_UNVERIFIABLE: Infrastructure error prevents verification → UNVERIFIABLE
 * - PHYSICALLY_VERIFIED: Real hash + valid Blob metadata + original Blob bytes match → VALID
 * - ERROR: Classification error
 * 
 * P0 FIXES:
 * - Requires Workbench authentication (admin authorization boundary)
 * - Missing contentHash is explicit failure classification
 * - Missing original Blob URL is explicit failure classification
 * - Never uses web variant as substitute for original hash verification
 * - Storage errors have typed classification (UNVERIFIABLE vs BLOB_NOT_FOUND)
 * - Enumeration/classification accounting is exact (no double-counting)
 * - CLASSIFIED verdict only after accounting validation
 * - Diagnostic is stricter than production public gate
 * - No repair operations (inspection-only)
 * - Renamed from reconcile to inspect (no repairs implemented)
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { getMediaRecordRaw, listMediaIds } from "@/lib/media-kv-store";
import { getBlobMetadataByContentHash, verifyBlobHash, type BlobHashVerificationResult } from "@/lib/blob-storage";
import crypto from "crypto";

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
  classification: 'SYNTHETIC_HASH' | 'MISSING_CONTENT_HASH' | 'MISSING_ORIGINAL_BLOB' | 'MISSING_BLOB_METADATA' | 'BLOB_NOT_FOUND' | 'BLOB_HASH_MISMATCH' | 'BLOB_UNVERIFIABLE' | 'PHYSICALLY_VERIFIED' | 'ERROR';
  contentHash?: string;
  isSynthetic?: boolean;
  hasBlobMetadata?: boolean;
  blobUrl?: string;
  blobExists?: boolean;
  blobHashValid?: boolean;
  lifecycleState?: string;
  source?: string;
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

    console.log('[PRODUCTION_MEDIA_INSPECTION] CONFIGURED', { 
      testId,
    });

    // STATE: CONFIGURED → ENUMERATED
    const mediaIds = await listMediaIds();
    
    console.log('[PRODUCTION_MEDIA_INSPECTION] ENUMERATED', { 
      testId, 
      mediaCount: mediaIds.length 
    });

    // STATE: ENUMERATED → CLASSIFIED
    const classifications: MediaClassification[] = [];
    const classificationCounts: Record<string, number> = {
      SYNTHETIC_HASH: 0,
      MISSING_CONTENT_HASH: 0,
      MISSING_ORIGINAL_BLOB: 0,
      MISSING_BLOB_METADATA: 0,
      BLOB_NOT_FOUND: 0,
      BLOB_HASH_MISMATCH: 0,
      BLOB_UNVERIFIABLE: 0,
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
        };

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

        // Check for Blob metadata
        const blobMetadata = await getBlobMetadataByContentHash(contentHash);
        classification.hasBlobMetadata = !!blobMetadata;

        if (!blobMetadata) {
          classification.classification = 'MISSING_BLOB_METADATA';
          classificationCounts.MISSING_BLOB_METADATA++;
          classifications.push(classification);
          continue;
        }

        // P0: Missing original Blob URL is explicit failure
        const originalBlobUrl = media.variants?.original;
        if (!originalBlobUrl) {
          classification.classification = 'MISSING_ORIGINAL_BLOB';
          classificationCounts.MISSING_ORIGINAL_BLOB++;
          classifications.push(classification);
          continue;
        }

        classification.blobUrl = originalBlobUrl;

        // P0: Verify contentHash only against original variant (never web)
        // Use structured error types from verifyBlobHash instead of string matching
        const verificationResult = await verifyBlobHash(originalBlobUrl, contentHash);
        
        classification.blobExists = verificationResult.success;
        classification.blobHashValid = verificationResult.success;

        if (!verificationResult.success) {
          // P0: Use structured error types instead of string matching
          switch (verificationResult.errorType) {
            case 'BLOB_NOT_FOUND':
              classification.classification = 'BLOB_NOT_FOUND';
              classificationCounts.BLOB_NOT_FOUND++;
              classification.errorType = 'BLOB_NOT_FOUND';
              break;
            case 'AUTH_FAILURE':
              classification.classification = 'BLOB_UNVERIFIABLE';
              classificationCounts.BLOB_UNVERIFIABLE++;
              classification.errorType = 'AUTH_FAILURE';
              break;
            case 'INTEGRITY_FAILURE':
              classification.classification = 'BLOB_HASH_MISMATCH';
              classificationCounts.BLOB_HASH_MISMATCH++;
              classification.errorType = 'INTEGRITY_FAILURE';
              break;
            case 'TRANSPORT_ERROR':
              classification.classification = 'BLOB_UNVERIFIABLE';
              classificationCounts.BLOB_UNVERIFIABLE++;
              classification.errorType = 'TRANSPORT_ERROR';
              break;
            case 'INVALID_URL':
              classification.classification = 'MISSING_ORIGINAL_BLOB';
              classificationCounts.MISSING_ORIGINAL_BLOB++;
              classification.errorType = 'INVALID_URL';
              break;
            default:
              classification.classification = 'BLOB_UNVERIFIABLE';
              classificationCounts.BLOB_UNVERIFIABLE++;
              classification.errorType = 'UNKNOWN_ERROR';
          }
          
          classification.error = verificationResult.errorType;
          classifications.push(classification);
          continue;
        }

        // If we got here, the record is physically verified
        classification.classification = 'PHYSICALLY_VERIFIED';
        classificationCounts.PHYSICALLY_VERIFIED++;
        classifications.push(classification);

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
          error: error instanceof Error ? error.message : 'Unknown error',
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
        classificationCounts,
        classifications: classifications.slice(0, 100), // Limit to first 100 for response size
        totalMediaRecords: mediaIds.length,
        totalClassified,
        missingRecords,
        accountingValid,
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