import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { runSharpDiagnostics } from '@/lib/sharp-diagnostics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hasValidBearer(request: Request, secret: string): boolean {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return false;
  const supplied = header.slice('Bearer '.length);
  if (!supplied) return false;

  // Compare fixed-size digests so timingSafeEqual never reveals token length.
  const suppliedDigest = createHash('sha256').update(supplied).digest();
  const expectedDigest = createHash('sha256').update(secret).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  const secret = process.env.DIAGNOSTIC_SECRET;
  if (typeof secret !== 'string' || secret.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'DIAGNOSTIC_NOT_CONFIGURED', requestId },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (!hasValidBearer(request, secret)) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED', requestId }, {
      status: 401, headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const diagnostics = await runSharpDiagnostics();
    return NextResponse.json({
      success: diagnostics.success,
      diagnostics,
      requestId,
    }, { status: diagnostics.success ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { success: false, error: 'DIAGNOSTIC_ERROR', requestId },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
