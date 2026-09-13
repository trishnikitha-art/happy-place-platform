/**
 * Quarantine/Delete Media Record
 *
 * Surgical deletion of specific media records that cannot be repaired.
 * Requires Workbench authentication and explicit confirmation.
 *
 * POST /api/admin/diagnostic/quarantine-media
 * Body: { mediaId: string, confirm: boolean }
 *
 * Security:
 * - Requires Workbench authentication
 * - Requires explicit confirmation (confirm: true)
 * - Logs all quarantine actions for audit trail
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getMediaRecordRaw, listMediaIds, deleteMedia } from '@/lib/media-kv-store';

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
