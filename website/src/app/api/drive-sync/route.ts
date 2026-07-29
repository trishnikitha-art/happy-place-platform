/**
 * Drive Sync API Route
 * 
 * Scheduled by Vercel Cron to sync photos from local Drive folder.
 * 
 * Trigger: Every 30 minutes via Vercel Cron
 * Environment variables required:
 *   - LOCAL_DRIVE_PATH: Path to local Google Drive folder (e.g., H:\My Drive\)
 *   - CRON_SECRET: Secret for cron authentication
 *   - SYNC_FAILURE_EMAIL: Email address for failure notifications (optional)
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run the image pipeline with LOCAL_DRIVE_PATH
    const drivePath = process.env.LOCAL_DRIVE_PATH;
    if (!drivePath) {
      return NextResponse.json({ error: 'LOCAL_DRIVE_PATH not configured' }, { status: 500 });
    }

    console.log(`Running image pipeline with LOCAL_DRIVE_PATH=${drivePath}`);
    
    const { stdout, stderr } = await execAsync(
      `node scripts/image-pipeline.mjs`,
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          LOCAL_DRIVE_PATH: drivePath,
        },
        timeout: 240000, // 4 minutes
      }
    );

    console.log('Pipeline stdout:', stdout);
    if (stderr) console.error('Pipeline stderr:', stderr);

    return NextResponse.json({
      success: true,
      output: stdout,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Drive sync error:', error);
    
    return NextResponse.json(
      { 
        error: 'Drive sync failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        output: error instanceof Error && 'stdout' in error ? (error as any).stdout : undefined,
      },
      { status: 500 }
    );
  }
}
