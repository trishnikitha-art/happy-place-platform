jest.mock('@/lib/workbench-session',()=>({workbenchSession:{isAuthenticated:jest.fn().mockResolvedValue(true)}}));
jest.mock('@/lib/deployment-transaction',()=>({
  ...jest.requireActual('../deployment-transaction'),
  getDeploymentTransaction:jest.fn(),claimBatchDeploymentTransactions:jest.fn(),
  setBatchGitCommitSha:jest.fn(),failDeploymentTransaction:jest.fn(),
  promoteBatchDeployment:jest.fn(),consumeBatchDeploymentTransactions:jest.fn(),
}));
import { POST } from '@/app/api/admin/deploy/route';
import { getDeploymentTransaction,claimBatchDeploymentTransactions,setBatchGitCommitSha,failDeploymentTransaction,promoteBatchDeployment,consumeBatchDeploymentTransactions } from '../deployment-transaction';
const id='WBDEP-1791550000000-12345678-1234-1234-1234-123456789abc';
const base='a'.repeat(40), competing='b'.repeat(40), proposed='c'.repeat(40);
const mutation={schema:'text.v1',key:'homepage.hero.title',previousValue:'Home.',value:'Home!',expectedRevision:0};
const tx={transactionId:id,state:'prepared',files:['strings.v1.json'],stagingKeys:[`hpp:test:workbench-staging:${id}:text:${mutation.key}`],textMutation:mutation,principalId:'test-principal',createdAt:'now'};
const originalFetch=global.fetch;
const variables=['GITHUB_TOKEN','HPP_WORKBENCH_PRINCIPAL_ID','KV_REST_API_URL','KV_REST_API_TOKEN'];
const initial=Object.fromEntries(variables.map(key=>[key,process.env[key]]));
let movedBeforeCheck:boolean, refReads:number, fetchMock:jest.Mock;
beforeEach(()=> {
  jest.clearAllMocks();refReads=0;movedBeforeCheck=true;
  process.env.GITHUB_TOKEN='isolated-fixture';process.env.HPP_WORKBENCH_PRINCIPAL_ID='test-principal';
  // Exercise the actual coordinator's Git barrier using local authority fixtures;
  // Redis mutations are observed mocks, never a production connection.
  delete process.env.KV_REST_API_URL;delete process.env.KV_REST_API_TOKEN;
  jest.mocked(getDeploymentTransaction).mockResolvedValue(tx as never);
  jest.mocked(claimBatchDeploymentTransactions).mockImplementation(async(_,owner)=>[{...tx,state:'committing',owner}] as never);
  jest.mocked(setBatchGitCommitSha).mockResolvedValue([{...tx,state:'committing',commitSha:proposed}] as never);
  fetchMock=jest.fn(async(url:string,options:RequestInit={})=> {
    let data:unknown={sha:'d'.repeat(40)};
    if(url.endsWith('/git/refs/heads/main')) {
      if(options.method==='PATCH') return new Response('non-fast-forward',{status:422});
      refReads++;data={object:{sha:refReads===1 || !movedBeforeCheck?base:competing}};
    } else if(url.endsWith(`/git/commits/${base}`)) data={tree:{sha:'d'.repeat(40)}};
    else if(url.endsWith('/git/commits') && options.method==='POST') data={sha:proposed,html_url:'https://github.com/example/commit/'+proposed};
    return new Response(JSON.stringify(data),{status:200});
  });global.fetch=fetchMock;
});
afterEach(()=> {global.fetch=originalFetch;for(const key of variables) if(initial[key]===undefined) delete process.env[key];else process.env[key]=initial[key];});
function request(approved=true) {return new Request('https://site/api/admin/deploy',{method:'POST',body:JSON.stringify({transactionIds:[id],...(approved?{textApprovals:[{transactionId:id,mutation}]}:{})})});}
it('rejects main moving after claim and preserves the orphan commit receipt without promotion',async()=> {
  const response=await POST(request());const body=await response.json();
  expect(response.status).toBe(409);expect(body.details).toMatchObject({expectedParent:base,actualParent:competing,casViolation:true});
  expect(setBatchGitCommitSha).toHaveBeenCalledWith([id],proposed,expect.any(String),expect.any(String));
  expect(fetchMock.mock.calls.some(([,options])=>options.method==='PATCH')).toBe(false);
  expect(failDeploymentTransaction).toHaveBeenCalled();
  expect(promoteBatchDeployment).not.toHaveBeenCalled();expect(consumeBatchDeploymentTransactions).not.toHaveBeenCalled();
});
it('uses non-force ref update when another deployment wins after the final read',async()=> {
  movedBeforeCheck=false;const response=await POST(request());
  expect(response.status).toBe(409);
  const patch=fetchMock.mock.calls.find(([,options])=>options.method==='PATCH');
  expect(JSON.parse(patch![1].body)).toEqual({sha:proposed,force:false});
  expect(promoteBatchDeployment).not.toHaveBeenCalled();expect(consumeBatchDeploymentTransactions).not.toHaveBeenCalled();
});
it('does not claim or write Git without approval of the immutable text receipt',async()=> {
  expect((await POST(request(false))).status).toBe(400);
  expect(claimBatchDeploymentTransactions).not.toHaveBeenCalled();
  expect(fetchMock.mock.calls.some(([,options])=>options.method==='POST')).toBe(false);
});
