import { getDeploymentTransaction, getRedisClient } from './deployment-transaction';
import { getKvNamespace } from './environment';
import { readTextTransaction } from './text-authority';
import { TEXT_AUTHORITY_PATH, decodeTextMutation } from './text-contract';
import { TextError, scriptResult, textPrincipal } from './text-errors';
import { CANCEL_TEXT_SCRIPT, RECONCILE_TEXT_SCRIPT } from './text-lifecycle';

async function git(path: string): Promise<any> {
  const token=process.env.GITHUB_TOKEN;
  if(!token) throw new TextError(503,'GIT_UNAVAILABLE');
  const repo=`${process.env.GITHUB_REPO_OWNER || 'trishnikitha-art'}/${process.env.GITHUB_REPO_NAME || 'happy-place-platform'}`;
  const r=await fetch(`https://api.github.com/repos/${repo}/${path}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},cache:'no-store'});
  if(!r.ok) throw new TextError(503,'GIT_UNAVAILABLE');
  return r.json();
}
async function file(path: string, sha: string) {
  const f=await git(`contents/${path}?ref=${sha}`);
  return JSON.parse(Buffer.from(f.content,'base64').toString('utf8'));
}
function withoutTimestamps(value: any): any {
  if(Array.isArray(value)) return value.map(withoutTimestamps);
  if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().filter(k=>k!=='generatedAt').map(k=>[k,withoutTimestamps(value[k])]));
  return value;
}
export async function changeTextLifecycle(id: string, action: 'cancel'|'reconcile') {
  const receipt=await readTextTransaction(id);
  const tx=await getDeploymentTransaction(id);
  if(!tx) throw new TextError(404,'TEXT_NOT_FOUND');
  const mutation=decodeTextMutation((tx as typeof tx & {textMutation?:unknown}).textMutation);
  const keys=[`${getKvNamespace()}deployment-transaction:${id}`,`${getKvNamespace()}workbench-staging:${id}:text:${mutation.key}`];
  const principal=textPrincipal();
  if(action==='cancel') {
    scriptResult(await getRedisClient().eval(CANCEL_TEXT_SCRIPT,keys,[id,principal,new Date().toISOString()]));
    return readTextTransaction(id);
  }
  if(receipt.state==='consumed') return receipt;
  if(!['committing','committed','failed'].includes(tx.state)) throw new TextError(409,'RECONCILIATION_NOT_REQUIRED');
  let sha=tx.commitSha;
  if(!sha) {
    // Positive evidence only. Absence in bounded history never resets a claim.
    const history=await git(`commits?sha=main&path=${TEXT_AUTHORITY_PATH}&per_page=100`);
    sha=history.find((c:any)=>c.commit.message.includes(`Transaction ID: ${id}`))?.sha;
    if(!sha) throw new TextError(409,'GIT_RECEIPT_NOT_FOUND','No reachable Git receipt found. Claim retained; do not resubmit this transaction.');
  }
  if(!/^[a-f0-9]{40}$/.test(sha!)) throw new TextError(409,'INVALID_GIT_RECEIPT');
  const commit=await git(`commits/${sha}`);
  const ancestry=await git(`compare/${sha}...main`);
  if(ancestry.merge_base_commit?.sha!==sha) throw new TextError(409,'COMMIT_NOT_ON_MAIN');
  if(!commit.commit.message.includes(`Transaction ID: ${id}`)) throw new TextError(409,'GIT_RECEIPT_MISMATCH');
  const published=await file(TEXT_AUTHORITY_PATH,sha!);
  const field=published.fields?.[mutation.key];
  if(published.version!==1 || published.locale!=='en' || field?.value!==mutation.value || field?.revision!==mutation.expectedRevision+1) throw new TextError(409,'GIT_TEXT_MISMATCH');
  // A text-only recovery may consume receipts without a runtime promotion. If
  // this commit changed media authority semantically, leave the batch untouched.
  const allowed=new Set(['website/src/config/projects.v1.json','website/src/config/services.v1.json','website/src/config/brand.v1.json','website/src/config/media.v1.json']);
  if(!commit.parents?.[0]?.sha || !commit.files?.length || commit.files.length>5) throw new TextError(409,'UNSAFE_RECOVERY_COMMIT');
  for(const changed of commit.files) {
    if(changed.filename===TEXT_AUTHORITY_PATH) continue;
    if(!allowed.has(changed.filename)) throw new TextError(409,'MIXED_TRANSACTION_RECOVERY_REQUIRED');
    const before=await file(changed.filename,commit.parents[0].sha), after=await file(changed.filename,sha!);
    if(JSON.stringify(withoutTimestamps(before))!==JSON.stringify(withoutTimestamps(after))) throw new TextError(409,'MIXED_TRANSACTION_RECOVERY_REQUIRED');
  }
  scriptResult(await getRedisClient().eval(RECONCILE_TEXT_SCRIPT,keys,[id,principal,JSON.stringify(tx),new Date().toISOString(),sha!]));
  return readTextTransaction(id);
}
