import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { deployedTextCatalog, readGitTextCatalog, readTextTransaction, listTextTransactions, STAGE_TEXT_SCRIPT } from '@/lib/text-authority';
import { TEXT_FIELDS, decodeTextMutation } from '@/lib/text-contract';
import { getRedisClient } from '@/lib/deployment-transaction';
import { getKvNamespace } from '@/lib/environment';
import { TextError, textDependency, textPrincipal, validateTextId } from '@/lib/text-errors';
import { textFailure } from '@/lib/text-api-errors';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const correlationId=crypto.randomUUID();
  try {
    if(!await workbenchSession.isAuthenticated()) throw new TextError(401,'Unauthorized');
    const id=new URL(request.url).searchParams.get('transactionId');
    if(id) { validateTextId(id);return NextResponse.json(await textDependency(()=>readTextTransaction(id)),{headers:{'Cache-Control':'no-store'}}); }
    const transactions=await textDependency(listTextTransactions);
    return NextResponse.json({current:await textDependency(readGitTextCatalog),deployed:deployedTextCatalog(),served:{commitSha:process.env.VERCEL_GIT_COMMIT_SHA || null,deploymentId:process.env.VERCEL_DEPLOYMENT_ID || null},registry:TEXT_FIELDS,transactions,pending:transactions.filter(t=>t.recoverable).map(t=>t.transactionId)},{headers:{'Cache-Control':'no-store'}});
  } catch(e) { return textFailure(e,correlationId); }
}
export async function POST(request: Request) {
  const correlationId=crypto.randomUUID();let transactionId: string|undefined;
  try {
    if(!await workbenchSession.isAuthenticated()) throw new TextError(401,'Unauthorized');
    let body;
    try {body=await request.json();} catch {throw new TextError(400,'INVALID_JSON');}
    validateTextId(body?.transactionId);transactionId=body.transactionId;
    let m;
    try {m=decodeTextMutation(body.mutation);} catch {throw new TextError(400,'INVALID_TEXT_INPUT');}
    const current=await textDependency(readGitTextCatalog);
    const field=current.fields[m.key];
    if(field.revision!==m.expectedRevision || field.value!==m.previousValue) throw new TextError(409,'TEXT_REVISION_CONFLICT');
    const principalId=textPrincipal();
    const key=`${getKvNamespace()}workbench-staging:${transactionId}:text:${m.key}`;
    const record={transactionId,state:'prepared',principalId,stagingKeys:[key],files:['strings.v1.json'],textMutation:m,reason:`Text: ${TEXT_FIELDS[m.key].label}`,createdAt:new Date().toISOString()};
    await textDependency(async()=> {
      try {await getRedisClient().eval(STAGE_TEXT_SCRIPT,[`${getKvNamespace()}deployment-transaction:${transactionId}`,key],[JSON.stringify(record),JSON.stringify(m)]);}
      catch(e) {if(e instanceof Error && /TEXT_RECEIPT_CONFLICT|TEXT_ORPHAN_STAGING/.test(e.message)) throw new TextError(409,'TEXT_RECEIPT_CONFLICT');throw e;}
    });
    const receipt=await textDependency(()=>readTextTransaction(transactionId!));
    if(!receipt.stagingVerified) throw new TextError(409,'TEXT_STAGING_MISSING');
    return NextResponse.json({...receipt,status:'STAGED',published:false,correlationId});
  } catch(e) {return textFailure(e,correlationId,transactionId);}
}
