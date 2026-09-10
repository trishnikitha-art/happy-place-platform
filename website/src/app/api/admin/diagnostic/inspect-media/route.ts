/**
 * Inspect Malformed Media Record
 * 
 * Forensic inspection of specific media record to determine repair/quarantine action
 * Requires Workbench authentication
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getMediaRecordRaw, listMediaIds } from '@/lib/media-kv-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // SECURITY: Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Workbench authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { mediaId } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'mediaId is required' },
        { status: 400 }
      );
    }

    console.log('[INSPECT_MEDIA] Inspecting record:', mediaId);

    // Verify record exists
    const allIds = await listMediaIds();
    const exists = allIds.includes(mediaId);

    if (!exists) {
      return NextResponse.json({
        mediaId,
        exists: false,
        error: 'Record does not exist in KV'
      });
    }

    // Get raw record
    const record = await getMediaRecordRaw(mediaId);

    if (!record) {
      return NextResponse.json({
        mediaId,
        exists: true,
        record: null,
        error: 'Record returned null'
      });
    }

    // Forensic analysis
    const analysis = {
      storage: {
        value: record.storage,
        type: typeof record.storage,
        isValid: record.storage === 'static' || record.storage === 'blob'
      },
      lifecycleState: {
        value: record.lifecycleState,
        isPublished: record.lifecycleState === 'published'
      },
      source: {
        value: record.source,
        isLocal: record.source === 'local'
      },
      contentHash: {
        value: record.contentHash ? record.contentHash.substring(0, 16) + '...' : 'MISSING',
        type: typeof record.contentHash
      },
      dimensions: {
        width: record.dimensions?.width,
        height: record.dimensions?.height,
        isValid: record.dimensions?.width > 0 && record.dimensions?.height > 0
      },
      variants: {
        keys: record.variants ? Object.keys(record.variants) : [],
        count: record.variants ? Object.keys(record.variants).length : 0,
        hasVariants: record.variants && Object.keys(record.variants).length > 0
      },
      provenance: {
        hasDriveFileId: !!record.provenance?.driveFileId,
        driveFileId: record.provenance?.driveFileId || null,
        sharedDriveId: record.provenance?.sharedDriveId || null
      },
      classification: determineRecordType(record),
      recommendation: generateRecommendation(record)
    };

    return NextResponse.json({
      mediaId,
      exists: true,
      record: {
        // Return safe subset of record
        id: record.id,
        filename: record.filename,
        lifecycleState: record.lifecycleState,
        source: record.source,
        storage: record.storage,
        hasContentHash: !!record.contentHash,
        hasVariants: analysis.variants.hasVariants,
        hasProvenance: !!record.provenance
      },
      analysis
    });

  } catch (error) {
    console.error('[INSPECT_MEDIA] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function determineRecordType(record: any): string {
  if (record.provenance?.driveFileId) {
    return 'DRIVE_SOURCE_REFERENCE';
  }
  if (record.source === 'local' && record.storage === 'static') {
    return 'STATIC_PUBLISHED_MEDIA';
  }
  if (record.source === 'local' && record.storage === 'blob') {
    return 'BLOB_PUBLISHED_MEDIA';
  }
  if (record.lifecycleState === 'materializing') {
    return 'MATERIALIZING';
  }
  if (record.lifecycleState === 'source_reference') {
    return 'SOURCE_REFERENCE';
  }
  return 'UNKNOWN';
}

function generateRecommendation(record: any): string {
  const hasStorage = record.storage === 'static' || record.storage === 'blob';
  const isPublished = record.lifecycleState === 'published';
  const isLocal = record.source === 'local';
  const hasVariants = record.variants && Object.keys(record.variants).length > 0;
  const isDriveSource = !!record.provenance?.driveFileId;

  if (isDriveSource) {
    return 'QUARANTINE: This is a Drive source reference. It should not be in PublishedMediaAsset authority. Delete the record.';
  }

  if (!hasStorage && isPublished && isLocal && hasVariants) {
    return 'REPAIR: This is a local published asset with variants but missing storage field. Set storage: "static" to repair.';
  }

  if (!hasStorage && isPublished && isLocal && !hasVariants) {
    return 'QUARANTINE: This is a local published asset with no variants and no storage. Has no physical evidence. Delete the record.';
  }

  if (!hasStorage && !isPublished) {
    return 'QUARANTINE: This is not a published asset and has no storage. Delete the record.';
  }

  if (!hasStorage) {
    return 'MANUAL_REVIEW: Record has no storage field but does not match known patterns. Manual inspection required.';
  }

  return 'VALID: Record appears valid with storage field.';
}
