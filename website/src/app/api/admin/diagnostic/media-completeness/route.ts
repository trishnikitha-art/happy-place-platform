/**
 * Media Completeness Diagnostic API Endpoint
 *
 * Enumerates all media records in KV and identifies which ones are incomplete
 * or missing Blob metadata. This is used to understand the current state of
 * the media authority and plan repairs.
 *
 * GET /api/admin/diagnostic/media-completeness
 *
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { Redis } from '@upstash/redis';
import { hasMaterializationShape, hasRealContentHash, isPubliclyComplete } from '@/lib/media-contracts';
import { getBlobMetadataByContentHash, verifyBlobExists } from '@/lib/blob-storage';

interface MediaDiagnostic {
  id: string;
  lifecycleState: string;
  source: string;
  hasContentHash: boolean;
  hasShape: boolean;
  hasRealHash: boolean;
  hasBlobObject: boolean;
  hasBlobMetadata: boolean;
  blobMetadataKeys: string[];
  blobUrlAccessible: boolean;
  isPubliclyComplete: boolean;
  contentHash?: string;
  variants?: {
    original?: string;
    thumbnail?: string;
    webp?: string;
    avif?: string;
    blur?: string;
    responsive?: Array<{ width: number; webp?: string; avif?: string }>;
  };
  issues: string[];
}

interface DiagnosticReport {
  totalRecords: number;
  completeRecords: number;
  incompleteRecords: number;
  missingBlobMetadata: number;
  missingBlobObject: number;
  blobObjectInaccessible: number;
  syntheticHashRecords: number;
  shapeErrors: number;
  details: MediaDiagnostic[];
}

function getRedisClient(): Redis | null {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestId = `diagnostic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[MEDIA_DIAGNOSTIC] REQUEST_RECEIVED', { requestId });

  // SECURITY: Require authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis unavailable", message: "KV_REST_API_URL and KV_REST_API_TOKEN required" },
        { status: 500 }
      );
    }

    console.log('[MEDIA_DIAGNOSTIC] STARTING', { requestId });

    const report: DiagnosticReport = {
      totalRecords: 0,
      completeRecords: 0,
      incompleteRecords: 0,
      missingBlobMetadata: 0,
      missingBlobObject: 0,
      blobObjectInaccessible: 0,
      syntheticHashRecords: 0,
      shapeErrors: 0,
      details: [],
    };

    // Enumerate all media:* records in KV
    const mediaKeys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await redis.scan(cursor, { match: 'media:*', count: 100 });
      cursor = result[0];
      mediaKeys.push(...result[1]);
    } while (cursor !== '0');

    report.totalRecords = mediaKeys.length;

    console.log('[MEDIA_DIAGNOSTIC] KV_ENUMERATION_COMPLETE', {
      requestId,
      totalRecords: mediaKeys.length,
    });

    // Analyze each record
    for (const key of mediaKeys) {
      const mediaId = key.replace('media:', '');
      
      try {
        const data = await redis.get(key);
        if (!data) {
          console.warn('[MEDIA_DIAGNOSTIC] RECORD_NOT_FOUND', { requestId, key });
          continue;
        }

        const media = typeof data === 'string' ? JSON.parse(data) : data;

        const diagnostic: MediaDiagnostic = {
          id: mediaId,
          lifecycleState: media.lifecycleState || 'unknown',
          source: media.source || 'unknown',
          hasContentHash: !!media.contentHash,
          hasShape: false,
          hasRealHash: false,
          hasBlobObject: false,
          hasBlobMetadata: false,
          blobMetadataKeys: [],
          blobUrlAccessible: false,
          isPubliclyComplete: false,
          contentHash: media.contentHash,
          variants: media.variants,
          issues: [],
        };

        // Check shape independently (structure only, not hash)
        try {
          diagnostic.hasShape = hasMaterializationShape(media);
        } catch (error) {
          diagnostic.issues.push(`Shape check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          report.shapeErrors++;
        }

        // Check for real hash independently (hash only, not structure)
        try {
          diagnostic.hasRealHash = hasRealContentHash(media);
        } catch (error) {
          diagnostic.issues.push(`Hash check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        if (!diagnostic.hasRealHash && diagnostic.hasContentHash) {
          diagnostic.issues.push('Synthetic content hash detected');
          report.syntheticHashRecords++;
        }

        // Check Blob metadata existence
        if (media.contentHash) {
          try {
            const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
            if (blobMetadata) {
              diagnostic.hasBlobMetadata = true;
              diagnostic.blobMetadataKeys = Object.keys(blobMetadata);
              
              // CRITICAL: Verify actual Blob object existence (not just metadata)
              // This is separate from metadata existence - metadata can exist without the object
              if (blobMetadata.url) {
                try {
                  diagnostic.blobUrlAccessible = await verifyBlobExists(blobMetadata.url);
                  if (diagnostic.blobUrlAccessible) {
                    diagnostic.hasBlobObject = true;
                  } else {
                    diagnostic.issues.push('Blob URL not accessible - object may not exist');
                    report.missingBlobObject++;
                  }
                } catch (error) {
                  diagnostic.issues.push(`Blob object verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  report.blobObjectInaccessible++;
                }
              } else {
                diagnostic.issues.push('Blob metadata exists but has no URL');
                report.missingBlobObject++;
              }
            } else {
              diagnostic.issues.push('Missing Blob metadata');
              report.missingBlobMetadata++;
            }
          } catch (error) {
            diagnostic.issues.push(`Blob metadata check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          diagnostic.issues.push('Missing content hash');
        }

        // Check public completeness
        try {
          diagnostic.isPubliclyComplete = await isPubliclyComplete(media);
        } catch (error) {
          diagnostic.issues.push(`Public completeness check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Determine if record is complete
        if (diagnostic.isPubliclyComplete) {
          report.completeRecords++;
        } else {
          report.incompleteRecords++;
        }

        report.details.push(diagnostic);

        console.log('[MEDIA_DIAGNOSTIC] RECORD_ANALYZED', {
          requestId,
          mediaId,
          isPubliclyComplete: diagnostic.isPubliclyComplete,
          issues: diagnostic.issues.length,
        });
      } catch (error) {
        console.error('[MEDIA_DIAGNOSTIC] ERROR', { requestId, mediaId, error });
      }
    }

    console.log('[MEDIA_DIAGNOSTIC] COMPLETE', {
      requestId,
      report: {
        totalRecords: report.totalRecords,
        completeRecords: report.completeRecords,
        incompleteRecords: report.incompleteRecords,
        missingBlobMetadata: report.missingBlobMetadata,
        syntheticHashRecords: report.syntheticHashRecords,
        shapeErrors: report.shapeErrors,
      },
    });

    return NextResponse.json({
      success: true,
      requestId,
      report,
    });
  } catch (error) {
    console.error('[MEDIA_DIAGNOSTIC ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
