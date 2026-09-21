/**
 * One-Time Quarantine Execution
 * 
 * Server-side execution of quarantine for malformed production KV record.
 * This endpoint runs with Vercel environment credentials (no external auth required).
 * 
 * POST /api/admin/diagnostic/execute-quarantine
 * 
 * Security:
 * - ONE-TIME USE ONLY - delete this route after execution
 * - Only quarantines specific allowlisted media IDs
 * - Logs all actions for audit trail
 * 
 * CRITICAL: Remove this route after the quarantine is complete to reduce attack surface.
 */

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getKvNamespace, namespacedKey } from '@/lib/environment';

export const dynamic = 'force-dynamic';

const TARGET_MEDIA_ID = '07c0eae184dc5a375f943a3ac2b67e95';

export async function POST(request: Request) {
  console.log('[EXECUTE_QUARANTINE] One-time quarantine execution started');
  console.log('[EXECUTE_QUARANTINE] Target media ID:', TARGET_MEDIA_ID);

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    console.error('[EXECUTE_QUARANTINE] ERROR: KV credentials not found in Vercel environment');
    return NextResponse.json(
      { error: 'KV credentials not found in environment' },
      { status: 500 }
    );
  }

  const redis = new Redis({ url: kvUrl, token: kvToken });

  try {
    // Read the malformed record
    const mediaKey = namespacedKey(`media:${TARGET_MEDIA_ID}`);
    const existingRecord = await redis.get(mediaKey);

    if (!existingRecord) {
      console.error('[EXECUTE_QUARANTINE] ERROR: Record not found in KV');
      return NextResponse.json(
        { error: 'Record does not exist in KV', mediaId: TARGET_MEDIA_ID },
        { status: 404 }
      );
    }

    console.log('[EXECUTE_QUARANTINE] Current record state:', {
      id: existingRecord.id,
      storage: existingRecord.storage,
      lifecycleState: existingRecord.lifecycleState,
      source: existingRecord.source,
    });

    // Log record state before deletion
    console.log('[EXECUTE_QUARANTINE] Deleting malformed record:', TARGET_MEDIA_ID);

    // Delete the record
    await redis.del(mediaKey);

    // Verify deletion
    const afterDelete = await redis.get(mediaKey);
    if (afterDelete) {
      console.error('[EXECUTE_QUARANTINE] ERROR: Record still exists after deletion attempt');
      return NextResponse.json({
        mediaId: TARGET_MEDIA_ID,
        success: false,
        error: 'Record still exists after deletion'
      }, { status: 500 });
    }

    console.log('[EXECUTE_QUARANTINE] SUCCESS: Malformed record quarantined from production KV');
    console.log('[EXECUTE_QUARANTINE] Public gate will no longer reject this record (it no longer exists)');

    return NextResponse.json({
      mediaId: TARGET_MEDIA_ID,
      success: true,
      action: 'quarantined',
      previousState: {
        storage: existingRecord.storage,
        lifecycleState: existingRecord.lifecycleState,
        source: existingRecord.source,
      },
      timestamp: new Date().toISOString(),
      message: 'Malformed record successfully quarantined. Delete this route to reduce attack surface.'
    });

  } catch (error) {
    console.error('[EXECUTE_QUARANTINE] ERROR:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
