import { applyTextMutation, decodeTextCatalog, decodeTextMutation, validateText, sameTextMutation, TEXT_FIELDS, type TextKey, type TextCatalog } from '../text-contract';
import catalog from '@/config/strings.v1.json';
import { HOMEPAGE } from '../strings';
const original = 'Your favorite part of coming home should be the home itself.';
const base = (): TextCatalog => ({version:1,locale:'en',fields:{...structuredClone(catalog.fields),'homepage.hero.title':{value:original,revision:0}}});
const mutation = () => ({ schema:'text.v1' as const, key:'homepage.hero.title' as const, previousValue:original, expectedRevision:0, value:'Your favorite part of coming home should be the home itself!' });
it('reads the headline from the canonical JSON authority',()=> {
  expect(HOMEPAGE.hero.title).toBe(decodeTextCatalog(catalog).fields['homepage.hero.title'].value);
});
it('changes only the explicit field and increments its revision',()=> {
  const c=base(); applyTextMutation(c,mutation());
  expect(c.fields['homepage.hero.title']).toEqual({value:mutation().value,revision:1});
  expect(c.locale).toBe('en');
});
it('rejects a second edit from a stale baseline instead of overwriting',()=> {
  const c=base(); applyTextMutation(c,mutation());
  expect(()=>applyTextMutation(c,mutation())).toThrow('TEXT_REVISION_CONFLICT');
});
it('rejects another editor proposing different copy from the same revision',()=> {
  const c=base();const second={...mutation(),value:'A second editor changed this'};
  applyTextMutation(c,mutation());
  expect(()=>applyTextMutation(c,second)).toThrow('TEXT_REVISION_CONFLICT');
  expect(c.fields['homepage.hero.title'].value).toBe(mutation().value);
});
it('rejects a changed previous value even with the same revision',()=> {
  const c=base(); c.fields['homepage.hero.title'].value='Another edit';
  expect(()=>applyTextMutation(c,mutation())).toThrow('TEXT_REVISION_CONFLICT');
});
it('applies distinct approved text fields to one catalog while retaining independent revisions',()=> {
  const c=base();const before=structuredClone(c);
  const description=c.fields['homepage.hero.description'];
  const second={schema:'text.v1' as const,key:'homepage.hero.description' as const,previousValue:description.value,expectedRevision:description.revision,value:'A reviewed introduction.'};
  applyTextMutation(c,mutation());applyTextMutation(c,second);
  expect(c.fields['homepage.hero.title']).toEqual({value:mutation().value,revision:1});
  expect(c.fields['homepage.hero.description']).toEqual({value:second.value,revision:description.revision+1});
  for(const key of Object.keys(TEXT_FIELDS) as TextKey[]) if(key!==mutation().key && key!==second.key) expect(c.fields[key]).toEqual(before.fields[key]);
});
it.each(['nav.href','__proto__','homepage.hero.unknown'])('does not edit locked/unknown key %s',key=>expect(()=>validateText(key,'New text')).toThrow());
it.each(['','  ','<script>alert(1)</script>','hello\nworld','x'.repeat(181),'Hello {name}'])('rejects invalid values %j',value=>expect(()=>decodeTextMutation({...mutation(),value})).toThrow());
it('rejects missing keys and unsupported schema versions',()=> {
  expect(()=>decodeTextCatalog({...catalog,fields:{}})).toThrow();
  expect(()=>decodeTextMutation({...mutation(),schema:'assignment'})).toThrow();
});
it('does not accept unchanged text as a queue mutation',()=>expect(()=>decodeTextMutation({...mutation(),value:mutation().previousValue})).toThrow());
it('checks receipt content independently of Redis JSON property order',()=> {
  const m=mutation(); const reordered={value:m.value,expectedRevision:m.expectedRevision,previousValue:m.previousValue,key:m.key,schema:m.schema};
  expect(sameTextMutation(m,reordered)).toBe(true);
  expect(sameTextMutation(m,{...reordered,value:'Tampered value'})).toBe(false);
});
it.each(Object.keys(TEXT_FIELDS) as TextKey[])('updates %s without changing any other registered field',key=> {
  const c=base(); const before=structuredClone(c);
  const field=c.fields[key];
  applyTextMutation(c,{schema:'text.v1',key,previousValue:field.value,expectedRevision:field.revision,value:'Reviewed copy'});
  expect(c.fields[key]).toEqual({value:'Reviewed copy',revision:field.revision+1});
  for(const other of Object.keys(TEXT_FIELDS) as TextKey[]) if(other!==key) expect(c.fields[other]).toEqual(before.fields[other]);
});

