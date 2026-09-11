/**
 * Production Diagnostic: Inspect Malformed Media Record
 * 
 * Forensic inspection of specific malformed KV media record 07c0eae184dc5a375f943a3ac2b67e95
 * which has storage: undefined and is being rejected by the public media gate.
 * 
 * This script performs evidence-based classification to determine whether the record
 * can be safely repaired or should be quarantined/deleted.
 * 
 * Usage: node scripts/inspect-malformed-media-record.mjs
 */

import { getMediaRecordRaw, listMediaIds } from './src/lib/media-kv-store.ts';
import { loadMediaManifest } from './src/lib/media.ts';

const TARGET_MEDIA_ID = '07c0eae184dc5a375f943a3ac2b67e95';

async function inspectMalformedRecord() {
  console.log('[MALFORMED_MEDIA_INSPECTION] Starting forensic inspection...');
  console.log('[MALFORMED_MEDIA_INSPECTION] Target media ID:', TARGET_MEDIA_ID);
  
  try {
    // Check if record exists in KV
    const allIds = await listMediaIds();
    const exists = allIds.includes(TARGET_MEDIA_ID);
    
    console.log('[MALFORMED_MEDIA_INSPECTION] KV record exists:', exists);
    
    if (!exists) {
      console.log('[MALFORMED_MEDIA_INSPECTION] Record does not exist in KV - may have been deleted or never existed');
      return;
    }
    
    // Get raw record
    const record = await getMediaRecordRaw(TARGET_MEDIA_ID);
    
    if (!record) {
      console.log('[MALFORMED_MEDIA_INSPECTION] Record returned null from KV');
      return;
    }
    
    console.log('[MALFORMED_MEDIA_INSPECTION] Raw record retrieved:', {
      id: record.id,
      filename: record.filename,
      lifecycleState: record.lifecycleState,
      source: record.source,
      storage: record.storage,
      storageType: typeof record.storage,
      hasContentHash: !!record.contentHash,
      hasVariants: !!record.variants,
      variantKeys: record.variants ? Object.keys(record.variants) : [],
      hasProvenance: !!record.provenance,
      hasDriveFileId: !!record.provenance?.driveFileId,
    });
    
    // Classification
    const analysis = {
      storage: {
        value: record.storage,
        type: typeof record.storage,
        isValid: record.storage === 'static' || record.storage === 'blob',
        isUndefined: record.storage === undefined,
        isNull: record.storage === null,
      },
      lifecycleState: {
        value: record.lifecycleState,
        isPublished: record.lifecycleState === 'published',
        isSourceReference: record.lifecycleState === 'source_reference',
        isMaterializing: record.lifecycleState === 'materializing',
      },
      source: {
        value: record.source,
        isLocal: record.source === 'local',
        isDrive: record.source === 'google-drive',
      },
      contentHash: {
        value: record.contentHash ? record.contentHash.substring(0, 16) + '...' : 'MISSING',
        type: typeof record.contentHash,
        hasValue: !!record.contentHash,
      },
      dimensions: {
        width: record.dimensions?.width,
        height: record.dimensions?.height,
        hasValidDimensions: record.dimensions?.width > 0 && record.dimensions?.height > 0,
      },
      variants: {
        keys: record.variants ? Object.keys(record.variants) : [],
        count: record.variants ? Object.keys(record.variants).length : 0,
        hasVariants: record.variants && Object.keys(record.variants).length > 0,
        hasOriginal: !!record.variants?.original,
        hasWeb: !!record.variants?.web,
        hasThumbnail: !!record.variants?.thumbnail,
      },
      provenance: {
        hasDriveFileId: !!record.provenance?.driveFileId,
        driveFileId: record.provenance?.driveFileId || null,
        sharedDriveId: record.provenance?.sharedDriveId || null,
      },
    };
    
    console.log('[MALFORMED_MEDIA_INSPECTION] Analysis:', analysis);
    
    // Classification
    let classification = 'UNKNOWN';
    let recommendation = 'MANUAL_REVIEW';
    
    if (analysis.provenance.hasDriveFileId) {
      classification = 'DRIVE_SOURCE_REFERENCE';
      recommendation = 'QUARANTINE: This is a Drive source reference. It should not be in PublishedMediaAsset authority. Delete the record.';
    } else if (analysis.source.isLocal && analysis.lifecycleState.isPublished && analysis.storage.isUndefined && analysis.variants.hasVariants) {
      classification = 'STATIC_PUBLISHED_MISSING_STORAGE';
      recommendation = 'REPAIR: This is a local published asset with variants but missing storage field. Set storage: "static" to repair.';
    } else if (analysis.source.isLocal && analysis.lifecycleState.isPublished && analysis.storage.isUndefined && !analysis.variants.hasVariants) {
      classification = 'STATIC_PUBLISHED_NO_VARIANTS';
      recommendation = 'QUARANTINE: This is a local published asset with no variants and no storage. Has no physical evidence. Delete the record.';
    } else if (!analysis.lifecycleState.isPublished) {
      classification = 'NON_PUBLISHED_RECORD';
      recommendation = 'QUARANTINE: This is not a published asset and has no storage. Delete the record.';
    } else if (analysis.storage.isUndefined && analysis.contentHash.hasValue) {
      classification = 'PUBLISHED_MISSING_STORAGE_WITH_HASH';
      recommendation = 'REPAIR: Published with content hash but missing storage. Check physical evidence for static vs blob.';
    } else {
      classification = 'UNKNOWN_PATTERN';
      recommendation = 'MANUAL_REVIEW: Record has no storage field but does not match known patterns. Manual inspection required.';
    }
    
    console.log('[MALFORMED_MEDIA_INSPECTION] Classification:', classification);
    console.log('[MALFORMED_MEDIA_INSPECTION] Recommendation:', recommendation);
    
    // Check against canonical static authority
    const manifest = loadMediaManifest();
    const canonicalMatch = manifest.media.find(m => m.id === TARGET_MEDIA_ID);
    
    console.log('[MALFORMED_MEDIA_INSPECTION] Canonical authority check:', {
      foundInCanonical: !!canonicalMatch,
      canonicalStorage: canonicalMatch?.storage,
      canonicalFilename: canonicalMatch?.filename,
    });
    
    if (canonicalMatch && canonicalMatch.storage === 'static') {
      console.log('[MALFORMED_MEDIA_INSPECTION] EVIDENCE: Canonical authority exists with storage: static');
      console.log('[MALFORMED_MEDIA_INSPECTION] RECOMMENDATION UPDATED: REPAIR with storage: "static" based on canonical authority evidence');
    }
    
    console.log('[MALFORMED_MEDIA_INSPECTION] Inspection complete');
    
  } catch (error) {
    console.error('[MALFORMED_MEDIA_INSPECTION] ERROR:', error);
    process.exit(1);
  }
}

inspectMalformedRecord();
