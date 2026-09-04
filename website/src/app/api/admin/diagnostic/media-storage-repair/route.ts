/**
 * Media Storage Field Diagnostic and Repair
 *
 * Identifies and repairs media records missing or invalid storage field.
 *
 * Storage field validation:
 * - 'static': local assets served from /public/images/, no Blob metadata required
 * - 'blob': Drive-materialized assets, requires Blob metadata
 *
 * Repair logic:
 * - If media has contentHash and Blob metadata exists → storage: 'blob'
 * - If media has contentHash but no Blob metadata → storage: 'static'
 * - If media has no contentHash → storage: 'static'
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
        
        // Determine correct storage value
        let correctStorage: 'static' | 'blob' | null = null;
        
        if (media.contentHash) {
          // Has content hash - check if Blob metadata exists
          try {
            const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
            if (blobMetadata) {
              correctStorage = 'blob';
            } else {
              // No Blob metadata, assume static
              correctStorage = 'static';
            }
          } catch (error) {
            console.error('[MEDIA_STORAGE_REPAIR] Blob metadata check failed:', { mediaId, error });
            // Default to static if Blob check fails
            correctStorage = 'static';
          }
        } else {
          // No content hash - should be static
          correctStorage = 'static';
        }
        
        if (correctStorage) {
          console.log('[MEDIA_STORAGE_REPAIR] Repairing media:', {
            mediaId,
            currentStorage: media.storage || 'missing',
            correctStorage,
          });

          // Persist the repair
          const repairedMedia = {
            ...media,
            storage: correctStorage,
          };
          await saveMedia(repairedMedia);

          repaired.push(mediaId);
        } else {
          repairErrors.push({
            id: mediaId,
            error: 'Could not determine correct storage value'
          });
        }
      }
    }
    
    return NextResponse.json({
      totalRecords: mediaIds.length,
      missingStorage: {
        count: missingStorage.length,
        ids: missingStorage.slice(0, 10), // First 10 for brevity
      },
      invalidStorage: {
        count: invalidStorage.length,
        ids: invalidStorage.slice(0, 10),
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