jest.mock('@/lib/workbench-session',()=>({workbenchSession:{isAuthenticated:jest.fn()}}));
jest.mock('@/lib/text-authority',()=>({readGitTextCatalog:jest.fn(),deployedTextCatalog:()=>catalog,readTextTransaction:jest.fn(),listTextTransactions:jest.fn().mockResolvedValue([]),STAGE_TEXT_SCRIPT:'stage-script'}));
jest.mock('@/lib/deployment-transaction',()=>({getRedisClient:jest.fn()}));
import { workbenchSession } from '../workbench-session';
import { readGitTextCatalog,readTextTransaction } from '../text-authority';
import { getRedisClient } from '../deployment-transaction';
import { GET,POST } from '@/app/api/workbench/text/route';
const id='WBDEP-1791549000000-12345678-1234-1234-1234-123456789abc';
const initialPrincipal=process.env.HPP_WORKBENCH_PRINCIPAL_ID;
beforeEach(()=>{process.env.HPP_WORKBENCH_PRINCIPAL_ID='test-principal';jest.clearAllMocks();jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);jest.mocked(readGitTextCatalog).mockResolvedValue(base());});
afterEach(()=>{if(initialPrincipal===undefined) delete process.env.HPP_WORKBENCH_PRINCIPAL_ID;else process.env.HPP_WORKBENCH_PRINCIPAL_ID=initialPrincipal;});
it('requires server-side authentication for reads and staging',async()=> {
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
  expect((await GET(new Request('https://site/api/workbench/text'))).status).toBe(401);
  expect((await POST(new Request('https://site/api/workbench/text',{method:'POST',body:'{}'}))).status).toBe(401);
  expect(readGitTextCatalog).not.toHaveBeenCalled();
});
it('rejects a stale editor baseline without writing Redis',async()=> {
  const c=base();c.fields['homepage.hero.title'].revision=1;jest.mocked(readGitTextCatalog).mockResolvedValue(c);
  const response=await POST(new Request('https://site/api/workbench/text',{method:'POST',body:JSON.stringify({transactionId:id,mutation:mutation()})}));
  expect(response.status).toBe(409);expect(getRedisClient).not.toHaveBeenCalled();
});
it('does not classify a Git dependency outage as invalid input',async()=> {
  jest.mocked(readGitTextCatalog).mockRejectedValue(new Error('Git unavailable'));
  const response=await POST(new Request('https://site/api/workbench/text',{method:'POST',body:JSON.stringify({transactionId:id,mutation:mutation()})}));
  expect(response.status).toBe(503);
  expect((await response.json()).transactionId).toBe(id);
  expect(getRedisClient).not.toHaveBeenCalled();
});
it('atomically stages a text-specific receipt and verifies it by readback',async()=> {
  const evalFn=jest.fn().mockResolvedValue({});jest.mocked(getRedisClient).mockReturnValue({eval:evalFn} as never);
  jest.mocked(readTextTransaction).mockResolvedValue({transactionId:id,state:'prepared',mutation:mutation(),lastTransition:'2026-10-09',stagingVerified:true,recoverable:true,error:undefined,commitSha:undefined});
  const response=await POST(new Request('https://site/api/workbench/text',{method:'POST',body:JSON.stringify({transactionId:id,mutation:mutation()})}));
  expect(response.status).toBe(200);expect((await response.json()).published).toBe(false);
  expect(evalFn.mock.calls[0][1][1]).toContain(`:text:homepage.hero.title`);
  expect(JSON.parse(evalFn.mock.calls[0][2][0]).textMutation).toEqual(mutation());
  expect(readTextTransaction).toHaveBeenCalledWith(id);
});
