/**
 * Workbench Media Authority Audit API
 *
 * Audits KV media authority records to identify failing records.
 * Returns classification of records by type and failure reason.
 *
 * P0 FIX: Architectural separation - forensic classification vs public gate verification
 * - Forensic classifier operates on RAW AUTHORITY (getMediaRecordRaw)
 * - Does NOT call verifyPublicMediaAuthority() during classification
 * - Public gate is used only as final verification, not for discovery
 * - This prevents audit noise and backwards dependency
 *
 * POST /api/workbench/media-audit
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw } from '@/lib/media-kv-store';
import { loadMediaManifest } from '@/lib/media';
import { verifyR2ObjectExists } from '@/lib/r2-storage';

export const dynamic = 'force-dynamic';

/**
 * Forensic classification function
 * Independently determines record validity without calling public gate
 * Operates on RAW AUTHORITY only
 */
async function classifyRecord(media: any, staticMediaMap: Map<string, any>): Promise<{
  classification: 'VALID_PUBLISHED' | 'DRIVE_REFERENCE' | 'MATERIALIZING' | 'STALE' | 'MISSING_STORAGE' | 'MALFORMED' | 'REPAIRABLE_STATIC' | 'REPAIRABLE_R2' | 'REQUIRES_MATERIALIZATION' | 'AMBIGUOUS' | 'UNKNOWN';
  reason: string;
}> {
  // Classify by lifecycle state
  if (media.lifecycleState === 'source_reference') {
    return { classification: 'DRIVE_REFERENCE', reason: 'Legitimate DriveReference' };
  }
  
  if (media.lifecycleState === 'materializing') {
    return { classification: 'MATERIALIZING', reason: 'Intermediate materialization state' };
  }
  
  if (media.lifecycleState === 'stale') {
    return { classification: 'STALE', reason: 'Stale record requiring refresh' };
  }
  
  if (media.lifecycleState !== 'published') {
    return { classification: 'UNKNOWN', reason: `Unknown lifecycle state: ${media.lifecycleState}` };
  }
  
  // Published record - check constitutional contract independently
  const hasStorage = media.storage === 'static' || media.storage === 'r2';
  const hasContentHash = !!media.contentHash;
  const hasDimensions = media.dimensions?.width > 0 && media.dimensions?.height > 0;
  const hasVariants = media.variants?.original;
  const hasValidSource = media.source === 'local';
  const hasLegacyDriveField = !!media.drive;
  
  // Check for constitutional violations
  if (!hasValidSource) {
    return { classification: 'MALFORMED', reason: 'Published asset must have source: local' };
  }
  
  if (!hasStorage) {
    // Missing storage - determine repairability based on evidence
    if (media.source === 'google-drive') {
      // Drive source without storage → requires materialization, NOT storage repair
      return { classification: 'REQUIRES_MATERIALIZATION', reason: 'Drive source requires materialization (not storage repair)' };
    }
    
    if (media.source === 'local') {
      if (!hasContentHash) {
        // No contentHash → cannot be r2-backed
        if (staticMediaMap.has(media.id)) {
          // Has static manifest evidence → repairable to static
          return { classification: 'REPAIRABLE_STATIC', reason: 'Local source with static manifest evidence' };
        }
        // No static manifest evidence → ambiguous
        return { classification: 'AMBIGUOUS', reason: 'Local source without static manifest evidence or contentHash' };
      }
      
      // Has contentHash - check for R2 evidence
      try {
        const originalUrl = media.variants?.original || '';
        const r2Key = originalUrl.split('/').pop() || '';
        const objectExists = await verifyR2ObjectExists(r2Key);
        
        if (objectExists) {
          // Full R2 evidence chain → repairable to r2
          return { classification: 'REPAIRABLE_R2', reason: 'Local source with full R2 evidence chain' };
        }
        return { classification: 'AMBIGUOUS', reason: 'R2 object not found' };
      } catch (error) {
        return { classification: 'AMBIGUOUS', reason: 'R2 verification error' };
      }
    }
    
    return { classification: 'AMBIGUOUS', reason: 'Unknown source without storage' };
  }
  
  // Has storage - validate contract
  if (media.storage === 'r2') {
    if (!hasContentHash) {
      return { classification: 'MALFORMED', reason: 'R2 storage requires contentHash' };
    }
    
    // Verify R2 evidence
    try {
      const originalUrl = media.variants?.original || '';
      const r2Key = originalUrl.split('/').pop() || '';
      const objectExists = await verifyR2ObjectExists(r2Key);
      
      if (!objectExists) {
        return { classification: 'MALFORMED', reason: 'R2 storage missing R2 object' };
      }
    } catch (error) {
      return { classification: 'MALFORMED', reason: 'R2 verification error' };
    }
  }
  
  if (media.storage === 'static') {
    if (!hasVariants) {
      return { classification: 'MALFORMED', reason: 'Static storage requires variants.original' };
    }
    
    if (!media.variants.original.startsWith('/images/')) {
      return { classification: 'MALFORMED', reason: 'Static storage path must start with /images/' };
    }
  }
  
  // Check for legacy drive field (constitutional violation)
  if (hasLegacyDriveField) {
    return { classification: 'MALFORMED', reason: 'Published asset has legacy drive field' };
  }
  
  // All checks passed
  return { classification: 'VALID_PUBLISHED', reason: 'Satisfies complete PublishedMediaAsset contract' };
}

