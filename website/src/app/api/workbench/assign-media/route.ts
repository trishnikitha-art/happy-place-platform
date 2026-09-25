import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { assignMediaBatch } from '@/lib/assignment-store';
import { AssignmentBatchError, prepareAssignmentTargets } from '@/lib/workbench-assignment-contract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!await workbenchSession.isAuthenticated()) {
      return NextResponse.json({ error: 'WORKBENCH_AUTH_REQUIRED', requestId }, { status: 401 });
    }
    const body = await request.json();
    const targets = prepareAssignmentTargets(body);
    const result = await assignMediaBatch(body.mediaId, targets);
    return NextResponse.json({ ...result, requestId });
  } catch (error) {
    if (error instanceof AssignmentBatchError) {
      return NextResponse.json({
        error: error.code, message: error.message, committed: false, ...error.details, requestId,
      }, { status: error.status });
    }
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Invalid assignment request.', requestId }, { status: 400 });
    }
    console.error('[WORKBENCH_ASSIGNMENT]', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({
      error: 'ASSIGNMENT_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    }, { status: 503 });
  }
}
