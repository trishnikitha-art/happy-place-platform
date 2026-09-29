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
 * P0 FIX: Bootstrap now triggers rematerialization for local source files
 * Static media.v1.json has local /images/ paths but no Blob objects
 * Bootstrap now rematerializes from source bytes → Blob → KV authority
 * This ensures constitutional proof chain is established before KV population
 * 
 * TEST ID: kv-media-bootstrap
 * 
 * POST /api/admin/diagnostic/bootstrap-kv-media
 * 
 * Performs:
 * - Load media.v1.json (CONFIGURED)
 * - For each record: if not in KV, rematerialize from source (public/images) → Blob → KV (EXECUTED)
 * - Verify records were written with proper Blob authority (POSTCONDITION_VERIFIED)
 * - Return evidence of bootstrap operation (PROVEN)
 * 
 * This is a one-time migration operation to populate KV with existing media records.
 * After bootstrap, KV becomes the sole authority for all media.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { loadMediaManifest } from "@/lib/media";
import { saveMedia, getMediaRecordRaw } from "@/lib/media-kv-store";
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2-storage';

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

  // SECURITY: Require authentication in production
  // Development bypass requires explicit DRIVE_AUTH_BYPASS=true
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true';

  if (process.env.NODE_ENV !== 'development' || !isDevBypass) {
    // Check Workbench authentication
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
  } else {
    console.warn('[KV_MEDIA_BOOTSTRAP] DEV_MODE_BYPASS_ACTIVE', {
      reason: 'DRIVE_AUTH_BYPASS=true',
      securityNote: 'This bypass is for development only'
    });
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
    const { saveMedia, getMediaRecordRaw } = await import('@/lib/media-kv-store');
    
    let bootstrapped = 0;
    let skipped = 0;
    let rematerialized = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    
    for (const media of manifest.media) {
      try {
        // Check if already in KV using raw authority accessor
        // getMediaRecordRaw() allows inspection of records that public proof rejects
        const existing = await getMediaRecordRaw(media.id);
        if (existing) {
          skipped++;
          console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] SKIPPED', { 
            testId, 
            mediaId: media.id,
            reason: 'Already in KV'
          });
          continue;
        }
        
        // Rematerialize from source bytes
        // Static media.v1.json has local /images/ paths but no Blob objects
        // We need to establish the constitutional proof chain: source → Blob → KV
        console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] REMATERIALIZING_FROM_SOURCE', { 
          testId, 
          mediaId: media.id,
          filename: media.filename,
          staticVariant: media.variants?.original
        });
        
        // CRITICAL: Distinguish between local filesystem paths and R2 URLs
        // Local paths: /images/projects/fences/FENCE BUILD-1080.webp
        // R2 URLs: https://...r2.cloudflarestorage.com/...
        const originalUrl = media.variants?.original || '';
        
        if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
          // This is an R2 URL - cannot be read as filesystem path
          // Skip bootstrap for R2-backed media - they should already have metadata
          console.warn('[KV_MEDIA_BOOTSTRAP_EVIDENCE] R2_URL_NOT_FILESYSTEM', {
            testId,
            mediaId: media.id,
            originalUrl,
            reason: 'R2 URL cannot be read as filesystem path - skipping bootstrap'
          });
          continue;
        }
        
        // SAFETY: Normalize local paths to prevent Blob URL injection
        // Ensure originalUrl starts with '/' to be treated as absolute path from public/
        const normalizedPath = originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`;
        
        // Check if source file exists in public/images (local filesystem only)
        const sourcePath = join(process.cwd(), 'public', normalizedPath);
        if (!existsSync(sourcePath)) {
          failed++;
          errors[media.id] = `Source file not found: ${sourcePath}`;
          console.error('[KV_MEDIA_BOOTSTRAP_EVIDENCE] SOURCE_FILE_NOT_FOUND', {
            testId,
            mediaId: media.id,
            sourcePath,
            originalUrl,
          });
          continue;
        }
        
        // Read source bytes
        const sourceBytes = readFileSync(sourcePath);
        const contentHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
        
        console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] SOURCE_BYTES_READ', {
          testId,
          mediaId: media.id,
          contentHash,
          sourcePath,
          byteSize: sourceBytes.length,
        });
        
        // Upload to R2
        const { uploadToR2 } = await import('@/lib/r2-storage');
        const originalExt = media.filename.split('.').pop() || 'webp';
        const r2Upload = await uploadToR2(sourceBytes, `${media.id}-original.${originalExt}`, `image/${originalExt}`);
        
        console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] R2_UPLOAD_COMPLETE', {
          testId,
          mediaId: media.id,
          r2Url: r2Upload.url,
          uploadedAt: r2Upload.uploadedAt,
        });
        
        // Generate thumbnail
        const image = sharp(sourceBytes);
        const thumbBuffer = await image.resize(480).webp({ quality: 70 }).toBuffer();
        const thumbUpload = await uploadToR2(thumbBuffer, `${media.id}-thumb.webp`, 'image/webp');
        
        // Update media record with R2 URLs
        // P0 FIX: Set storage to r2 for rematerialized records (replacing static with r2)
        // or preserve existing storage if it was already r2
        const updatedMedia = {
          ...media,
          contentHash,
          storage: 'r2' as const, // Rematerialized from source → R2 storage
          variants: {
            ...media.variants,
            original: r2Upload.url,
            web: r2Upload.url,
            webp: r2Upload.url,
            thumbnail: thumbUpload.url,
          },
        };
        
        // Write to KV
        await saveMedia(updatedMedia);
        bootstrapped++;
        rematerialized++;
        console.log('[KV_MEDIA_BOOTSTRAP_EVIDENCE] BOOTSTRAPPED_WITH_R2_AUTHORITY', { 
          testId, 
          mediaId: media.id,
          r2Url: r2Upload.url,
          thumbUrl: thumbUpload.url
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
        const inKV = await getMediaRecordRaw(media.id);
        if (inKV) {
          // Verify R2 authority for published local media
          if (inKV.lifecycleState === 'published' && inKV.source === 'local' && inKV.contentHash) {
            const { verifyR2ObjectExists } = await import('@/lib/r2-storage');
            
            if (inKV.variants?.original) {
              const r2Key = inKV.variants.original.split('/').pop() || '';
              const objectExists = await verifyR2ObjectExists(r2Key);
              
              if (!objectExists) {
                failedVerification++;
                verificationErrors[media.id] = 'R2 object not found';
                console.error('[KV_MEDIA_BOOTSTRAP_EVIDENCE] VERIFICATION_FAILED', {
                  testId,
                  mediaId: media.id,
                  reason: 'R2 object not found'
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
      observedResult: verificationRate >= 0.95 ? 'PROVEN' : 'FAILED',
      evidence: {
        totalMediaCount: manifest.media.length,
        bootstrapped,
        skipped,
        rematerialized,
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
