import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { contentSnapshot,applyContentMutation,decodeContentMutation,type ContentCollection } from '@/lib/content-contract';
import { readGitContent,deployedContent,readContentReceipt,listContentReceipts } from '@/lib/content-authority';
import { getRedisClient } from '@/lib/deployment-transaction';
import { getKvNamespace } from '@/lib/environment';
import { STAGE_TEXT_SCRIPT } from '@/lib/text-authority';
import { TextError,textPrincipal,validateTextId,textDependency } from '@/lib/text-errors';
import { textFailure } from '@/lib/text-api-errors';
export const runtime='nodejs';
export async function GET(request:Request) {
  const correlationId=crypto.randomUUID();
  try {
    if(!await workbenchSession.isAuthenticated()) throw new TextError(401,'Unauthorized');
    const query=new URL(request.url).searchParams;
    if(query.has('transactionId')) return NextResponse.json(await textDependency(()=>readContentReceipt(query.get('transactionId')!)),{headers:{'Cache-Control':'no-store'}});
    const collection=query.get('collection') as ContentCollection;
    if(!['projects','services'].includes(collection)) throw new TextError(400,'INVALID_CONTENT_COLLECTION');
    const current=await textDependency(()=>readGitContent(collection));
    contentSnapshot(current,collection);
    return NextResponse.json({current,deployed:deployedContent(collection),transactions:await textDependency(()=>listContentReceipts(collection)),served:{commitSha:process.env.VERCEL_GIT_COMMIT_SHA||null,deploymentId:process.env.VERCEL_DEPLOYMENT_ID||null}},{headers:{'Cache-Control':'no-store'}});
  } catch(e) {return textFailure(e,correlationId);}
}
export async function POST(request:Request) {
  const correlationId=crypto.randomUUID();let transactionId:string|undefined;
  try {
    if(!await workbenchSession.isAuthenticated()) throw new TextError(401,'Unauthorized');
    let body;try {body=await request.json();} catch {throw new TextError(400,'INVALID_JSON');}
    validateTextId(body?.transactionId);transactionId=body.transactionId;
    let mutation;try {mutation=decodeContentMutation(body.mutation);} catch {throw new TextError(400,'INVALID_CONTENT_MUTATION');}
    const current=await textDependency(()=>readGitContent(mutation.collection));
    try {applyContentMutation(structuredClone(current),mutation);} catch {throw new TextError(409,'CONTENT_REVISION_CONFLICT');}
    const principalId=textPrincipal();const key=`${getKvNamespace()}workbench-staging:${transactionId}:content:${mutation.collection}`;
    const record={transactionId,state:'prepared',principalId,stagingKeys:[key],files:[`${mutation.collection}.v1.json`],contentMutation:mutation,reason:`${mutation.collection}: visibility/order`,createdAt:new Date().toISOString()};
    await textDependency(async()=>{
      try {await getRedisClient().eval(STAGE_TEXT_SCRIPT,[`${getKvNamespace()}deployment-transaction:${transactionId}`,key],[JSON.stringify(record),JSON.stringify(mutation)]);}
      catch(e) {if(e instanceof Error && /TEXT_RECEIPT_CONFLICT|TEXT_ORPHAN_STAGING/.test(e.message)) throw new TextError(409,'CONTENT_RECEIPT_CONFLICT');throw e;}
    });
    const receipt=await textDependency(()=>readContentReceipt(transactionId!));
    if(!receipt.stagingVerified) throw new TextError(409,'CONTENT_STAGING_MISSING');
    return NextResponse.json({...receipt,published:false,correlationId},{headers:{'Cache-Control':'no-store'}});
  } catch(e) {return textFailure(e,correlationId,transactionId);}
}
