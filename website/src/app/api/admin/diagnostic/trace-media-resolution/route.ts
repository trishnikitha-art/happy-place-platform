/**
 * Focused Media Resolution Trace Diagnostic
 * 
 * Traces the exact chain for a specific media ID to identify the first broken link.
 * This is a first-principles diagnostic that does not assume anything about KV, namespace, or authority.
 * 
 * GET /api/admin/diagnostic/trace-media-resolution?mediaId=pergolas-001-hero
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // CRITICAL: Verify Workbench authentication before exposing diagnostic data
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { 
        error: 'WORKBENCH_AUTH_REQUIRED',
        message: 'Workbench authentication required for diagnostic access',
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get('mediaId');

  if (!mediaId) {
    return NextResponse.json(
      { error: 'MISSING_MEDIA_ID', message: 'mediaId parameter is required' },
      { status: 400 }
    );
  }

  interface TraceStep {
    step: string;
    status: string;
    data?: unknown;
  }

  const trace: {
    mediaId: string;
    timestamp: string;
    steps: TraceStep[];
  } = {
    mediaId,
    timestamp: new Date().toISOString(),
    steps: [],
  };

  try {
    // STEP 1: Check static media.v1.json authority
    trace.steps.push({ step: '1', status: 'CHECKING_STATIC_AUTHORITY' });
    try {
      const { loadMediaManifest } = await import('@/lib/media');
      const manifest = loadMediaManifest();
      const staticMedia = manifest.media.find(m => m.id === mediaId);
      
      if (staticMedia) {
        trace.steps.push({ 
          step: '1', 
          status: 'STATIC_MEDIA_FOUND',
          data: {
            id: staticMedia.id,
            hasLifecycleState: typeof (staticMedia as any).lifecycleState !== 'undefined',
            lifecycleState: (staticMedia as any).lifecycleState,
            source: (staticMedia as any).source,
            hasContentHash: typeof (staticMedia as any).contentHash !== 'undefined',
            contentHash: (staticMedia as any).contentHash,
            hasDriveId: typeof (staticMedia as any).driveId !== 'undefined',
            driveId: (staticMedia as any).driveId,
            variants: staticMedia.variants,
          }
        });
      } else {
        trace.steps.push({ step: '1', status: 'STATIC_MEDIA_NOT_FOUND' });
      }
    } catch (error) {
      trace.steps.push({ 
        step: '1', 
        status: 'STATIC_AUTHORITY_ERROR',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }

    // STEP 2: Check KV media authority
    trace.steps.push({ step: '2', status: 'CHECKING_KV_AUTHORITY' });
    try {
      const { getMediaByIdAsync } = await import('@/lib/media');
      const kvMedia = await getMediaByIdAsync(mediaId);
      
      if (kvMedia) {
        trace.steps.push({ 
          step: '2', 
          status: 'KV_MEDIA_FOUND',
          data: {
            id: kvMedia.id,
            lifecycleState: kvMedia.lifecycleState,
            source: kvMedia.source,
            hasContentHash: typeof kvMedia.contentHash !== 'undefined',
            contentHash: kvMedia.contentHash,
            hasDrive: typeof (kvMedia as any).drive !== 'undefined',
            hasBlobMetadata: typeof (kvMedia as any).blobMetadata !== 'undefined',
            variants: kvMedia.variants,
          }
        });
      } else {
        trace.steps.push({ step: '2', status: 'KV_MEDIA_NOT_FOUND' });
      }
    } catch (error) {
      trace.steps.push({ 
        step: '2', 
        status: 'KV_AUTHORITY_ERROR',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }

    // STEP 3: Test public media gate
    trace.steps.push({ step: '3', status: 'TESTING_PUBLIC_MEDIA_GATE' });
    try {
      const { resolvePublicMedia } = await import('@/lib/media');
      const resolvedMedia = await resolvePublicMedia(mediaId);
      
      if (resolvedMedia) {
        trace.steps.push({ 
          step: '3', 
          status: 'PUBLIC_MEDIA_GATE_PASSED',
          data: {
            id: resolvedMedia.id,
            source: resolvedMedia.source,
            lifecycleState: resolvedMedia.lifecycleState,
            variants: resolvedMedia.variants,
          }
        });
      } else {
        trace.steps.push({ step: '3', status: 'PUBLIC_MEDIA_GATE_REJECTED' });
      }
    } catch (error) {
      trace.steps.push({ 
        step: '3', 
        status: 'PUBLIC_MEDIA_GATE_ERROR',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }

    // STEP 4: Check physical file existence
    trace.steps.push({ step: '4', status: 'CHECKING_PHYSICAL_FILE' });
    try {
      const { getMediaByIdAsync } = await import('@/lib/media');
      const kvMedia = await getMediaByIdAsync(mediaId);
      
      if (kvMedia && kvMedia.variants?.web) {
        const filePath = kvMedia.variants.web.startsWith('/') 
          ? kvMedia.variants.web.substring(1) 
          : kvMedia.variants.web;
        
        // Try to check if file exists by reading it
        const fs = await import('fs');
        const path = await import('path');
        
        try {
          const fullPath = path.join(process.cwd(), 'public', filePath);
          const exists = fs.existsSync(fullPath);
          
          trace.steps.push({ 
            step: '4', 
            status: exists ? 'PHYSICAL_FILE_EXISTS' : 'PHYSICAL_FILE_NOT_FOUND',
            data: { filePath, fullPath, exists }
          });
        } catch (error) {
          trace.steps.push({ 
            step: '4', 
            status: 'PHYSICAL_FILE_CHECK_ERROR',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      } else {
        trace.steps.push({ 
          step: '4', 
          status: 'NO_VARIANT_PATH_TO_CHECK',
          data: { hasKvMedia: !!kvMedia, hasVariants: !!kvMedia?.variants, hasWeb: !!kvMedia?.variants?.web }
        });
      }
    } catch (error) {
      trace.steps.push({ 
        step: '4', 
        status: 'PHYSICAL_FILE_CHECK_ERROR',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }

    // STEP 5: Check Blob metadata if contentHash exists
    trace.steps.push({ step: '5', status: 'CHECKING_BLOB_METADATA' });
    try {
      const { getMediaByIdAsync } = await import('@/lib/media');
      const kvMedia = await getMediaByIdAsync(mediaId);
      
      if (kvMedia && kvMedia.contentHash) {
        const { getBlobMetadataByContentHash } = await import('@/lib/blob-storage');
        const blobMetadata = await getBlobMetadataByContentHash(kvMedia.contentHash);
        
        if (blobMetadata) {
          trace.steps.push({ 
            step: '5', 
            status: 'BLOB_METADATA_FOUND',
            data: {
              hasUrl: typeof blobMetadata.url !== 'undefined',
              hasUploadedAt: typeof blobMetadata.uploadedAt !== 'undefined',
              hasContentType: typeof blobMetadata.contentType !== 'undefined',
            }
          });
        } else {
          trace.steps.push({ 
            step: '5', 
            status: 'BLOB_METADATA_NOT_FOUND',
            data: { contentHash: kvMedia.contentHash }
          });
        }
      } else {
        trace.steps.push({ 
          step: '5', 
          status: 'NO_CONTENT_HASH_TO_CHECK',
          data: { hasKvMedia: !!kvMedia, hasContentHash: !!kvMedia?.contentHash }
        });
      }
    } catch (error) {
      trace.steps.push({ 
        step: '5', 
        status: 'BLOB_METADATA_CHECK_ERROR',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }

    return NextResponse.json(trace);
  } catch (error) {
    trace.steps.push({ 
      step: 'FATAL', 
      status: 'DIAGNOSTIC_FATAL_ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(trace, { status: 500 });
  }
}
