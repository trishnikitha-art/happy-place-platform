/**
 * KV Media Bootstrap Evidence-Producing Diagnostic
 * 
 * EVIDENCE STATE MACHINE: NOT_CONFIGURED → CONFIGURED → EXECUTED → POSTCONDITION_VERIFIED → PROVEN
 * 
 * CLASSIFICATION: SYNTHETIC-WRITE
 * - Bootstraps media records from static media.v1.json into KV
 * - For one-time migration from static file authority to KV authority
 * - Must be run with explicit admin authorization
 * 
 * TEST ID: kv-media-bootstrap
 * 
 * POST /api/admin/diagnostic/bootstrap-kv-media
 * 
 * Performs:
 * - Load media.v1.json (CONFIGURED)
 * - Iterate through all media records
 * - For each record: check if in KV, if not write to KV (EXECUTED)
 * - Verify records were written (POSTCONDITION_VERIFIED)
 * - Return evidence of bootstrap operation (PROVEN)
 * 
 * This is a one-time migration operation to populate KV with existing media records.
 * After bootstrap, KV becomes the sole authority for all media.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { loadMediaManifest } from "@/lib/media";

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
  verdict: 'NOT_CONFIGURED' | 'CONFIGURED' | 'EXECUTED' | 'POSTCONDITION_VERIFIED' | 'PROVEN' | 'FAILED';
}

export async function POST() {
  const testId = `kv-media-bootstrap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date().toISOString();
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  
  console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] TEST_STARTED', { testId, startTime, deploymentSha, environment });

  // REQUIRE ADMIN AUTHORIZATION
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      dependency: 'KV Media Bootstrap',
      operation: 'authentication',
      expectedInvariant: 'Admin session authenticated',
      observedResult: 'Unauthorized',
      evidence: { authenticated: false },
      cleanupStatus: 'not_required',
      verdict: 'FAILED',
    }, { status: 401 });
  }

  try {
    // STATE: NOT_CONFIGURED → CONFIGURED
    const manifest = loadMediaManifest();
    if (!manifest || !manifest.media || manifest.media.length === 0) {
      return NextResponse.json({
        testId,
        startTime,
        endTime: new Date().toISOString(),
        deploymentSha,
        environment,
        dependency: 'Media Authority',
        operation: 'load_authority',
        expectedInvariant: 'Media authority loads with records',
        observedResult: 'NOT_CONFIGURED',
        evidence: { mediaLoaded: false, mediaCount: 0 },
        cleanupStatus: 'not_required',
        verdict: 'NOT_CONFIGURED',
      });
    }
    
    console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] CONFIGURED', { 
      testId, 
      mediaCount: manifest.media.length 
    });
    
    // STATE: CONFIGURED → EXECUTED
    const { saveMedia, getMedia } = await import('@/lib/media-kv-store');
    
    let bootstrapped = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    
    for (const media of manifest.media) {
      try {
        // Check if already in KV
        const existing = await getMedia(media.id);
        if (existing) {
          skipped++;
          console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] SKIPPED', { 
            testId, 
            mediaId: media.id,
            reason: 'Already in KV'
          });
          continue;
        }
        
        // Write to KV
        await saveMedia(media);
        bootstrapped++;
        console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] BOOTSTRAPPED', { 
          testId, 
          mediaId: media.id 
        });
        
      } catch (error) {
        failed++;
        errors[media.id] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[KV_MEDIA_BOOTSTRAP_EVIDENCE] FAILED', {
          testId,
          mediaId: media.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // STATE: EXECUTED → POSTCONDITION_VERIFIED
    // Verify ALL bootstrapped records, not just a sample
    let verified = 0;
    let failedVerification = 0;
    const verificationErrors: Record<string, string> = {};
    
    for (const media of manifest.media) {
      try {
        const inKV = await getMedia(media.id);
        if (inKV) {
          // Verify Blob authority for published local media
          if (inKV.lifecycleState === 'published' && inKV.source === 'local' && inKV.contentHash) {
            const { getBlobMetadataByContentHash } = await import('@/lib/blob-storage');
            const blobMetadata = await getBlobMetadataByContentHash(inKV.contentHash);
            
            if (!blobMetadata) {
              failedVerification++;
              verificationErrors[media.id] = 'Missing Blob metadata';
              console.error('[KV_MEDIA_BOOTSTRAP_EVIDENCE] VERIFICATION_FAILED', {
                testId,
                mediaId: media.id,
                reason: 'No blob_metadata record found for content hash'
              });
              continue;
            }
            
            // Verify physical Blob hash if original variant exists
            if (inKV.variants?.original) {
              const { verifyBlobHash } = await import('@/lib/blob-storage');
              const hashVerified = await verifyBlobHash(inKV.variants.original, inKV.contentHash);
              
              if (!hashVerified) {
                failedVerification++;
                verificationErrors[media.id] = 'Blob hash verification failed';
                console.error('[KV_MEDIA_BOOTSTRAP_EVIDENCE] VERIFICATION_FAILED', {
                  testId,
                  mediaId: media.id,
                  reason: 'Physical Blob bytes do not match content hash'
                });
                continue;
              }
            }
          }
          
          verified++;
          console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] VERIFICATION_PASSED', {
            testId,
            mediaId: media.id,
            lifecycleState: inKV.lifecycleState,
            source: inKV.source
          });
        } else {
          failedVerification++;
          verificationErrors[media.id] = 'Not found in KV after bootstrap';
        }
      } catch (error) {
        failedVerification++;
        verificationErrors[media.id] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[KV_MEDIA_BOOTSTRAP_EVIDENCE] VERIFICATION_ERROR', {
          testId,
          mediaId: media.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    const endTime = new Date().toISOString();
    const verificationRate = manifest.media.length > 0 ? verified / manifest.media.length : 0;
    
    // STATE: POSTCONDITION_VERIFIED → PROVEN
    return NextResponse.json({
      testId,
      startTime,
      endTime,
      deploymentSha,
      environment,
      dependency: 'KV Media Bootstrap',
      operation: 'bootstrap_media_to_kv',
      expectedInvariant: 'Media records migrated from static to KV authority',
      observedResult: verificationRate >= 0.8 ? 'PROVEN' : 'FAILED',
      evidence: {
        totalMediaCount: manifest.media.length,
        bootstrapped,
        skipped,
        failed,
        verificationRate,
        verified,
        failedVerification,
        verificationErrors: failedVerification > 0 ? verificationErrors : undefined,
      },
      cleanupStatus: 'not_required',
      verdict: verificationRate >= 0.95 ? 'PROVEN' : 'FAILED',
    });
    
  } catch (error) {
    console.error('[KV_MEDIA_BOOTSTRAP_EVIDENCE] ERROR', {
      testId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      dependency: 'KV Media Bootstrap',
      operation: 'bootstrap',
      expectedInvariant: 'Bootstrap completes without error',
      observedResult: 'ERROR',
      evidence: { error: error instanceof Error ? error.message : 'Unknown error' },
      cleanupStatus: 'not_required',
      verdict: 'FAILED',
    }, { status: 500 });
  }
}
