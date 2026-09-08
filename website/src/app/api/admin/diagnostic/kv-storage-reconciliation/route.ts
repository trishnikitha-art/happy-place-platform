/**
 * KV Storage Schema Reconciliation Diagnostic
 * 
 * P0 FIX: Evidence-driven migration of legacy KV records to new storage schema
 * 
 * The constitutional public gate now requires:
 * - storage: "static" for local files with /images/ paths
 * - storage: "blob" for Vercel Blob storage with blob_metadata
 * 
 * Legacy KV records have storage: undefined, causing PUBLIC_GATE_REJECTED
 * 
 * This diagnostic:
 * 1. Enumerates every live KV media record
 * 2. Classifies by actual evidence (not guessing)
 * 3. Produces dry-run report with repair actions
 * 4. Applies deterministic repairs only when evidence is unambiguous
 * 
 * SECURITY: Mutations are POST-only with CAS protection
 * 
 * DOES NOT touch:
 * - media.v1.json (static authority)
 * - projects.v1.json (project assignments)
 * - physical /public/images files
 * - recovered gallery assignments
 * 
 * ONLY operates on live KV representation.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getMediaRecordRaw, listMediaIds, updateStorageFieldCAS } from '@/lib/media-kv-store';
import { getEnvironment } from '@/lib/environment';
import { verifyBlobHash } from '@/lib/blob-storage';
import { loadProjectsManifest } from '@/lib/projects';

export const dynamic = 'force-dynamic';

type StorageClassification = 
  | 'VALID_STATIC'
  | 'VALID_BLOB'
  | 'MISSING_STORAGE'
  | 'MISSING_BLOB_METADATA'
  | 'INVALID_STATIC_PATH'
  | 'SYNTHETIC_HASH'
  | 'MISSING_CONTENT_HASH'
  | 'STALE'
  | 'AMBIGUOUS';

interface MediaRecordClassification {
  mediaId: string;
  contentHash: string | null;
  storage: string | null;
  source: string | null;
  lifecycleState: string | null;
  variantsOriginal: string | null;
  blobMetadataPresent: boolean;
  classification: StorageClassification;
  evidence: string;
  proposedStorage: string | null;
  publicGateResult: string;
  repairAction: string;
  projectGalleryAssignments: string[];
  serviceAssignments: string[];
}

interface ReconciliationReport {
  environment: string;
  timestamp: string;
  totalRecords: number;
  classifications: Record<StorageClassification, number>;
  records: MediaRecordClassification[];
  summary: {
    validStatic: number;
    validBlob: number;
    needsRepair: number;
    ambiguous: number;
    safeToAutoRepair: number;
  };
}

/**
 * Classify a single KV media record by actual evidence
 */
