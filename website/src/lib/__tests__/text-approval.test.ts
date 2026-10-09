import { approvedTextMutation } from '../text-approval';
const id='WBDEP-1791550000000-12345678-1234-1234-1234-123456789abc';
const mutation={schema:'text.v1',key:'homepage.hero.title',previousValue:'Home.',value:'Home!',expectedRevision:0};
it('accepts exactly the reviewed immutable proposal',()=> {
  expect(approvedTextMutation([{transactionId:id,mutation}],id,mutation)).toEqual(mutation);
});
it.each(['value','previousValue','expectedRevision','key'])('rejects a different reviewed %s before claiming',field=> {
  const other={...mutation,[field]:field==='expectedRevision'?1:field==='key'?'homepage.hero.description':'Other'};
  expect(()=>approvedTextMutation([{transactionId:id,mutation:other}],id,mutation)).toThrow('TEXT_APPROVAL_MISMATCH');
});
it.each([undefined,[],[{transactionId:'other',mutation}],[{transactionId:id,mutation},{transactionId:id,mutation}]])('requires one explicit approval for this receipt',approvals=> {
  expect(()=>approvedTextMutation(approvals,id,mutation)).toThrow('TEXT_APPROVAL_REQUIRED');
});
it('rejects staging substitution after claim',()=> {
  expect(()=>approvedTextMutation([{transactionId:id,mutation}],id,{...mutation,value:'Substituted'})).toThrow('TEXT_APPROVAL_MISMATCH');
});
