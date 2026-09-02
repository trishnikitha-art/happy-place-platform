/**
 * Static Media Reconciliation
 *
 * Idempotent reconciliation of canonical static media records into MEDIA_KV
 * No Blob materialization for static assets
 * Inspection-based repair instead of blind skip
 *
 * CLASSIFICATION: SYNTHETIC-WRITE
 * - Reconciles media.v1.json canonical records into MEDIA_KV
 * - Static assets (served from /public/images/) are written without Blob materialization
 * - Idempotent: inspects existing records and repairs incomplete ones
 * - Blob records are preserved without repair to avoid data loss
 * - Must be run with explicit admin authorization
 *
 * POST /api/admin/diagnostic/reconcile-static-media
 *
 * Performs:
 * - Load media.v1.json (canonical authority)
 * - For each record: classify existing KV state
 * - Missing records: write with storage: 'static' for local assets
 * - Incomplete records: repair through authoritative saveMedia()
 * - Valid records: preserve without modification
 * - Blob records: preserve without repair (safety check)
 * - Return reconciliation report with classification breakdown
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { loadMediaManifest } from "@/lib/media";
import { saveMedia, getMediaRecordRaw } from "@/lib/media-kv-store";

interface ReconciliationResult {
  testId: string;
  startTime: string;
  endTime: string;
  deploymentSha: string;
  environment: string;
  operation: string;
  evidence: {
    totalCanonical: number;
    classification: {
      missing: number;
      incomplete: number;
      validStatic: number;
      validBlob: number;
      corrupt: number;
      synthetic: number;
      unexpected: number;
    };
    repaired: number;
    preserved: number;
    failed: number;
    errors: Record<string, string>;
  };
  verdict: 'SUCCESS' | 'FAILED';
}

export async function POST() {
  const testId = `static-media-reconciliation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date().toISOString();
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  
  console.log('[STATIC_MEDIA_RECONCILIATION] STARTED', { testId, startTime, deploymentSha, environment });

  // SECURITY: Require Workbench authentication for reconciliation
  // This is a production data mutation operation that must be explicitly authorized
  // CRITICAL: Production never honors bypass flag, regardless of environment variable
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true' && process.env.VERCEL_ENV !== 'production';

  if (!isDevBypass) {
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({
        testId,
        startTime,
        endTime: new Date().toISOString(),
        deploymentSha,
        environment,
        operation: 'authentication',
        evidence: { error: 'Unauthorized: Workbench authentication required for reconciliation' },
        verdict: 'FAILED',
      }, { status: 401 });
    }
  } else {
    console.warn('[STATIC_MEDIA_RECONCILIATION] DEV_MODE_BYPASS_ACTIVE', {
      reason: 'DRIVE_AUTH_BYPASS=true - Workbench authentication bypassed for local development',
      environment: process.env.VERCEL_ENV,
    });
  }

  try {
    // Load canonical authority
    const manifest = loadMediaManifest();
    if (!manifest || !manifest.media || manifest.media.length === 0) {
      return NextResponse.json({
        testId,
        startTime,
        endTime: new Date().toISOString(),
        deploymentSha,
        environment,
        operation: 'load_authority',
        evidence: { error: 'No media records in canonical authority' },
        verdict: 'FAILED',
      });
    }
    
    console.log('[STATIC_MEDIA_RECONCILIATION] CANONICAL_LOADED', { 
      testId, 
      totalCanonical: manifest.media.length 
    });
    
    let repaired = 0;
    let preserved = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    
    const classification = {
      missing: 0,
      incomplete: 0,
      validStatic: 0,
      validBlob: 0,
      corrupt: 0,
      synthetic: 0,
      unexpected: 0,
    };
    
    for (const media of manifest.media) {
      try {
        // Check existing KV record
        const existing = await getMediaRecordRaw(media.id);
        
        // Classify existing record
        if (!existing) {
          // MISSING: Record doesn't exist in KV
          classification.missing++;
          
          // Add storage field for static assets
          const reconciledMedia = {
            ...media,
            storage: (media.source === 'local' ? 'static' : undefined) as 'static' | 'blob' | undefined,
          };
          
          // Write to KV
          await saveMedia(reconciledMedia);
          repaired++;
          console.log('[STATIC_MEDIA_RECONCILIATION] REPAIRED_MISSING', { 
            testId, 
            mediaId: media.id,
            storage: reconciledMedia.storage
          });
          
        } else {
          // EXISTING: Inspect for completeness
          const canonicalHash = media.contentHash;
          const kvHash = existing.contentHash;
          const canonicalStorage = (media.source === 'local' ? 'static' : undefined) as 'static' | 'blob' | undefined;
          const kvStorage = existing.storage;
          
          // Check for critical fields
          const isComplete = 
            existing.lifecycleState === 'published' &&
            existing.source === media.source &&
            existing.storage === (canonicalStorage as 'static' | 'blob' | undefined) &&
            existing.contentHash === canonicalHash &&
            existing.variants && Object.keys(existing.variants).length > 0;
          
          if (!isComplete) {
            // INCOMPLETE: Record exists but is missing critical fields
            classification.incomplete++;
            
            // Repair through authoritative saveMedia()
            // Do NOT blindly overwrite Blob-backed records
            if (existing.storage === 'blob') {
              // Blob records require careful handling - preserve, don't repair
              classification.validBlob++;
              preserved++;
              console.log('[STATIC_MEDIA_RECONCILIATION] PRESERVED_BLOB', { 
                testId, 
                mediaId: media.id,
                reason: 'Blob record - preserve without repair'
              });
            } else {
              // Static records can be repaired
              const reconciledMedia = {
                ...media,
                storage: canonicalStorage as 'static' | 'blob' | undefined,
              };
              
              await saveMedia(reconciledMedia);
              repaired++;
              console.log('[STATIC_MEDIA_RECONCILIATION] REPAIRED_INCOMPLETE', { 
                testId, 
                mediaId: media.id,
                reason: 'Missing critical fields',
                before: { storage: kvStorage, hash: kvHash },
                after: { storage: canonicalStorage, hash: canonicalHash }
              });
            }
            
          } else {
            // VALID: Record is materially equivalent to canonical
            if (existing.storage === 'static') {
              classification.validStatic++;
            } else if (existing.storage === 'blob') {
              classification.validBlob++;
            } else {
              classification.unexpected++;
            }
            
            preserved++;
            console.log('[STATIC_MEDIA_RECONCILIATION] PRESERVED_VALID', { 
              testId, 
              mediaId: media.id,
              storage: existing.storage
            });
          }
        }
        
      } catch (error) {
        failed++;
        errors[media.id] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[STATIC_MEDIA_RECONCILIATION] FAILED', {
          testId,
          mediaId: media.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    const endTime = new Date().toISOString();
    
    return NextResponse.json({
      testId,
      startTime,
      endTime,
      deploymentSha,
      environment,
      operation: 'reconcile_static_media',
      evidence: {
        totalCanonical: manifest.media.length,
        classification,
        repaired,
        preserved,
        failed,
        errors: failed > 0 ? errors : undefined,
      },
      verdict: failed === 0 ? 'SUCCESS' : 'FAILED',
    });
    
  } catch (error) {
    console.error('[STATIC_MEDIA_RECONCILIATION] ERROR', {
      testId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      operation: 'reconcile',
      evidence: { error: error instanceof Error ? error.message : 'Unknown error' },
      verdict: 'FAILED',
    }, { status: 500 });
  }
}