async function classifyRecord(record: any): Promise<MediaRecordClassification> {
  const mediaId = record.id || 'unknown';
  const contentHash = record.contentHash || null;
  const storage = record.storage || null;
  const source = record.source || null;
  const lifecycleState = record.lifecycleState || null;
  const variantsOriginal = record.variants?.original || null;
  const blobMetadataPresent = !!record.blob_metadata;
  
  let classification: StorageClassification;
  let evidence: string;
  let proposedStorage: string | null;
  let publicGateResult: string;
  let repairAction: string;
  
  // Check for synthetic/placeholder hashes
  if (contentHash && contentHash.startsWith('00000000')) {
    classification = 'SYNTHETIC_HASH';
    evidence = 'Content hash starts with 00000000 - synthetic placeholder';
    proposedStorage = null;
    publicGateResult = 'QUARANTINE';
    repairAction = 'MANUAL_REVIEW - Synthetic hash, requires real content';
  }
  // Check for missing content hash
  else if (!contentHash) {
    classification = 'MISSING_CONTENT_HASH';
    evidence = 'No content hash present';
    proposedStorage = null;
    publicGateResult = 'REJECTED';
    repairAction = 'MANUAL_REVIEW - Cannot validate without content hash';
  }
  // Check for stale/unpublished records
  else if (lifecycleState !== 'published') {
    classification = 'STALE';
    evidence = `Lifecycle state is ${lifecycleState}, not published`;
    proposedStorage = storage;
    publicGateResult = 'BYPASSED';
    repairAction = 'NONE - Not published, no repair needed';
  }
  // Check for Blob records with actual integrity verification
  else if (source === 'blob' || blobMetadataPresent) {
    const blobMetadata = record.blob_metadata as { url?: string } | null;
    const blobUrl = blobMetadata?.url || null;
    
    if (storage === 'blob' && blobMetadataPresent && contentHash && blobUrl) {
      // Verify actual Blob integrity
      try {
        const blobVerification = await verifyBlobHash(blobUrl, contentHash);
        if (blobVerification.success) {
          classification = 'VALID_BLOB';
          evidence = 'Source is blob, storage is blob, blob_metadata present, Blob integrity verified';
          proposedStorage = 'blob';
          publicGateResult = 'APPROVED';
          repairAction = 'NONE - Already valid';
        } else {
          classification = 'MISSING_BLOB_METADATA';
          evidence = `Storage is blob and blob_metadata present but Blob integrity verification failed: ${blobVerification.errorType}`;
          proposedStorage = 'blob';
          publicGateResult = 'REJECTED';
          repairAction = 'MANUAL_REVIEW - Blob integrity verification failed';
        }
      } catch (error) {
        classification = 'AMBIGUOUS';
        evidence = `Blob integrity verification error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        proposedStorage = null;
        publicGateResult = 'REJECTED';
        repairAction = 'MANUAL_REVIEW - Blob verification error';
      }
    } else if (storage === 'blob' && (!blobMetadataPresent || !blobUrl)) {
      classification = 'MISSING_BLOB_METADATA';
      evidence = 'Storage is blob but blob_metadata or blob URL missing';
      proposedStorage = 'blob';
      publicGateResult = 'REJECTED';
      repairAction = 'MANUAL_REVIEW - Missing blob_metadata/blob URL, cannot verify integrity';
    } else if (!storage && blobMetadataPresent && contentHash && blobUrl) {
      // Verify Blob integrity before auto-repair
      try {
        const blobVerification = await verifyBlobHash(blobUrl, contentHash);
        if (blobVerification.success) {
          classification = 'MISSING_STORAGE';
          evidence = 'Source is blob, blob_metadata present, Blob integrity verified, storage missing';
          proposedStorage = 'blob';
          publicGateResult = 'REJECTED_NOW';
          repairAction = 'AUTO_REPAIR - Set storage: "blob"';
        } else {
          classification = 'MISSING_BLOB_METADATA';
          evidence = `blob_metadata present but Blob integrity verification failed: ${blobVerification.errorType}`;
          proposedStorage = null;
          publicGateResult = 'REJECTED';
          repairAction = 'MANUAL_REVIEW - Blob integrity verification failed';
        }
      } catch (error) {
        classification = 'AMBIGUOUS';
        evidence = `Blob integrity verification error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        proposedStorage = null;
        publicGateResult = 'REJECTED';
        repairAction = 'MANUAL_REVIEW - Blob verification error';
      }
    } else if (!storage && blobMetadataPresent && (!contentHash || !blobUrl)) {
      classification = 'MISSING_BLOB_METADATA';
      evidence = 'blob_metadata present but missing content hash or blob URL for verification';
      proposedStorage = null;
      publicGateResult = 'REJECTED';
      repairAction = 'MANUAL_REVIEW - Insufficient blob evidence for verification';
    } else {
      classification = 'AMBIGUOUS';
      evidence = 'Mixed blob evidence but unclear state';
      proposedStorage = null;
      publicGateResult = 'REJECTED';
      repairAction = 'MANUAL_REVIEW - Ambiguous blob state';
    }
  }
  // Check for static/local records
  else if (source === 'local' || variantsOriginal?.startsWith('/images/')) {
    if (storage === 'static' && variantsOriginal?.startsWith('/images/')) {
      classification = 'VALID_STATIC';
      evidence = 'Source is local, storage is static, path starts with /images/';
      proposedStorage = 'static';
      publicGateResult = 'APPROVED';
      repairAction = 'NONE - Already valid';
    } else if (storage === 'static' && !variantsOriginal?.startsWith('/images/')) {
      classification = 'INVALID_STATIC_PATH';
      evidence = 'Storage is static but path does not start with /images/';
      proposedStorage = null;
      publicGateResult = 'REJECTED';
      repairAction = 'MANUAL_REVIEW - Invalid static path';
    } else if (!storage && variantsOriginal?.startsWith('/images/')) {
      classification = 'MISSING_STORAGE';
      evidence = 'Source is local, path starts with /images/, storage missing';
      proposedStorage = 'static';
      publicGateResult = 'REJECTED_NOW';
      repairAction = 'AUTO_REPAIR - Set storage: "static"';
    } else if (!storage && !variantsOriginal?.startsWith('/images/')) {
      classification = 'AMBIGUOUS';
      evidence = 'Source is local but no /images/ path and no storage';
      proposedStorage = null;
      publicGateResult = 'REJECTED';
      repairAction = 'MANUAL_REVIEW - Ambiguous static state';
    } else {
      classification = 'AMBIGUOUS';
      evidence = 'Mixed static evidence but unclear state';
      proposedStorage = null;
      publicGateResult = 'REJECTED';
      repairAction = 'MANUAL_REVIEW - Ambiguous static state';
    }
  }
  // Unknown source type
  else if (!source) {
    classification = 'MISSING_STORAGE';
    evidence = 'No source field, cannot determine storage type';
    proposedStorage = null;
    publicGateResult = 'REJECTED';
    repairAction = 'MANUAL_REVIEW - Missing source field';
  }
  // Default to ambiguous
  else {
    classification = 'AMBIGUOUS';
    evidence = `Unknown source: ${source}, cannot classify`;
    proposedStorage = null;
    publicGateResult = 'REJECTED';
    repairAction = 'MANUAL_REVIEW - Unknown source type';
  }
  
  return {
    mediaId,
    contentHash,
    storage,
    source,
    lifecycleState,
    variantsOriginal,
    blobMetadataPresent,
    classification,
    evidence,
    proposedStorage,
    publicGateResult,
    repairAction,
    projectGalleryAssignments: [],
    serviceAssignments: [],
  };
}