export async function POST(request: Request) {
  // Require Workbench authentication for security
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { 
        error: 'WORKBENCH_AUTH_REQUIRED',
        message: 'Workbench authentication required',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, limit, offset } = body;

    if (action === 'auditPublicGate') {
      console.log('[MEDIA_AUDIT] Starting forensic classification (RAW AUTHORITY)');
      
      // Load static manifest for evidence-based classification
      const manifest = loadMediaManifest();
      const staticMediaMap = new Map(manifest.media.map(m => [m.id, m]));
      
      const mediaIds = await listMediaIds();
      
      // P0 FIX: Pagination support to handle large datasets
      const pageSize = limit || 100; // Default 100 records per batch
      const startIndex = offset || 0;
      const endIndex = Math.min(startIndex + pageSize, mediaIds.length);
      const pageIds = mediaIds.slice(startIndex, endIndex);
      
      console.log('[MEDIA_AUDIT] Pagination parameters:', {
        totalRecords: mediaIds.length,
        pageSize,
        offset: startIndex,
        processingRecords: pageIds.length,
        totalPages: Math.ceil(mediaIds.length / pageSize),
        currentPage: Math.floor(startIndex / pageSize) + 1,
      });
      
      const results = {
        totalRecords: mediaIds.length,
        processedRecords: pageIds.length,
        offset: startIndex,
        limit: pageSize,
        totalPages: Math.ceil(mediaIds.length / pageSize),
        currentPage: Math.floor(startIndex / pageSize) + 1,
        validPublished: 0,
        sourceReferences: 0,
        materializing: 0,
        stale: 0,
        malformedPublished: 0,
        missingStorage: 0,
        missingStorageIds: [] as string[],
        repairableStatic: 0,
        repairableStaticIds: [] as string[],
        repairableR2: 0,
        repairableR2Ids: [] as string[],
        requiresMaterialization: 0,
        requiresMaterializationIds: [] as string[],
        ambiguous: 0,
        ambiguousIds: [] as string[],
        unknown: 0,
        sampleRecords: [] as any[],
      };
      
      for (const mediaId of pageIds) {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) {
          continue;
        }
        
        // P0 FIX: Use independent forensic classification instead of calling public gate
        const classification = await classifyRecord(media, staticMediaMap);
        
        // Map classification to result buckets
        switch (classification.classification) {
          case 'VALID_PUBLISHED':
            results.validPublished++;
            break;
          case 'DRIVE_REFERENCE':
            results.sourceReferences++;
            break;
          case 'MATERIALIZING':
            results.materializing++;
            break;
          case 'STALE':
            results.stale++;
            break;
          case 'MISSING_STORAGE':
            results.missingStorage++;
            results.missingStorageIds.push(mediaId);
            break;
          case 'MALFORMED':
            results.malformedPublished++;
            break;
          case 'REPAIRABLE_STATIC':
            results.repairableStatic++;
            results.repairableStaticIds.push(mediaId);
            break;
          case 'REPAIRABLE_R2':
            results.repairableR2++;
            results.repairableR2Ids.push(mediaId);
            break;
          case 'REQUIRES_MATERIALIZATION':
            results.requiresMaterialization++;
            results.requiresMaterializationIds.push(mediaId);
            break;
          case 'AMBIGUOUS':
            results.ambiguous++;
            results.ambiguousIds.push(mediaId);
            break;
          case 'UNKNOWN':
            results.unknown++;
            break;
        }
        
        // Collect sample records (first 20 of this page)
        if (results.sampleRecords.length < 20) {
          results.sampleRecords.push({
            id: media.id,
            filename: media.filename,
            source: media.source,
            lifecycleState: media.lifecycleState,
            storage: media.storage,
            contentHash: media.contentHash,
            classification: classification.classification,
            reason: classification.reason,
          });
        }
      }
      
      console.log('[MEDIA_AUDIT] Forensic classification complete (page):', {
        totalRecords: results.totalRecords,
        processedRecords: results.processedRecords,
        offset: results.offset,
        currentPage: results.currentPage,
        totalPages: results.totalPages,
        validPublished: results.validPublished,
        sourceReferences: results.sourceReferences,
        materializing: results.materializing,
        stale: results.stale,
        malformedPublished: results.malformedPublished,
        missingStorage: results.missingStorage,
        repairableStatic: results.repairableStatic,
        repairableR2: results.repairableR2,
        requiresMaterialization: results.requiresMaterialization,
        ambiguous: results.ambiguous,
      });
      
      return NextResponse.json({
        audit: results,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    console.error('[MEDIA_AUDIT] Error:', error);
    return NextResponse.json(
      { 
        error: 'Media audit failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
