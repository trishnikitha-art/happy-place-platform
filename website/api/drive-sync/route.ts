/**
 * Drive Sync API Route
 * 
 * Scheduled by Vercel Cron to sync photos from Google Drive.
 * 
 * Trigger: Every 30 minutes via Vercel Cron
 * Environment variables required:
 *   - DRIVE_FOLDER_ID: Google Drive folder ID
 *   - DRIVE_SERVICE_ACCOUNT_KEY: Service account credentials (JSON)
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const driveFolderId = process.env.DRIVE_FOLDER_ID;
  if (!driveFolderId) {
    return NextResponse.json({ error: 'DRIVE_FOLDER_ID not configured' }, { status: 500 });
  }

  try {
    // Import drive-sync module
    const { DriveSyncService } = await import('../../scripts/drive-sync.mjs');
    
    const service = new DriveSyncService(driveFolderId);
    await service.initialize();
    
    const diff = await service.computeDiff();
    
    console.log(`Drive sync diff: ${diff.added.length} added, ${diff.changed.length} changed, ${diff.removed.length} removed`);
    
    // If there are changes, trigger image pipeline
    if (diff.added.length > 0 || diff.changed.length > 0) {
      console.log('Changes detected, triggering image pipeline...');
      
      // TODO: Trigger image-pipeline programmatically
      // This will require refactoring image-pipeline.mjs to be importable
      // For now, just log the intent
      console.log('TODO: Run image-pipeline.mjs with Drive source');
    }
    
    // Update sync state
    await service.updateState(diff);
    
    return NextResponse.json({
      success: true,
      diff: {
        added: diff.added.length,
        changed: diff.changed.length,
        removed: diff.removed.length,
        unchanged: diff.unchanged.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Drive sync error:', error);
    return NextResponse.json(
      { error: 'Drive sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
