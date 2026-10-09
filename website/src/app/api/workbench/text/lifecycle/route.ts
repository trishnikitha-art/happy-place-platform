import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { changeTextLifecycle } from '@/lib/text-recovery';
import { textFailure } from '@/lib/text-api-errors';
import { TextError, validateTextId, textDependency } from '@/lib/text-errors';
export const runtime='nodejs';
export async function POST(request: Request) {
  const correlationId=crypto.randomUUID();let transactionId: string|undefined;
  try {
    if(!await workbenchSession.isAuthenticated()) throw new TextError(401,'Unauthorized');
    let body;try {body=await request.json();} catch {throw new TextError(400,'INVALID_JSON');}
    validateTextId(body?.transactionId);transactionId=body.transactionId;
    if(!['cancel','reconcile'].includes(body.action)) throw new TextError(400,'INVALID_ACTION');
    const receipt=await textDependency(()=>changeTextLifecycle(transactionId!,body.action));
    return NextResponse.json({...receipt,correlationId},{headers:{'Cache-Control':'no-store'}});
  } catch(e) {return textFailure(e,correlationId,transactionId);}
}
