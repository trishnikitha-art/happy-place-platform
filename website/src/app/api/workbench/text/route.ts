import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { deployedTextCatalog, readGitTextCatalog, readTextTransaction, STAGE_TEXT_SCRIPT } from '@/lib/text-authority';
import { TEXT_FIELDS, decodeTextMutation, type TextKey } from '@/lib/text-contract';
import { getRedisClient } from '@/lib/deployment-transaction';
import { getKvNamespace } from '@/lib/environment';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!await workbenchSession.isAuthenticated()) return NextResponse.json({error:'Unauthorized'}, {status:401});
  try {
    const id = new URL(request.url).searchParams.get('transactionId');
    let pending: string[] = [];
    if (!id) {
      const redis = getRedisClient();
      const keys = await redis.keys(`${getKvNamespace()}deployment-transaction:*`);
      for (const key of keys) {
        const record = await redis.get(key) as { state?: string; transactionId?: string; files?: string[] } | null;
        if (record?.files?.includes('strings.v1.json') && ['prepared','failed'].includes(record.state ?? '') && record.transactionId) pending.push(record.transactionId);
      }
    }
    return NextResponse.json(id ? await readTextTransaction(id) : { current: await readGitTextCatalog(), deployed: deployedTextCatalog(), registry: TEXT_FIELDS, pending }, {headers:{'Cache-Control':'no-store'}});
  } catch (e) { return NextResponse.json({error:e instanceof Error ? e.message : 'Text authority unavailable'}, {status:503}); }
}
export async function POST(request: Request) {
  if (!await workbenchSession.isAuthenticated()) return NextResponse.json({error:'Unauthorized'}, {status:401});
  try {
    const body = await request.json();
    const m = decodeTextMutation(body.mutation);
    const id = body.transactionId;
    if (typeof id !== 'string' || !/^WBDEP-\d+-[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid receipt ID');
    const current = await readGitTextCatalog();
    const field = current.fields[m.key as TextKey];
    if (field.revision !== m.expectedRevision || field.value !== m.previousValue) return NextResponse.json({error:'TEXT_REVISION_CONFLICT: reload current text'}, {status:409});
    const key = `${getKvNamespace()}workbench-staging:${id}:text:${m.key}`;
    const record = { transactionId:id, state:'prepared', stagingKeys:[key], files:['strings.v1.json'], textMutation:m, reason:`Text: ${TEXT_FIELDS[m.key].label}`, createdAt:new Date().toISOString() };
    await getRedisClient().eval(STAGE_TEXT_SCRIPT, [`${getKvNamespace()}deployment-transaction:${id}`,key], [JSON.stringify(record),JSON.stringify(m)]);
    const receipt = await readTextTransaction(id);
    return NextResponse.json({ ...receipt, status:'STAGED', published:false });
  } catch (e) { return NextResponse.json({error:e instanceof Error ? e.message : 'Could not stage text'}, {status:400}); }
}
