import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { runSharpDiagnostics } from '@/lib/sharp-diagnostics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    if (!await workbenchSession.isAuthenticated()) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', requestId }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'AUTHORIZATION_UNAVAILABLE', requestId }, { status: 503 });
  }

  try {
    const diagnostics = await runSharpDiagnostics();
    return NextResponse.json(
      { success: diagnostics.success, diagnostics, requestId },
      { status: diagnostics.success ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ success: false, error: 'DIAGNOSTIC_ERROR', requestId }, { status: 503 });
  }
}
