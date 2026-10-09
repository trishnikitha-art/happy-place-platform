import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { readContentReceipt } from '@/lib/content-authority';
import { getRedisClient } from '@/lib/deployment-transaction';
import { getKvNamespace } from '@/lib/environment';
import { CANCEL_TEXT_SCRIPT } from '@/lib/text-lifecycle';
import { TextError,textPrincipal,validateTextId,textDependency,scriptResult } from '@/lib/text-errors';
import { textFailure } from '@/lib/text-api-errors';
export async function POST(request:Request) {
  const correlationId=crypto.randomUUID();let transactionId:string|undefined;
  try {
    if(!await workbenchSession.isAuthenticated()) throw new TextError(401,'Unauthorized');
    let body;try {body=await request.json();} catch {throw new TextError(400,'INVALID_JSON');}
    validateTextId(body?.transactionId);transactionId=body.transactionId;
    const receipt=await textDependency(()=>readContentReceipt(transactionId!));
    scriptResult(await textDependency(()=>getRedisClient().eval(CANCEL_TEXT_SCRIPT,[`${getKvNamespace()}deployment-transaction:${transactionId}`,`${getKvNamespace()}workbench-staging:${transactionId}:content:${receipt.mutation.collection}`],[transactionId!,textPrincipal(),new Date().toISOString()])));
    return NextResponse.json({...await textDependency(()=>readContentReceipt(transactionId!)),correlationId},{headers:{'Cache-Control':'no-store'}});
  } catch(e) {return textFailure(e,correlationId,transactionId);}
}
