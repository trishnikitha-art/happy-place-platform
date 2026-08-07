/**
 * Drive Discovery API Route
 * 
 * Exposes automatic Drive discovery to the Media Runtime.
 * Returns My Drive, Shared Drives, HPP folders, and recent folders.
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const structure = await driveDiscovery.discoverStructure();
    return NextResponse.json(structure);
  } catch (error) {
    console.error('Drive discovery error:', error);
    return NextResponse.json(
      { error: 'Failed to discover Drive structure', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
