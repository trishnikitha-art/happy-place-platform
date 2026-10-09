import projects from '@/config/projects.v1.json';
import services from '@/config/services.v1.json';
import { type ContentCollection, type ContentCatalog, decodeContentMutation } from './content-contract';
import { getDeploymentTransaction,getRedisClient } from './deployment-transaction';
import { getKvNamespace } from './environment';
import { TextError,textPrincipal,validateTextId } from './text-errors';

export const contentPath=(collection:ContentCollection)=>`website/src/config/${collection}.v1.json`;
export function deployedContent(collection:ContentCollection) {return (collection==='projects'?projects:services) as unknown as ContentCatalog;}
export async function readGitContent(collection:ContentCollection):Promise<ContentCatalog> {
  const token=process.env.GITHUB_TOKEN;if(!token) throw new TextError(503,'GIT_UNAVAILABLE');
  const repo=`${process.env.GITHUB_REPO_OWNER||'trishnikitha-art'}/${process.env.GITHUB_REPO_NAME||'happy-place-platform'}`;
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'};
  const ref=await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/main`,{headers,cache:'no-store'});
  if(!ref.ok) throw new TextError(503,'GIT_UNAVAILABLE');
  const sha=(await ref.json()).object.sha;
  const response=await fetch(`https://api.github.com/repos/${repo}/contents/${contentPath(collection)}?ref=${sha}`,{headers,cache:'no-store'});
  if(!response.ok) throw new TextError(503,'GIT_UNAVAILABLE');
  const file=await response.json();
  return JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
}
export async function readContentReceipt(id:string) {
  validateTextId(id);const tx=await getDeploymentTransaction(id);
  if(!tx) throw new TextError(404,'CONTENT_RECEIPT_NOT_FOUND');
  const record=tx as typeof tx & {principalId?:string;contentMutation?:unknown};
  if(record.principalId!==textPrincipal()) throw new TextError(403,'CONTENT_FORBIDDEN');
  const mutation=decodeContentMutation(record.contentMutation);
  const key=`${getKvNamespace()}workbench-staging:${id}:content:${mutation.collection}`;
  if(tx.stagingKeys.length!==1 || tx.stagingKeys[0]!==key || !tx.files.includes(`${mutation.collection}.v1.json`)) throw new TextError(409,'CONTENT_RECEIPT_MISMATCH');
  const raw=await getRedisClient().get(key);
  if(!raw && tx.state==='prepared') throw new TextError(409,'CONTENT_STAGING_MISSING');
  if(raw && JSON.stringify(decodeContentMutation(raw))!==JSON.stringify(mutation)) throw new TextError(409,'CONTENT_RECEIPT_MISMATCH');
  return {transactionId:id,state:tx.state,mutation,commitSha:tx.commitSha,error:tx.failureReason,stagingVerified:!!raw};
}
export async function listContentReceipts(collection:ContentCollection) {
  const redis=getRedisClient();const records=[];
  for(const key of await redis.keys(`${getKvNamespace()}deployment-transaction:*`)) {
    const tx=await redis.get<any>(key);
    if(tx?.contentMutation?.collection===collection && tx.principalId===textPrincipal()) records.push(await readContentReceipt(tx.transactionId));
  }
  return records;
}
