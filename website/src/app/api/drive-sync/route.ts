/**
 * Drive Sync API Route
 * 
 * Scheduled by Vercel Cron to sync photos from Google Drive.
 * 
 * Trigger: Every 30 minutes via Vercel Cron
 * Environment variables required:
 *   - DRIVE_FOLDER_ID: Google Drive folder ID
 *   - DRIVE_SERVICE_ACCOUNT_KEY: Service account credentials (JSON)
 *   - CRON_SECRET: Secret for cron authentication
 *   - SYNC_FAILURE_EMAIL: Email address for failure notifications
 */

import { NextResponse } from 'next/server';

// Resend is optional - only used if configured for failure emails
let Resend: any = null;
try {
  Resend = (await import('resend')).default;
} catch {
  // Resend not installed, email notifications will be skipped
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

async function sendFailureEmail(error: Error) {
  const email = process.env.SYNC_FAILURE_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!email || !resendApiKey) {
    console.warn('SYNC_FAILURE_EMAIL or RESEND_API_KEY not configured, skipping failure email');
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    
    await resend.emails.send({
      from: 'Happy Place Sync <sync@happycarpentry.com>',
      to: email,
      subject: '⚠️ Drive Sync Failed',
      html: `
        <h2>Drive Sync Failed</h2>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Stack:</strong></p>
        <pre>${error.stack}</pre>
        <p>Please check the Vercel logs for more details.</p>
      `,
    });
    
    console.log('Failure email sent to', email);
  } catch (emailError) {
    console.error('Failed to send failure email:', emailError);
  }
}

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
    const { DriveSyncService } = await import('../../../scripts/drive-sync.mjs');
    
    const service = new DriveSyncService(driveFolderId);
    await service.initialize();
    
    const diff = await service.computeDiff();
    
    console.log(`Drive sync diff: ${diff.added.length} added, ${diff.changed.length} changed, ${diff.removed.length} removed`);
    
    // If there are changes, trigger image pipeline
    if (diff.added.length > 0 || diff.changed.length > 0) {
      console.log('Changes detected, triggering image pipeline...');
      
      // Import and run the image pipeline with Drive source
      const { runPipeline } = await import('../../../scripts/image-pipeline.mjs');
      const pipelineResult = await runPipeline({ useDrive: true });
      
      console.log(`Pipeline completed: ${pipelineResult.stats.rebuilt} rebuilt, ${pipelineResult.stats.skipped} skipped`);
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
    
    // Send failure email
    if (error instanceof Error) {
      await sendFailureEmail(error);
    }
    
    return NextResponse.json(
      { error: 'Drive sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
