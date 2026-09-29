/**
 * Incomplete Media Categorization Endpoint
 *
 * Categorizes incomplete PublishedMediaAsset records into repair categories:
 * - valid R2 objects → repair/reconstruct
 * - missing R2 objects → rematerialize from actual Drive/source bytes
 * - synthetic hashes → recompute from actual bytes
 * - missing assignments → rebuild assignments through authoritative Workbench/deployment transaction path
 *
 * POST /api/admin/test/categorize-incomplete-media
 *
 * SECURITY: Requires Workbench authentication
 */

import { NextResponse } from "next/server";
import { detectIncompleteKvRecords } from "@/lib/materialization-recovery";
import { verifyR2ObjectExists } from "@/lib/r2-storage";
import { getAllServiceCardAssignments } from "@/lib/assignment-store";
import { workbenchSession } from "@/lib/workbench-session";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CategorizedRecord {
  mediaId: string;
  contentHash: string;
  category: 'valid_r2' | 'missing_r2' | 'synthetic_hash' | 'missing_assignment';
  details: {
    hasR2Object: boolean;
    r2Accessible: boolean;
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
      let category: CategorizedRecord['category'] = 'valid_r2';
      const details = {
        hasR2Object: false,
        r2Accessible: false,
        hashLooksSynthetic: false,
        hasAssignment: false,
        assignmentServiceSlugs: [] as string[],
      };

      // Check for R2 object existence
      if (media.contentHash && media.storage === 'r2') {
        const originalUrl = media.variants?.original;
        const objectKey = originalUrl?.split('/').pop() || '';
        
        if (objectKey) {
          details.hasR2Object = await verifyR2ObjectExists(objectKey);
          details.r2Accessible = details.hasR2Object; // R2 accessibility = object existence
        }

        // Check for synthetic hash (heuristics)
        // Synthetic hashes often have patterns like repeated chars, all zeros, or suspicious patterns
        const hash = media.contentHash;
        const allSameChar = hash.split('').every(c => c === hash[0]);
        const hasRepeatedPattern = /^(.)\1{10,}$/.test(hash);
        details.hashLooksSynthetic = allSameChar || hasRepeatedPattern;
      } else if (media.storage === 'static') {
        // Static storage: assume files exist (local file system)
        details.hasR2Object = true;
        details.r2Accessible = true;
      }

      // Check for assignments
      const assignmentsForMedia = assignments.filter(a => a.mediaId === media.id);
      details.hasAssignment = assignmentsForMedia.length > 0;
      details.assignmentServiceSlugs = assignmentsForMedia.map(a => a.serviceSlug);

      // Determine category
      if (!details.hasR2Object || !details.r2Accessible) {
        category = 'missing_r2';
      } else if (details.hashLooksSynthetic) {
        category = 'synthetic_hash';
      } else if (!details.hasAssignment) {
        category = 'missing_assignment';
      } else {
        category = 'valid_r2';
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
      valid_r2: categorized.filter(c => c.category === 'valid_r2').length,
      missing_r2: categorized.filter(c => c.category === 'missing_r2').length,
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
        valid_r2: 'Use repairIncompleteKvRecord() to reconstruct all variant metadata',
        missing_r2: 'Rematerialize from actual Drive/source bytes → full materialization chain',
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
