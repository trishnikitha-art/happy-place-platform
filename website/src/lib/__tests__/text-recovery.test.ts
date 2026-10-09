jest.mock('../deployment-transaction',()=>({getDeploymentTransaction:jest.fn(),getRedisClient:jest.fn()}));
jest.mock('../text-authority',()=>({readTextTransaction:jest.fn()}));
import { getDeploymentTransaction,getRedisClient } from '../deployment-transaction';
import { readTextTransaction } from '../text-authority';
import { changeTextLifecycle } from '../text-recovery';
import { RECONCILE_TEXT_SCRIPT } from '../text-lifecycle';
const id='WBDEP-1791550000000-12345678-1234-1234-1234-123456789abc';
const sha='a'.repeat(40), parent='b'.repeat(40);
const m={schema:'text.v1' as const,key:'homepage.hero.title' as const,value:'Home!',previousValue:'Home.',expectedRevision:0};
const tx={transactionId:id,state:'committing' as const,principalId:'test-principal',owner:'claim-owner',commitSha:sha,stagingKeys:[`hpp:test:workbench-staging:${id}:text:${m.key}`],files:['strings.v1.json'],textMutation:m,createdAt:'2026-10-09'};
let evalFn: jest.Mock, fetchFn: jest.Mock;
let reachable=true, value='Home!', semanticMediaChange=false, history=true;
const originalFetch=global.fetch, initialPrincipal=process.env.HPP_WORKBENCH_PRINCIPAL_ID;
const initialToken=process.env.GITHUB_TOKEN;
beforeEach(()=> {
  jest.clearAllMocks();process.env.HPP_WORKBENCH_PRINCIPAL_ID='test-principal';
  reachable=true;value='Home!';semanticMediaChange=false;history=true;
  jest.mocked(getDeploymentTransaction).mockResolvedValue(tx);
  jest.mocked(readTextTransaction).mockResolvedValue({transactionId:id,state:'committing',mutation:m,commitSha:sha,lastTransition:'2026-10-09',error:undefined,stagingVerified:true,recoverable:true});
  evalFn=jest.fn().mockResolvedValue(['OK']);jest.mocked(getRedisClient).mockReturnValue({eval:evalFn} as never);
  fetchFn=jest.fn(async(url:string)=> {
    let data:unknown;
    if(url.includes('/compare/')) data={merge_base_commit:{sha:reachable?sha:parent}};
    else if(url.includes('commits?')) data=history?[{sha,commit:{message:`Transaction ID: ${id}`}}]:[];
    else if(url.includes('/commits/')) data={sha,parents:[{sha:parent}],commit:{message:`Transaction ID: ${id}`},files:[{filename:'website/src/config/strings.v1.json'},{filename:'website/src/config/brand.v1.json'}]};
    else if(url.includes('strings.v1.json')) data={content:Buffer.from(JSON.stringify({version:1,locale:'en',fields:{[m.key]:{value,revision:1}}})).toString('base64')};
    else data={content:Buffer.from(JSON.stringify({metadata:{generatedAt:url.includes(parent)?'old':'new'},hero:semanticMediaChange && url.includes(sha)?'changed':'unchanged'})).toString('base64')};
    return new Response(JSON.stringify(data),{status:200});
  });global.fetch=fetchFn;
  process.env.GITHUB_TOKEN='isolated-unit-fixture';
});
afterEach(()=> {global.fetch=originalFetch;if(initialToken===undefined) delete process.env.GITHUB_TOKEN;else process.env.GITHUB_TOKEN=initialToken;if(initialPrincipal===undefined) delete process.env.HPP_WORKBENCH_PRINCIPAL_ID;else process.env.HPP_WORKBENCH_PRINCIPAL_ID=initialPrincipal;});
it('proves reachability and text before consuming a retained receipt; performs no Git mutation',async()=> {
  await changeTextLifecycle(id,'reconcile');
  expect(evalFn.mock.calls[0][0]).toBe(RECONCILE_TEXT_SCRIPT);
  expect(evalFn.mock.calls[0][2][4]).toBe(sha);
  expect(fetchFn.mock.calls.every(([,options])=>!options.method || options.method==='GET')).toBe(true);
});
it.each(['unreachable','different copy','media mutation'])('retains staging when proof fails: %s',async failure=> {
  if(failure==='unreachable') reachable=false;if(failure==='different copy') value='Other';if(failure==='media mutation') semanticMediaChange=true;
  await expect(changeTextLifecycle(id,'reconcile')).rejects.toMatchObject({status:409});
  expect(evalFn).not.toHaveBeenCalled();
});
it('discovers a lost SHA only from a positive reachable transaction receipt',async()=> {
  jest.mocked(getDeploymentTransaction).mockResolvedValue({...tx,commitSha:undefined});
  await changeTextLifecycle(id,'reconcile');expect(evalFn.mock.calls[0][2][4]).toBe(sha);
});
it('never resets an uncertain claim when bounded Git history has no receipt',async()=> {
  jest.mocked(getDeploymentTransaction).mockResolvedValue({...tx,commitSha:undefined});history=false;
  await expect(changeTextLifecycle(id,'reconcile')).rejects.toMatchObject({code:'GIT_RECEIPT_NOT_FOUND'});expect(evalFn).not.toHaveBeenCalled();
});
