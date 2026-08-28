/**
 * Assignment Inventory Diagnostic API
 *
 * Audits current production assignments to identify:
 * - Stale/duplicate/invalid records
 * - brand-hero/fences duplicate resolution
 * - Assignment isolation verification
 *
 * POST /api/admin/diagnostic/inventory-assignments
 *
 * SECURITY: Requires Workbench authentication
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getAllServiceCardAssignments, getServiceCardAssignment } from '@/lib/assignment-store';
import { getMedia } from '@/lib/media-kv-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = `inventory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log('[ASSIGNMENT_INVENTORY] REQUEST_RECEIVED', { requestId });

  // SECURITY: Require Workbench authentication
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  try {
    // Get all current assignments
    const allAssignments = await getAllServiceCardAssignments();
    
    console.log('[ASSIGNMENT_INVENTORY] TOTAL_ASSIGNMENTS', {
      requestId,
      count: allAssignments.length,
    });

    // Group assignments by mediaId to detect duplicates
    const mediaIdGroups = new Map<string, string[]>();
    for (const assignment of allAssignments) {
      if (assignment.mediaId) {
        if (!mediaIdGroups.has(assignment.mediaId)) {
          mediaIdGroups.set(assignment.mediaId, []);
        }
        mediaIdGroups.get(assignment.mediaId)!.push(assignment.serviceSlug);
      }
    }

    // Identify duplicate mediaIds
    const duplicateMediaIds: Array<{ mediaId: string; serviceSlugs: string[] }> = [];
    for (const [mediaId, serviceSlugs] of mediaIdGroups.entries()) {
      if (serviceSlugs.length > 1) {
        duplicateMediaIds.push({ mediaId, serviceSlugs });
      }
    }

    console.log('[ASSIGNMENT_INVENTORY] DUPLICATE_MEDIA_IDS', {
      requestId,
      count: duplicateMediaIds.length,
      duplicates: duplicateMediaIds,
    });

    // Check brand-hero and fences specifically
    const brandHeroAssignment = await getServiceCardAssignment('brand-hero', requestId);
    const fencesAssignment = await getServiceCardAssignment('fences', requestId);

    const brandHeroFencesCollision = 
      brandHeroAssignment?.mediaId && 
      fencesAssignment?.mediaId && 
      brandHeroAssignment.mediaId === fencesAssignment.mediaId;

    console.log('[ASSIGNMENT_INVENTORY] BRAND_HERO_FENCES_COLLISION', {
      requestId,
      brandHeroMediaId: brandHeroAssignment?.mediaId,
      fencesMediaId: fencesAssignment?.mediaId,
      collision: brandHeroFencesCollision,
    });

    // Verify mediaId validity for each assignment
    const invalidAssignments: Array<{ serviceSlug: string; mediaId: string; reason: string }> = [];
    for (const assignment of allAssignments) {
      if (assignment.mediaId) {
        try {
          const media = await getMedia(assignment.mediaId);
          if (!media) {
            invalidAssignments.push({
              serviceSlug: assignment.serviceSlug,
              mediaId: assignment.mediaId,
              reason: 'Media record not found in KV',
            });
          } else if (media.lifecycleState !== 'published' || media.source !== 'local') {
            invalidAssignments.push({
              serviceSlug: assignment.serviceSlug,
              mediaId: assignment.mediaId,
              reason: `Invalid lifecycle state (${media.lifecycleState}) or source (${media.source})`,
            });
          }
        } catch (error) {
          invalidAssignments.push({
            serviceSlug: assignment.serviceSlug,
            mediaId: assignment.mediaId,
            reason: `Media lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }
    }

    console.log('[ASSIGNMENT_INVENTORY] INVALID_ASSIGNMENTS', {
      requestId,
      count: invalidAssignments.length,
      invalid: invalidAssignments,
    });

    return NextResponse.json({
      success: true,
      requestId,
      totalAssignments: allAssignments.length,
      duplicateMediaIds,
      brandHeroFencesCollision,
      brandHeroAssignment,
      fencesAssignment,
      invalidAssignments,
      allAssignments,
    });
  } catch (error) {
    console.error('[ASSIGNMENT_INVENTORY] ERROR', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: 'Assignment inventory failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}