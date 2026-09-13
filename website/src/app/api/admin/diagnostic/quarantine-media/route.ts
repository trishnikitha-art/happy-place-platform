/**
 * Quarantine/Delete Media Record
 *
 * Surgical deletion of specific media records that cannot be repaired.
 * Requires Workbench authentication, explicit confirmation, and allowlist match.
 *
 * POST /api/admin/diagnostic/quarantine-media
 * Body: { mediaId: string, confirm: boolean }
 *
 * Security:
 * - Requires Workbench authentication
 * - Requires explicit confirmation (confirm: true)
 * - Media ID must be in QUARANTINE_ALLOWLIST (fail-closed)
 * - Logs all quarantine actions for audit trail
 * - Does NOT delete assignments or blobs - only the malformed KV record
 *
 * CRITICAL: This is a temporary diagnostic tool, not production infrastructure.
 * Remove from production architecture after the repair to reduce admin attack surface.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getMediaRecordRaw, listMediaIds, deleteMedia } from '@/lib/media-kv-store';

export const dynamic = 'force-dynamic';

/**
 * P0 FIX: Fail-closed allowlist for quarantine operations
 * Only known problematic records can be deleted via this endpoint
 * Prevents authenticated Workbench users from deleting arbitrary production media
 */
const QUARANTINE_ALLOWLIST: string[] = [
  '07c0eae184dc5a375f943a3ac2b67e95', // Known malformed record with missing storage field
];

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
    const { mediaId, confirm } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'mediaId is required' },
        { status: 400 }
      );
    }

    if (!confirm) {
      return NextResponse.json(
        { error: 'Confirmation required', message: 'Set confirm: true to delete this record' },
        { status: 400 }
      );
    }

    // P0 FIX: Fail-closed allowlist check
    if (!QUARANTINE_ALLOWLIST.includes(mediaId)) {
      console.error('[QUARANTINE_MEDIA] MEDIA_ID_NOT_IN_ALLOWLIST', {
        mediaId,
        reason: 'Quarantine endpoint requires explicit allowlist match',
      });
      return NextResponse.json(
        {
          error: 'MEDIA_ID_NOT_ALLOWED',
          message: 'This media ID is not in the quarantine allowlist. This endpoint only accepts known problematic records.',
          mediaId,
        },
        { status: 403 }
      );
    }

    console.log('[QUARANTINE_MEDIA] Quarantining record:', mediaId);

    // Verify record exists
    const allIds = await listMediaIds();
    const exists = allIds.includes(mediaId);

    if (!exists) {
      return NextResponse.json({
        mediaId,
        success: false,
        error: 'Record does not exist in KV'
      });
    }

    // Get record for audit trail
    const record = await getMediaRecordRaw(mediaId);
    if (!record) {
      return NextResponse.json({
        mediaId,
        success: false,
        error: 'Record returned null'
      });
    }

    // Log record state before deletion
    console.log('[QUARANTINE_MEDIA] Record state before deletion:', {
      mediaId,
      storage: record.storage,
      lifecycleState: record.lifecycleState,
      source: record.source,
      hasContentHash: !!record.contentHash,
      hasVariants: !!record.variants && Object.keys(record.variants).length > 0,
    });

    // Delete the record
    await deleteMedia(mediaId);

    // Verify deletion
    const afterDelete = await getMediaRecordRaw(mediaId);
    if (afterDelete) {
      console.error('[QUARANTINE_MEDIA] Record still exists after deletion attempt');
      return NextResponse.json({
        mediaId,
        success: false,
        error: 'Record still exists after deletion'
      });
    }

    console.log('[QUARANTINE_MEDIA] Successfully quarantined record:', mediaId);

    return NextResponse.json({
      mediaId,
      success: true,
      action: 'quarantined',
      previousState: {
        storage: record.storage,
        lifecycleState: record.lifecycleState,
        source: record.source,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[QUARANTINE_MEDIA] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
