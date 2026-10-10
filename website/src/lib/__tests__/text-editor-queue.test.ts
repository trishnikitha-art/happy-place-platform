import { isEligibleTextReceipt, isTerminalTextReceipt, prepareTextBatch, type TextQueueReceipt } from '../text-editor-queue';
import type { TextMutation } from '../text-contract';

const mutation: TextMutation = {schema:'text.v1',key:'homepage.hero.title',previousValue:'Home.',value:'Home!',expectedRevision:0};
const first: TextQueueReceipt = {transactionId:'first',state:'prepared',mutation,stagingVerified:true};
const second: TextQueueReceipt = {...first,transactionId:'second',mutation:{...mutation,key:'homepage.hero.description'}};

it.each(['consumed','cancelled'])('recognizes %s as terminal',state => {
  expect(isTerminalTextReceipt({...first,state})).toBe(true);
  expect(isEligibleTextReceipt({...first,state})).toBe(false);
});
it.each(['prepared','failed'])('allows an intact %s receipt without a Git commit',state => {
  expect(isEligibleTextReceipt({...first,state})).toBe(true);
  expect(isTerminalTextReceipt({...first,state})).toBe(false);
});
it.each([
  {state:'committing'}, {state:'committed'}, {state:'unknown'}, {commitSha:'a'.repeat(40)},
  {stagingVerified:false}, {stagingVerified:undefined}, {mutation:null},
])('blocks ineligible receipt %j',change => expect(isEligibleTextReceipt({...first,...change})).toBe(false));

it('approves distinct fields from exact fresh receipts in reviewed order',() => {
  const result = prepareTextBatch([first,second],[second,first]);
  expect(result).toEqual({transactionIds:['first','second'],textApprovals:[{transactionId:'first',mutation:first.mutation},{transactionId:'second',mutation:second.mutation}]});
  expect(result.textApprovals[0].mutation).not.toBe(first.mutation);
});
it.each([
  [first], [first,{...second,state:'committing'}], [first,{...second,commitSha:'a'.repeat(40)}],
  [first,{...second,stagingVerified:false}], [first,{...second,transactionId:'unknown'}], [first,first],
])('returns no partial approval set when any fresh receipt is unresolved or absent',fresh => {
  expect(() => prepareTextBatch([first,second],fresh)).toThrow();
});
it.each(['value','previousValue','expectedRevision','key'] as const)('rejects a changed fresh %s',field => {
  const changed = {...second,mutation:{...second.mutation!,[field]:field==='expectedRevision'?1:field==='key'?'homepage.hero.primaryAction':'Other'}} as TextQueueReceipt;
  expect(() => prepareTextBatch([first,second],[first,changed])).toThrow('differs from review');
});
it('rejects duplicate fields and duplicate reviewed receipt IDs',() => {
  const sameField = {...second,mutation};
  expect(() => prepareTextBatch([first,sameField],[first,sameField])).toThrow('one receipt');
  expect(() => prepareTextBatch([first,first],[first,second])).toThrow('one receipt');
});
it('rejects empty batches and stale reviewed eligibility',() => {
  expect(() => prepareTextBatch([],[])).toThrow();
  expect(() => prepareTextBatch([{...first,state:'consumed'}],[first])).toThrow();
});
