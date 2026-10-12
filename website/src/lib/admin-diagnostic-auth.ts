import { NextResponse } from 'next/server';
import { workbenchSession } from './workbench-session';

/**
 * Reuse the existing server-side Workbench session for private diagnostics.
 * This is the deployment's single-admin password capability, not a tenant-owner
 * identity. Do not use this guard as proof of per-principal ownership.
 */
export async function requireAdminDiagnosticSession(): Promise<NextResponse | null> {
  try {
    const credentials = await workbenchSession.getCredentials();
    if (!credentials || credentials.authenticated !== true ||
        typeof credentials.expiresAt !== 'number' ||
        !Number.isFinite(credentials.expiresAt) || credentials.expiresAt <= Date.now()) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return null;
  } catch {
    return NextResponse.json(
      { error: 'Authentication unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
