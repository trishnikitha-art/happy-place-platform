/**
 * Incomplete Media Categorization Endpoint
 *
 * Categorizes incomplete PublishedMediaAsset records into repair categories:
 * - valid Blob objects → repair/reconstruct
 * - missing Blob objects → rematerialize from actual Drive/source bytes
 * - synthetic hashes → recompute from actual bytes
 * - missing assignments → rebuild assignments through authoritative Workbench/deployment transaction path
 *
 * POST /api/admin/test/categorize-incomplete-media
 *
 * SECURITY: Requires Workbench authentication
 */

import { NextResponse } from "next/server";
import { detectIncompleteKvRecords } from "@/lib/materialization-recovery";
import { getBlobMetadataByContentHash, verifyBlobExists } from "@/lib/blob-storage";
import { getAllServiceCardAssignments } from "@/lib/assignment-store";
import { workbenchSession } from "@/lib/workbench-session";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CategorizedRecord {
  mediaId: string;
  contentHash: string;
  category: 'valid_blob' | 'missing_blob' | 'synthetic_hash' | 'missing_assignment';
  details: {
    hasBlobMetadata: boolean;
    blobAccessible: boolean;
    hashLooksSynthetic: boolean;
    hasAssignment: boolean;
    assignmentServiceSlugs: string[];
  };
}

export async function POST(request: Request) {
  const requestId = `categorize-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[MEDIA_CATEGORIZE] REQUEST_RECEIVED', { requestId });

  // SECURITY: Require Workbench authentication
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (process.env.NODE_ENV !== 'development' || !isDevBypass) {
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Workbench authentication required" },
        { status: 401 }
      );
    }
  } else {
    console.warn('[MEDIA_CATEGORIZE] DEV_MODE_BYPASS_ACTIVE', { 
      reason: 'DRIVE_AUTH_BYPASS=true',
      securityNote: 'This bypass is for development only'
    });
  }

  try {
    // Detect incomplete records
    const incompleteRecords = await detectIncompleteKvRecords();
    
    console.log('[MEDIA_CATEGORIZE] INCOMPLETE_RECORDS_FOUND', {
      requestId,
      count: incompleteRecords.length,
    });

    // Get all assignments to check for missing assignments
    const assignments = await getAllServiceCardAssignments();
    const assignmentMediaIds = new Set(assignments.map(a => a.mediaId));

    const categorized: CategorizedRecord[] = [];

    for (const media of incompleteRecords) {
      let category: CategorizedRecord['category'] = 'valid_blob';
      const details = {
        hasBlobMetadata: false,
        blobAccessible: false,
        hashLooksSynthetic: false,
        hasAssignment: false,
        assignmentServiceSlugs: [] as string[],
      };

      // Check for Blob metadata
      if (media.contentHash) {
        const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
        details.hasBlobMetadata = !!blobMetadata;

        // Check if Blob is accessible
        if (blobMetadata) {
          details.blobAccessible = await verifyBlobExists(blobMetadata.url);
        }

        // Check for synthetic hash (heuristics)
        // Synthetic hashes often have patterns like repeated chars, all zeros, or suspicious patterns
        const hash = media.contentHash;
        const allSameChar = hash.split('').every(c => c === hash[0]);
        const hasRepeatedPattern = /^(.)\1{10,}$/.test(hash);
        details.hashLooksSynthetic = allSameChar || hasRepeatedPattern;
      }

      // Check for assignments
      const assignmentsForMedia = assignments.filter(a => a.mediaId === media.id);
      details.hasAssignment = assignmentsForMedia.length > 0;
      details.assignmentServiceSlugs = assignmentsForMedia.map(a => a.serviceSlug);

      // Determine category
      if (!details.hasBlobMetadata || !details.blobAccessible) {
        category = 'missing_blob';
      } else if (details.hashLooksSynthetic) {
        category = 'synthetic_hash';
      } else if (!details.hasAssignment) {
        category = 'missing_assignment';
      } else {
        category = 'valid_blob';
      }

      categorized.push({
        mediaId: media.id,
        contentHash: media.contentHash || 'missing',
        category,
        details,
      });
    }

    // Summarize by category
    const summary = {
      valid_blob: categorized.filter(c => c.category === 'valid_blob').length,
      missing_blob: categorized.filter(c => c.category === 'missing_blob').length,
      synthetic_hash: categorized.filter(c => c.category === 'synthetic_hash').length,
      missing_assignment: categorized.filter(c => c.category === 'missing_assignment').length,
    };

    console.log('[MEDIA_CATEGORIZE] CATEGORIZATION_COMPLETE', {
      requestId,
      summary,
    });

    return NextResponse.json({
      success: true,
      requestId,
      totalIncomplete: incompleteRecords.length,
      summary,
      categorized,
      repairPlan: {
        valid_blob: 'Use repairIncompleteKvRecord() to reconstruct all variant metadata',
        missing_blob: 'Rematerialize from actual Drive/source bytes → full materialization chain',
        synthetic_hash: 'Recompute hash from actual bytes → full materialization chain',
        missing_assignment: 'Rebuild assignments through authoritative Workbench/deployment transaction path',
      },
    });
  } catch (error) {
    console.error('[MEDIA_CATEGORIZE ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: "Categorization failed",
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
