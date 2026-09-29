/**
 * Storage Contract Classification Diagnostic
 *
 * Classifies media records with missing or invalid storage field.
 * Determines whether each record should be:
 * - DEFINITELY_STATIC: No contentHash, served from /images/
 * - DEFINITELY_R2: Has contentHash, R2 object exists, R2 URL
 * - STATIC_MARKED_R2: Has static URL but marked as r2 (contract violation)
 * - R2_MARKED_STATIC: Has R2 URL but marked as static (contract violation)
 * - AMBIGUOUS: Has contentHash but no R2 object (requires manual review)
 *
 * POST /api/admin/diagnostic/classify-storage-contract
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw } from '@/lib/media-kv-store';
import { verifyR2ObjectExists } from '@/lib/r2-storage';

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
    const definitelyR2: string[] = [];
    const staticMarkedR2: string[] = [];
    const r2MarkedStatic: string[] = [];
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
      if (!media.storage || (media.storage !== 'static' && media.storage !== 'r2')) {
        if (!media.storage) {
          missingStorage.push(mediaId);
        } else {
          invalidStorage.push(mediaId);
        }

        // Classify based on contentHash and URL pattern
        if (!media.contentHash) {
          // DEFINITELY_STATIC: No contentHash means cannot be r2-backed
          definitelyStatic.push(mediaId);
        } else {
          // Has contentHash - check R2 object existence
          try {
            const originalUrl = media.variants?.original || '';
            const r2Key = originalUrl.split('/').pop() || '';
            const objectExists = await verifyR2ObjectExists(r2Key);
            
            if (objectExists) {
              // R2 object exists → DEFINITELY_R2
              definitelyR2.push(mediaId);
            } else {
              // R2 object does not exist → AMBIGUOUS
              ambiguous.push(mediaId);
            }
          } catch (error) {
            console.error('[STORAGE_CLASSIFICATION] R2 verification failed:', { mediaId, error });
            ambiguous.push(mediaId);
          }
        }
      } else {
        // Storage field exists - check for contract violations
        const originalUrl = media.variants?.original || '';
        
        if (media.storage === 'r2') {
          // Check if URL is actually static (contract violation)
          if (originalUrl.startsWith('/images/') || originalUrl.startsWith('/public/')) {
            staticMarkedR2.push(mediaId);
          }
        } else if (media.storage === 'static') {
          // Check if URL is actually R2 (contract violation)
          if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
            r2MarkedStatic.push(mediaId);
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
        definitelyR2: {
          count: definitelyR2.length,
          ids: definitelyR2, // P0 FIX: Return complete ID list
          description: 'Has contentHash + R2 object exists - should be storage: r2',
        },
        staticMarkedR2: {
          count: staticMarkedR2.length,
          ids: staticMarkedR2, // P0 FIX: Return complete ID list
          description: 'Contract violation: static URL but marked as r2',
        },
        r2MarkedStatic: {
          count: r2MarkedStatic.length,
          ids: r2MarkedStatic, // P0 FIX: Return complete ID list
          description: 'Contract violation: R2 URL but marked as static',
        },
        ambiguous: {
          count: ambiguous.length,
          ids: ambiguous, // P0 FIX: Return complete ID list
          description: 'Has contentHash but insufficient R2 evidence - requires manual review',
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
