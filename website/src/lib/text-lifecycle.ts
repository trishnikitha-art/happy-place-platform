// These scripts operate only on a validated, single-field text transaction.
// Authorization principal is separate from the coordinator's claim owner token.
export const CANCEL_TEXT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'ERR','NOT_FOUND'} end
local tx = cjson.decode(raw)
if tx.transactionId ~= ARGV[1] or tx.principalId ~= ARGV[2] then return {'ERR','FORBIDDEN'} end
if tx.state == 'cancelled' then return {'OK'} end
if tx.commitSha or tx.owner or (tx.state ~= 'prepared' and tx.state ~= 'failed') then return {'ERR','COMMIT_BOUNDARY'} end
if #tx.stagingKeys ~= 1 or tx.stagingKeys[1] ~= KEYS[2] then return {'ERR','RECEIPT_CONFLICT'} end
tx.state = 'cancelled'
tx.cancelledAt = ARGV[3]
redis.call('SET', KEYS[1], cjson.encode(tx))
redis.call('DEL', KEYS[2])
return {'OK'}
`;

// The caller proves this exact Git receipt is reachable from main and that its
// text content matches the mutation. Snapshot CAS prevents concurrent lifecycle
// changes being overwritten. No Git writes or runtime media promotion occur here.
export const RECONCILE_TEXT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'ERR','NOT_FOUND'} end
local tx = cjson.decode(raw)
if tx.transactionId ~= ARGV[1] then return {'ERR','RECEIPT_CONFLICT'} end
if tx.principalId and tx.principalId ~= ARGV[2] then return {'ERR','FORBIDDEN'} end
if tx.state == 'consumed' and tx.commitSha == ARGV[5] then return {'OK'} end
local snapshot = cjson.decode(ARGV[3])
if tx.state ~= snapshot.state or tx.owner ~= snapshot.owner or tx.commitSha ~= snapshot.commitSha or tx.claimedAt ~= snapshot.claimedAt or tx.retryCount ~= snapshot.retryCount then return {'ERR','STATE_CHANGED'} end
for _, field in ipairs({'schema','key','value','previousValue','expectedRevision'}) do
  if tx.textMutation[field] ~= snapshot.textMutation[field] then return {'ERR','RECEIPT_CONFLICT'} end
end
if tx.state ~= 'committing' and tx.state ~= 'committed' and tx.state ~= 'failed' then return {'ERR','INVALID_STATE'} end
if tx.commitSha and tx.commitSha ~= ARGV[5] then return {'ERR','RECEIPT_CONFLICT'} end
if #tx.stagingKeys ~= 1 or tx.stagingKeys[1] ~= KEYS[2] then return {'ERR','RECEIPT_CONFLICT'} end
tx.commitSha = ARGV[5]
tx.state = 'consumed'
tx.reconciledAt = ARGV[4]
tx.consumedAt = ARGV[4]
tx.recoveredFailureReason = tx.failureReason
tx.failureReason = nil
redis.call('SET', KEYS[1], cjson.encode(tx))
redis.call('DEL', KEYS[2])
return {'OK'}
`;

export type DiffPiece = { kind: 'equal' | 'insert' | 'delete'; text: string };
export function textDiff(before: string, after: string): DiffPiece[] {
  const a=Array.from(before), b=Array.from(after);
  const table=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--) table[i][j]=a[i]===b[j]?table[i+1][j+1]+1:Math.max(table[i+1][j],table[i][j+1]);
  const out: DiffPiece[]=[];
  function push(kind: DiffPiece['kind'], text: string) { const last=out[out.length-1];if(last?.kind===kind) last.text+=text;else out.push({kind,text}); }
  let i=0,j=0;
  while(i<a.length || j<b.length) {
    if(i<a.length && j<b.length && a[i]===b[j]) {push('equal',a[i++]);j++;}
    else if(i<a.length && (j===b.length || table[i+1][j]>=table[i][j+1])) push('delete',a[i++]);
    else push('insert',b[j++]);
  }
  return out;
}
