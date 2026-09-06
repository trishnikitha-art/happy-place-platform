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
import { listMediaIds, getMediaRecordRaw } from '@/lib/media-kv-store';
import { getBlobMetadataByContentHash, verifyBlobHash } from '@/lib/blob-storage';

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
      // P0 FIX: Use getMediaRecordRaw to bypass public-media gate
      // Records with missing storage are rejected by the public gate
      // Forensic diagnostic must inspect raw records for classification
      const media = await getMediaRecordRaw(mediaId);
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
          // Has contentHash - check Blob metadata with same evidence chain as repairer
          try {
            const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
            if (blobMetadata) {
              // Blob metadata exists → verify URL match and physical hash
              const originalUrl = media.variants?.original || '';
              
              if (originalUrl === blobMetadata.url) {
                // URL matches → verify physical hash
                const verification = await verifyBlobHash(blobMetadata.url, media.contentHash);
                
                if (verification.success) {
                  // DEFINITELY_BLOB: All evidence chain verified
                  definitelyBlob.push(mediaId);
                } else {
                  // Physical hash verification failed → AMBIGUOUS
                  ambiguous.push(mediaId);
                }
              } else {
                // URL mismatch → AMBIGUOUS
                ambiguous.push(mediaId);
              }
            } else {
              // AMBIGUOUS: Has contentHash but no Blob metadata
              ambiguous.push(mediaId);
            }
          } catch (error) {
            console.error('[STORAGE_CLASSIFICATION] Blob verification failed:', { mediaId, error });
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
        ids: missingStorage, // P0 FIX: Return complete ID list for surgical repair
      },
      invalidStorage: {
        count: invalidStorage.length,
        ids: invalidStorage, // P0 FIX: Return complete ID list
      },
      classification: {
        definitelyStatic: {
          count: definitelyStatic.length,
          ids: definitelyStatic, // P0 FIX: Return complete ID list
          description: 'No contentHash - should be storage: static',
        },
        definitelyBlob: {
          count: definitelyBlob.length,
          ids: definitelyBlob, // P0 FIX: Return complete ID list
          description: 'Has contentHash + Blob metadata + URL match + physical hash verification - should be storage: blob',
        },
        staticMarkedBlob: {
          count: staticMarkedBlob.length,
          ids: staticMarkedBlob, // P0 FIX: Return complete ID list
          description: 'Contract violation: static URL but marked as blob',
        },
        blobMarkedStatic: {
          count: blobMarkedStatic.length,
          ids: blobMarkedStatic, // P0 FIX: Return complete ID list
          description: 'Contract violation: Blob URL but marked as static',
        },
        ambiguous: {
          count: ambiguous.length,
          ids: ambiguous, // P0 FIX: Return complete ID list
          description: 'Has contentHash but insufficient Blob evidence - requires manual review',
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
