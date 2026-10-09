import { Redis } from '@upstash/redis';
import { CANCEL_TEXT_SCRIPT, RECONCILE_TEXT_SCRIPT } from '../text-lifecycle';
import { STAGE_TEXT_SCRIPT } from '../text-authority';
import { claimBatchDeploymentTransactions } from '../deployment-transaction';
const enabled=process.env.TEXT_REDIS_TESTS_ENABLED==='true';
(enabled?describe:describe.skip)('text lifecycle on isolated real Redis',()=> {
  let redis: Redis;let prefix: string;
  const id='WBDEP-1791550000000-12345678-1234-1234-1234-123456789abc';
  const mutation={schema:'text.v1',key:'homepage.hero.title',previousValue:'Home.',expectedRevision:0,value:'Home!'};
  const tx=()=>({transactionId:id,state:'prepared',principalId:'test-principal',stagingKeys:[`${prefix}workbench-staging:${id}:text:homepage.hero.title`],files:['strings.v1.json'],textMutation:mutation,createdAt:'2026-10-09'});
  const keys=()=>[`${prefix}deployment-transaction:${id}`,tx().stagingKeys[0]];
  beforeAll(async()=> {
    const url=process.env.KV_REST_API_URL;
    if(!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw new Error('Text integration tests require isolated loopback Redis');
    redis=new Redis({url,token:process.env.KV_REST_API_TOKEN!});
    expect(await redis.ping()).toBe('PONG');
  });
  beforeEach(async()=> {prefix=`hpp:text-isolated:${crypto.randomUUID()}:`;process.env.TEST_NAMESPACE=prefix;await redis.eval(STAGE_TEXT_SCRIPT,keys(),[JSON.stringify(tx()),JSON.stringify(mutation)]);});
  afterEach(async()=> {const owned=await redis.keys(`${prefix}*`);if(owned.length) await redis.del(...owned);delete process.env.TEST_NAMESPACE;});
  it('cancels atomically, keeps an audit tombstone, and refuses resurrection',async()=> {
    expect(await redis.eval(CANCEL_TEXT_SCRIPT,keys(),[id,'test-principal','now'])).toEqual(['OK']);
    expect((await redis.get<any>(keys()[0])).state).toBe('cancelled');expect(await redis.get(keys()[1])).toBeNull();
    await expect(redis.eval(STAGE_TEXT_SCRIPT,keys(),[JSON.stringify(tx()),JSON.stringify(mutation)])).rejects.toThrow('TEXT_RECEIPT_CONFLICT');
    expect(await redis.eval(CANCEL_TEXT_SCRIPT,keys(),[id,'test-principal','later'])).toEqual(['OK']);
  });
  it('refuses a different principal without removing staging',async()=> {
    expect(await redis.eval(CANCEL_TEXT_SCRIPT,keys(),[id,'other-principal','now'])).toEqual(['ERR','FORBIDDEN']);
    expect(await redis.get(keys()[1])).not.toBeNull();
  });
  it('allows exactly one of cancellation and the real coordinator claim',async()=> {
    const results=await Promise.allSettled([redis.eval(CANCEL_TEXT_SCRIPT,keys(),[id,'test-principal','now']),claimBatchDeploymentTransactions([id],'claim-owner')]);
    const record=await redis.get<any>(keys()[0]);
    if(record.state==='cancelled') {expect(results[1].status).toBe('rejected');expect(await redis.get(keys()[1])).toBeNull();}
    else {expect(record.state).toBe('committing');expect(results[0]).toMatchObject({status:'fulfilled',value:['ERR','COMMIT_BOUNDARY']});expect(await redis.get(keys()[1])).not.toBeNull();}
  });
  it.each(['committing','committed','failed'])('retains data after the Git boundary in %s',async state=> {
    await redis.set(keys()[0],{...tx(),state,commitSha:'a'.repeat(40),owner:'claim-owner'});
    expect(await redis.eval(CANCEL_TEXT_SCRIPT,keys(),[id,'test-principal','now'])).toEqual(['ERR','COMMIT_BOUNDARY']);
    expect(await redis.get(keys()[1])).not.toBeNull();
  });
  it.each(['committing','committed','failed'])('reconciles a verified retained receipt from %s without another Git write',async state=> {
    const snapshot={...tx(),state,commitSha:'a'.repeat(40),owner:'claim-owner'};await redis.set(keys()[0],snapshot);
    expect(await redis.eval(RECONCILE_TEXT_SCRIPT,keys(),[id,'test-principal',JSON.stringify(snapshot),'now',snapshot.commitSha])).toEqual(['OK']);
    expect((await redis.get<any>(keys()[0])).state).toBe('consumed');expect(await redis.get(keys()[1])).toBeNull();
  });
  it('rejects a changed owner/state snapshot without consuming staging',async()=> {
    const snapshot={...tx(),state:'committing',owner:'old-owner',commitSha:'a'.repeat(40)};
    await redis.set(keys()[0],{...snapshot,owner:'new-owner'});
    expect(await redis.eval(RECONCILE_TEXT_SCRIPT,keys(),[id,'test-principal',JSON.stringify(snapshot),'now',snapshot.commitSha])).toEqual(['ERR','STATE_CHANGED']);
    expect(await redis.get(keys()[1])).not.toBeNull();
  });
});
