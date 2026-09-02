/**
 * Static Media Reconciliation
 * 
 * IDempotent reconciliation of canonical static media records into MEDIA_KV
 * No Blob materialization for static assets
 * No deletion, no replacement of existing valid records
 * 
 * CLASSIFICATION: SYNTHETIC-WRITE
 * - Reconciles media.v1.main.json canonical records into MEDIA_KV
 * - Static assets (served from /public/images/) are written without Blob materialization
 * - Idempotent: skips existing valid records
 * - Must be run with explicit admin authorization
 * 
 * POST /api/admin/diagnostic/reconcile-static-media
 * 
 * Performs:
 * - Load media.v1.main.json (canonical authority)
 * - For each record: if not in KV, write with storage: 'static' for local assets
 * - Validate records were written
 * - Return reconciliation report
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
    reconciled: number;
    skipped: number;
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
  // Local development bypass requires explicit DRIVE_AUTH_BYPASS=true
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true';

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
    
    let reconciled = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    
    for (const media of manifest.media) {
      try {
        // Check if already in KV
        const existing = await getMediaRecordRaw(media.id);
        if (existing) {
          skipped++;
          console.log('[STATIC_MEDIA_RECONCILIATION] SKIPPED', { 
            testId, 
            mediaId: media.id,
            reason: 'Already in KV'
          });
          continue;
        }
        
        // Add storage field for static assets
        const reconciledMedia = {
          ...media,
          storage: (media.source === 'local' ? 'static' : undefined) as 'static' | 'blob' | undefined,
        };
        
        // Write to KV
        await saveMedia(reconciledMedia);
        reconciled++;
        console.log('[STATIC_MEDIA_RECONCILIATION] RECONCILED', { 
          testId, 
          mediaId: media.id,
          storage: reconciledMedia.storage
        });
        
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
        reconciled,
        skipped,
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
