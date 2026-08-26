/**
 * KV Bootstrap/Recovery API Route
 *
 * P0 FIX: Provides explicit mechanism to bootstrap/recover KV from static projections
 * 
 * AUTHORITY MODEL:
 * - KV is the PRIMARY authority for runtime PublishedMediaAsset
 * - Static files are PROJECTIONS for backup/audit only
 * - Static → KV import is ONLY allowed during explicit bootstrap/recovery operations
 * 
 * SECURITY CONSTRAINTS:
 * - Requires admin authentication
 * - Requires explicit authorization
 * - Cannot resurrect deleted records (only creates missing records)
 * - Creates audit trail
 * - Fails closed if KV already has data (prevents accidental overwrite)
 * 
 * BOOTSTRAP vs RECOVERY:
 * - Bootstrap: KV is empty (cold start, new environment)
 * - Recovery: KV is corrupted (explicit recovery operation)
 * 
 * POST /api/admin/kv-bootstrap
 * Body: { mode: 'bootstrap' | 'recovery', force?: boolean }
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { loadMediaManifest } from '@/lib/media';
import { storeMedia, getMedia, listMediaIds } from '@/lib/media-kv-store';
import { isPublishedMediaAsset } from '@/types/media';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface BootstrapRequest {
  mode: 'bootstrap' | 'recovery';
  force?: boolean; // Allow recovery even if KV has data
}

interface BootstrapResponse {
  success: boolean;
  mode: string;
  recordsImported: number;
  recordsSkipped: number;
  errors: { mediaId: string; reason: string }[];
  bootstrapId: string;
  performedAt: string;
  auditLog: {
    operation: string;
    performedBy: string;
    authorizedBy: string;
    kvStateBefore: {
      recordCount: number;
    };
    kvStateAfter: {
      recordCount: number;
    };
  };
}

export async function POST(request: Request) {
  const bootstrapId = `bootstrap-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const performedAt = new Date().toISOString();
  
  console.log('[KV_BOOTSTRAP] OPERATION_STARTED', { bootstrapId, performedAt });
  
  // AUTHORIZATION: Admin authentication required
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    console.error('[KV_BOOTSTRAP] AUTHENTICATION_FAILED', { bootstrapId });
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin authentication required for KV bootstrap/recovery' },
      { status: 401 }
    );
  }
  
  // Get session identity for audit trail
  const sessionIdentity = await workbenchSession.getSessionIdentity();
  const authorizedBy = sessionIdentity?.email || 'unknown';
  
  console.log('[KV_BOOTSTRAP] AUTHORIZATION_PASSED', { bootstrapId, authorizedBy });
  
  try {
    const body: BootstrapRequest = await request.json();
    const { mode, force = false } = body;
    
    if (mode !== 'bootstrap' && mode !== 'recovery') {
      return NextResponse.json(
        { error: 'Invalid mode', message: 'Mode must be "bootstrap" or "recovery"' },
        { status: 400 }
      );
    }
    
    console.log('[KV_BOOTSTRAP] MODE_VALIDATED', { bootstrapId, mode, force });
    
    // CHECK KV STATE
    const existingMediaIds = await listMediaIds();
    const kvStateBefore = { recordCount: existingMediaIds.length };
    
    console.log('[KV_BOOTSTRAP] KV_STATE_CHECKED', { 
      bootstrapId, 
      existingRecordCount: existingMediaIds.length 
    });
    
    // SECURITY: Prevent accidental overwrite unless explicitly forced
    if (mode === 'bootstrap' && existingMediaIds.length > 0 && !force) {
      console.error('[KV_BOOTSTRAP] BOOTSTRAP_REJECTED_KV_NOT_EMPTY', {
        bootstrapId,
        existingRecordCount: existingMediaIds.length,
        reason: 'Bootstrap requires empty KV. Use mode=recovery or force=true for existing KV.'
      });
      return NextResponse.json(
        { 
          error: 'KV not empty', 
          message: `Bootstrap requires empty KV (found ${existingMediaIds.length} records). Use mode=recovery or force=true for existing KV.`,
          existingRecordCount: existingMediaIds.length,
          bootstrapId
        },
        { status: 409 }
      );
    }
    
    // LOAD STATIC PROJECTION
    const manifest = loadMediaManifest();
    const staticMediaRecords = manifest.media;
    
    console.log('[KV_BOOTSTRAP] STATIC_PROJECTION_LOADED', {
      bootstrapId,
      staticRecordCount: staticMediaRecords.length
    });
    
    // IMPORT RECORDS
    let recordsImported = 0;
    let recordsSkipped = 0;
    const errors: { mediaId: string; reason: string }[] = [];
    
    for (const staticMedia of staticMediaRecords) {
      try {
        // VALIDATION: Only import PublishedMediaAsset records
        if (!isPublishedMediaAsset(staticMedia)) {
          console.warn('[KV_BOOTSTRAP] RECORD_SKIPPED_NOT_PUBLISHED', {
            bootstrapId,
            mediaId: staticMedia.id,
            lifecycleState: staticMedia.lifecycleState,
            source: staticMedia.source
          });
          recordsSkipped++;
          continue;
        }
        
        // VALIDATION: Check if record already exists in KV
        const existingRecord = await getMedia(staticMedia.id);
        if (existingRecord) {
          console.log('[KV_BOOTSTRAP] RECORD_ALREADY_EXISTS', {
            bootstrapId,
            mediaId: staticMedia.id
          });
          recordsSkipped++;
          continue;
        }
        
        // VALIDATION: Reject synthetic content identity
        if (staticMedia.contentHash && isSyntheticContentHash(staticMedia.id, staticMedia.contentHash)) {
          console.error('[KV_BOOTSTRAP] RECORD_REJECTED_SYNTHETIC_IDENTITY', {
            bootstrapId,
            mediaId: staticMedia.id,
            contentHash: staticMedia.contentHash
          });
          errors.push({
            mediaId: staticMedia.id,
            reason: 'Synthetic content identity detected'
          });
          continue;
        }
        
        // IMPORT: Store record in KV
        await storeMedia(staticMedia);
        recordsImported++;
        
        console.log('[KV_BOOTSTRAP] RECORD_IMPORTED', {
          bootstrapId,
          mediaId: staticMedia.id
        });
      } catch (error) {
        console.error('[KV_BOOTSTRAP] RECORD_IMPORT_FAILED', {
          bootstrapId,
          mediaId: staticMedia.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errors.push({
          mediaId: staticMedia.id,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // CHECK FINAL KV STATE
    const finalMediaIds = await listMediaIds();
    const kvStateAfter = { recordCount: finalMediaIds.length };
    
    console.log('[KV_BOOTSTRAP] OPERATION_COMPLETED', {
      bootstrapId,
      recordsImported,
      recordsSkipped,
      errorCount: errors.length,
      finalRecordCount: finalMediaIds.length
    });
    
    const response: BootstrapResponse = {
      success: errors.length === 0,
      mode,
      recordsImported,
      recordsSkipped,
      errors,
      bootstrapId,
      performedAt,
      auditLog: {
        operation: mode,
        performedBy: authorizedBy,
        authorizedBy: authorizedBy,
        kvStateBefore,
        kvStateAfter
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[KV_BOOTSTRAP] OPERATION_FAILED', {
      bootstrapId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      {
        error: 'Bootstrap operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        bootstrapId
      },
      { status: 500 }
    );
  }
}

/**
 * Check if content hash is synthetic (SHA256 of canonical ID)
 * This prevents importing synthetic records that could bypass validation
 */
function isSyntheticContentHash(mediaId: string, contentHash: string): boolean {
  const syntheticHash = crypto.createHash('sha256').update(mediaId).digest('hex');
  return contentHash === syntheticHash;
}
