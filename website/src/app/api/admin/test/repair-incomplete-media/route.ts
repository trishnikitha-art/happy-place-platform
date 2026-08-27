/**
 * Production Media Repair Endpoint
 *
 * Repairs incomplete PublishedMediaAsset records by reconstructing complete variant metadata.
 * This fixes the 25 incomplete production records that were created by partial KV recovery.
 *
 * POST /api/admin/test/repair-incomplete-media
 *
 * SECURITY: Requires Workbench authentication
 * FOR PRODUCTION REPAIR - Use with caution
 */

import { NextResponse } from "next/server";
import { detectIncompleteKvRecords, repairIncompleteKvRecord, runMaterializationRecovery } from "@/lib/materialization-recovery";
import { workbenchSession } from "@/lib/workbench-session";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = `repair-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[MEDIA_REPAIR] REQUEST_RECEIVED', { requestId });

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
    console.warn('[MEDIA_REPAIR] DEV_MODE_BYPASS_ACTIVE', { 
      reason: 'DRIVE_AUTH_BYPASS=true',
      securityNote: 'This bypass is for development only'
    });
  }

  try {
    const body = await request.json();
    const { mode = 'scan' } = body; // 'scan' or 'repair'

    console.log('[MEDIA_REPAIR] MODE', { requestId, mode });

    if (mode === 'scan') {
      // Scan for incomplete records without repairing
      const incompleteRecords = await detectIncompleteKvRecords();
      
      console.log('[MEDIA_REPAIR] SCAN_COMPLETE', {
        requestId,
        incompleteCount: incompleteRecords.length,
        mediaIds: incompleteRecords.map(m => m.id),
      });

      return NextResponse.json({
        success: true,
        requestId,
        mode: 'scan',
        incompleteRecords: incompleteRecords.map(m => ({
          id: m.id,
          contentHash: m.contentHash,
          lifecycleState: m.lifecycleState,
          source: m.source,
          hasOriginal: !!m.variants?.original,
          hasThumbnail: !!m.variants?.thumbnail,
          hasWebp: !!m.variants?.webp,
          hasAvif: !!m.variants?.avif,
          responsiveCount: m.variants?.responsive?.length || 0,
        })),
        summary: {
          totalIncomplete: incompleteRecords.length,
        },
      });
    }

    if (mode === 'repair') {
      // Run full materialization recovery
      const recoveryResult = await runMaterializationRecovery();
      
      console.log('[MEDIA_REPAIR] REPAIR_COMPLETE', {
        requestId,
        ...recoveryResult,
      });

      return NextResponse.json({
        success: true,
        requestId,
        mode: 'repair',
        result: recoveryResult,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid mode",
        message: "Mode must be 'scan' or 'repair'",
        requestId,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[MEDIA_REPAIR ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: "Repair failed",
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
