/**
 * Storage Contract Classification Diagnostic
 *
 * Classifies media records with missing or invalid storage field.
 * Determines whether each record should be:
 * - DEFINITELY_STATIC: No contentHash, served from /images/
 * - DEFINITELY_BLOB: Has contentHash, Blob metadata exists, Blob URL
 * - STATIC_MARKED_BLOB: Has static URL but marked as blob (contract violation)
 * - BLOB_MARKED_STATIC: Has Blob URL but marked as static (contract violation)
 * - AMBIGUOUS: Has contentHash but no Blob metadata (requires manual review)
 *
 * POST /api/admin/diagnostic/classify-storage-contract
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMedia } from '@/lib/media-kv-store';
import { getBlobMetadataByContentHash } from '@/lib/blob-storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // REQUIRE ADMIN AUTHORIZATION
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({
      error: 'Unauthorized',
      message: 'Workbench authentication required',
    }, { status: 401 });
  }

  try {
    const mediaIds = await listMediaIds();

    const missingStorage: string[] = [];
    const invalidStorage: string[] = [];
    const definitelyStatic: string[] = [];
    const definitelyBlob: string[] = [];
    const staticMarkedBlob: string[] = [];
    const blobMarkedStatic: string[] = [];
    const ambiguous: string[] = [];

    console.log('[STORAGE_CLASSIFICATION] Starting diagnostic for', mediaIds.length, 'media records');

    for (const mediaId of mediaIds) {
      const media = await getMedia(mediaId);
      if (!media) {
        continue;
      }

      // Check if storage field is missing or invalid
      if (!media.storage || (media.storage !== 'static' && media.storage !== 'blob')) {
        if (!media.storage) {
          missingStorage.push(mediaId);
        } else {
          invalidStorage.push(mediaId);
        }

        // Classify based on contentHash and URL pattern
        if (!media.contentHash) {
          // DEFINITELY_STATIC: No contentHash means cannot be blob-backed
          definitelyStatic.push(mediaId);
        } else {
          // Has contentHash - check Blob metadata
          try {
            const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
            if (blobMetadata) {
              // DEFINITELY_BLOB: Blob metadata confirms blob storage
              definitelyBlob.push(mediaId);
            } else {
              // AMBIGUOUS: Has contentHash but no Blob metadata
              ambiguous.push(mediaId);
            }
          } catch (error) {
            console.error('[STORAGE_CLASSIFICATION] Blob metadata check failed:', { mediaId, error });
            ambiguous.push(mediaId);
          }
        }
      } else {
        // Storage field exists - check for contract violations
        const originalUrl = media.variants?.original || '';
        
        if (media.storage === 'blob') {
          // Check if URL is actually static (contract violation)
          if (originalUrl.startsWith('/images/') || originalUrl.startsWith('/public/')) {
            staticMarkedBlob.push(mediaId);
          }
        } else if (media.storage === 'static') {
          // Check if URL is actually Blob (contract violation)
          if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
            blobMarkedStatic.push(mediaId);
          }
        }
      }
    }

    return NextResponse.json({
      totalRecords: mediaIds.length,
      missingStorage: {
        count: missingStorage.length,
        ids: missingStorage.slice(0, 10),
      },
      invalidStorage: {
        count: invalidStorage.length,
        ids: invalidStorage.slice(0, 10),
      },
      classification: {
        definitelyStatic: {
          count: definitelyStatic.length,
          ids: definitelyStatic.slice(0, 10),
          description: 'No contentHash - should be storage: static',
        },
        definitelyBlob: {
          count: definitelyBlob.length,
          ids: definitelyBlob.slice(0, 10),
          description: 'Has contentHash + Blob metadata - should be storage: blob',
        },
        staticMarkedBlob: {
          count: staticMarkedBlob.length,
          ids: staticMarkedBlob.slice(0, 10),
          description: 'Contract violation: static URL but marked as blob',
        },
        blobMarkedStatic: {
          count: blobMarkedStatic.length,
          ids: blobMarkedStatic.slice(0, 10),
          description: 'Contract violation: Blob URL but marked as static',
        },
        ambiguous: {
          count: ambiguous.length,
          ids: ambiguous.slice(0, 10),
          description: 'Has contentHash but no Blob metadata - requires manual review',
        },
      },
    });
  } catch (error) {
    console.error('[STORAGE_CLASSIFICATION] Diagnostic error:', error);
    return NextResponse.json({
      error: 'Classification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
