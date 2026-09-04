/**
 * Media Storage Field Diagnostic and Repair
 *
 * Identifies and classifies media records missing or invalid storage field.
 *
 * Storage field validation:
 * - 'static': local assets served from /public/images/, no Blob metadata required
 * - 'blob': Drive-materialized assets, requires Blob metadata
 *
 * Classification logic:
 * - DEFINITELY_STATIC: No contentHash (cannot be blob-backed)
 * - DEFINITELY_BLOB: Has contentHash AND Blob metadata exists
 * - AMBIGUOUS: Has contentHash but no Blob metadata (could be failed Blob lookup or misclassified static)
 *
 * Repair logic (diagnostic-first):
 * - Report classification counts without writing
 * - Only repair DEFINITELY_STATIC records (safe: cannot be blob-backed)
 * - Only repair DEFINITELY_BLOB records (safe: Blob metadata confirms blob storage)
 * - Leave AMBIGUOUS records untouched (require manual review)
 *
 * POST /api/admin/diagnostic/media-storage-repair
 *
 * Requires Workbench authentication.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMedia, saveMedia } from '@/lib/media-kv-store';
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
    const ambiguous: string[] = [];
    const repaired: string[] = [];
    const repairErrors: Array<{ id: string; error: string }> = [];

    console.log('[MEDIA_STORAGE_REPAIR] Starting diagnostic for', mediaIds.length, 'media records');

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

        // Classify record based on contentHash and Blob metadata
        if (!media.contentHash) {
          // DEFINITELY_STATIC: No contentHash means cannot be blob-backed
          definitelyStatic.push(mediaId);
        } else {
          // Has contentHash - check if Blob metadata exists
          try {
            const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
            if (blobMetadata) {
              // DEFINITELY_BLOB: Blob metadata confirms blob storage
              definitelyBlob.push(mediaId);
            } else {
              // AMBIGUOUS: Has contentHash but no Blob metadata
              // Could be: failed Blob lookup, misclassified static, or deleted Blob
              ambiguous.push(mediaId);
            }
          } catch (error) {
            console.error('[MEDIA_STORAGE_REPAIR] Blob metadata check failed:', { mediaId, error });
            // AMBIGUOUS: Blob lookup failed, cannot determine storage
            ambiguous.push(mediaId);
          }
        }
      }
    }

    // Repair only unambiguous records
    for (const mediaId of definitelyStatic) {
      try {
        const media = await getMedia(mediaId);
        if (media) {
          const repairedMedia = {
            ...media,
            storage: 'static' as const,
          };
          await saveMedia(repairedMedia);
          repaired.push(mediaId);
          console.log('[MEDIA_STORAGE_REPAIR] REPAIRED_DEFINITELY_STATIC', { mediaId });
        }
      } catch (error) {
        repairErrors.push({
          id: mediaId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    for (const mediaId of definitelyBlob) {
      try {
        const media = await getMedia(mediaId);
        if (media) {
          const repairedMedia = {
            ...media,
            storage: 'blob' as const,
          };
          await saveMedia(repairedMedia);
          repaired.push(mediaId);
          console.log('[MEDIA_STORAGE_REPAIR] REPAIRED_DEFINITELY_BLOB', { mediaId });
        }
      } catch (error) {
        repairErrors.push({
          id: mediaId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
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
        },
        definitelyBlob: {
          count: definitelyBlob.length,
          ids: definitelyBlob.slice(0, 10),
        },
        ambiguous: {
          count: ambiguous.length,
          ids: ambiguous.slice(0, 10),
          note: 'Records with contentHash but no Blob metadata - require manual review',
        },
      },
      repaired: {
        count: repaired.length,
        ids: repaired.slice(0, 10),
      },
      repairErrors: {
        count: repairErrors.length,
        errors: repairErrors.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('[MEDIA_STORAGE_REPAIR] Diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