/**
 * Enumerate all KV media records and classify them
 * Also collects project gallery and service assignment information
 */
async function enumerateAndClassifyRecords(): Promise<MediaRecordClassification[]> {
  const classifications: MediaRecordClassification[] = [];
  
  try {
    const env = getEnvironment();
    console.log('[KV_RECONCILIATION] Scanning KV media records', { environment: env });
    
    // Get all media IDs from KV
    const mediaIds = await listMediaIds();
    console.log('[KV_RECONCILIATION] Found media IDs', { count: mediaIds.length });
    
    // Load project gallery assignments from static authority
    const projectsManifest = loadProjectsManifest();
    const projectGalleryAssignments = new Map<string, string[]>();
    
    for (const project of projectsManifest.projects) {
      const galleryIds = project.media.gallery || [];
      const heroId = project.media.hero;
      const afterId = project.media.after;
      
      const allProjectMediaIds = [...galleryIds];
      if (heroId) allProjectMediaIds.push(heroId);
      if (afterId) allProjectMediaIds.push(afterId);
      
      for (const mediaId of allProjectMediaIds) {
        if (!projectGalleryAssignments.has(mediaId)) {
          projectGalleryAssignments.set(mediaId, []);
        }
        projectGalleryAssignments.get(mediaId)!.push(project.id);
      }
    }
    
    // Load service card assignments from KV
    const { getAllServiceCardAssignments } = await import('@/lib/assignment-store');
    const serviceAssignments = await getAllServiceCardAssignments();
    const serviceAssignmentMap = new Map<string, string[]>();
    
    for (const assignment of serviceAssignments) {
      if (!serviceAssignmentMap.has(assignment.mediaId)) {
        serviceAssignmentMap.set(assignment.mediaId, []);
      }
      serviceAssignmentMap.get(assignment.mediaId)!.push(assignment.serviceSlug);
    }
    
    // Fetch and classify each record
    for (const mediaId of mediaIds) {
      try {
        const record = await getMediaRecordRaw(mediaId);
        if (record) {
          const classification = await classifyRecord(record);
          
          // Add assignment information
          classification.projectGalleryAssignments = projectGalleryAssignments.get(mediaId) || [];
          classification.serviceAssignments = serviceAssignmentMap.get(mediaId) || [];
          
          classifications.push(classification);
        } else {
          console.warn('[KV_RECONCILIATION] Missing record for ID', { mediaId });
        }
      } catch (error) {
        console.error('[KV_RECONCILIATION] Error classifying record', { 
          mediaId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    console.log('[KV_RECONCILIATION] Classification complete', { 
      total: classifications.length 
    });
    
  } catch (error) {
    console.error('[KV_RECONCILIATION] Error enumerating records:', error);
    throw error;
  }
  
  return classifications;
}

/**
 * Generate reconciliation summary
 */
function generateSummary(classifications: MediaRecordClassification[]) {
  const classificationCounts: Record<StorageClassification, number> = {
    VALID_STATIC: 0,
    VALID_BLOB: 0,
    MISSING_STORAGE: 0,
    MISSING_BLOB_METADATA: 0,
    INVALID_STATIC_PATH: 0,
    SYNTHETIC_HASH: 0,
    MISSING_CONTENT_HASH: 0,
    STALE: 0,
    AMBIGUOUS: 0,
  };
  
  for (const record of classifications) {
    classificationCounts[record.classification]++;
  }
  
  const validStatic = classificationCounts.VALID_STATIC;
  const validBlob = classificationCounts.VALID_BLOB;
  const needsRepair = classificationCounts.MISSING_STORAGE + classificationCounts.MISSING_BLOB_METADATA;
  const ambiguous = classificationCounts.AMBIGUOUS + classificationCounts.INVALID_STATIC_PATH + classificationCounts.SYNTHETIC_HASH + classificationCounts.MISSING_CONTENT_HASH;
  const safeToAutoRepair = classificationCounts.MISSING_STORAGE; // Only safe when evidence is unambiguous
  
  return {
    validStatic,
    validBlob,
    needsRepair,
    ambiguous,
    safeToAutoRepair,
  };
}

export async function GET(request: Request) {
  // SECURITY: Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  console.log('[KV_RECONCILIATION] Dry-run diagnostic requested', { 
    environment: getEnvironment()
  });
  
  try {
    // Enumerate and classify all KV records
    const classifications = await enumerateAndClassifyRecords();
    
    // Generate classification counts (per-class counters)
    const classificationCounts: Record<StorageClassification, number> = {
      VALID_STATIC: 0,
      VALID_BLOB: 0,
      MISSING_STORAGE: 0,
      MISSING_BLOB_METADATA: 0,
      INVALID_STATIC_PATH: 0,
      SYNTHETIC_HASH: 0,
      MISSING_CONTENT_HASH: 0,
      STALE: 0,
      AMBIGUOUS: 0,
    };
    
    for (const record of classifications) {
      classificationCounts[record.classification]++;
    }
    
    // Generate summary (derived aggregates)
    const summary = generateSummary(classifications);
    
    const report: ReconciliationReport = {
      environment: getEnvironment(),
      timestamp: new Date().toISOString(),
      totalRecords: classifications.length,
      classifications: classificationCounts,
      records: classifications,
      summary,
    };
    
    // Dry run mode - return report without mutations
    return NextResponse.json({
      ...report,
      applyMode: false,
      message: 'DRY RUN - No mutations applied. Use POST to apply deterministic repairs.',
    });
    
  } catch (error) {
    console.error('[KV_RECONCILIATION] Error:', error);
    return NextResponse.json(
      { 
        error: 'KV reconciliation failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // SECURITY: Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  console.log('[KV_RECONCILIATION] Apply repairs requested', { 
    environment: getEnvironment()
  });
  
  try {
    // Enumerate and classify all KV records
    const classifications = await enumerateAndClassifyRecords();
    
    // Generate summary
    const summary = generateSummary(classifications);
    
    // Filter for safe auto-repairs
    const safeRepairs = classifications.filter(
      r => r.repairAction === 'AUTO_REPAIR' && r.proposedStorage
    );
    
    console.log('[KV_RECONCILIATION] Applying safe repairs', { 
      count: safeRepairs.length 
    });
    
    const appliedRepairs: string[] = [];
    const failedRepairs: Array<{mediaId: string, error: string}> = [];
    
    for (const repair of safeRepairs) {
      try {
        // P0 FIX: Use atomic Redis Lua CAS for true concurrency protection
        // This prevents race conditions during concurrent reconciliation operations
        const casResult = await updateStorageFieldCAS(
          repair.mediaId,
          repair.contentHash || '',
          repair.proposedStorage as 'static' | 'blob'
        );
        
        if (casResult.success) {
          appliedRepairs.push(repair.mediaId);
          console.log('[KV_RECONCILIATION] CAS repair applied', { 
            mediaId: repair.mediaId, 
            storage: repair.proposedStorage 
          });
        } else {
          failedRepairs.push({ 
            mediaId: repair.mediaId, 
            error: `CAS violation: ${casResult.reason}` 
          });
          console.warn('[KV_RECONCILIATION] CAS repair failed', { 
            mediaId: repair.mediaId, 
            reason: casResult.reason 
          });
        }
        
      } catch (error) {
        console.error('[KV_RECONCILIATION] Failed to apply repair', { 
          mediaId: repair.mediaId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failedRepairs.push({ 
          mediaId: repair.mediaId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Generate classification counts (per-class counters)
    const classificationCounts: Record<StorageClassification, number> = {
      VALID_STATIC: 0,
      VALID_BLOB: 0,
      MISSING_STORAGE: 0,
      MISSING_BLOB_METADATA: 0,
      INVALID_STATIC_PATH: 0,
      SYNTHETIC_HASH: 0,
      MISSING_CONTENT_HASH: 0,
      STALE: 0,
      AMBIGUOUS: 0,
    };
    
    for (const record of classifications) {
      classificationCounts[record.classification]++;
    }
    
    const report: ReconciliationReport = {
      environment: getEnvironment(),
      timestamp: new Date().toISOString(),
      totalRecords: classifications.length,
      classifications: classificationCounts,
      records: classifications,
      summary,
    };
    
    return NextResponse.json({
      ...report,
      applyMode: true,
      repairsApplied: appliedRepairs.length,
      repairsSkipped: classifications.length - safeRepairs.length,
      repairDetails: {
        applied: appliedRepairs,
        failed: failedRepairs,
      },
    });
    
  } catch (error) {
    console.error('[KV_RECONCILIATION] Error:', error);
    return NextResponse.json(
      { 
        error: 'KV reconciliation failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
