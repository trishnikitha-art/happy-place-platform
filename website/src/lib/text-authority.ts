import catalog from '@/config/strings.v1.json';
import { decodeTextCatalog, decodeTextMutation, TEXT_AUTHORITY_PATH, type TextMutation } from './text-contract';
import { getRedisClient, getDeploymentTransaction } from './deployment-transaction';
import { getKvNamespace } from './environment';

export function deployedTextCatalog() { return decodeTextCatalog(catalog); }
export async function readGitTextCatalog() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GitHub connection unavailable');
  const owner = process.env.GITHUB_REPO_OWNER || 'trishnikitha-art';
  const repo = process.env.GITHUB_REPO_NAME || 'happy-place-platform';
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${TEXT_AUTHORITY_PATH}?ref=main`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot read current text authority (${response.status})`);
  const file = await response.json();
  return decodeTextCatalog(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')));
}
export async function readTextTransaction(id: string): Promise<{ transactionId: string; state: string; mutation: TextMutation | null; commitSha?: string }> {
  if (!/^WBDEP-\d+-[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid text transaction ID');
  const tx = await getDeploymentTransaction(id);
  const key = `${getKvNamespace()}workbench-staging:${id}:text:homepage.hero.title`;
  if (!tx || tx.stagingKeys.length !== 1 || tx.stagingKeys[0] !== key || !tx.files.includes('strings.v1.json')) throw new Error('Text transaction not found');
  const raw = await getRedisClient().get(key);
  if (!raw && tx.state !== 'consumed') throw new Error('Text staging record is missing');
  const savedMutation = (tx as typeof tx & { textMutation?: unknown }).textMutation;
  return { transactionId: id, state: tx.state, mutation: decodeTextMutation(raw ?? savedMutation), commitSha: tx.commitSha };
}
// Transaction and immutable staging receipt are stored together. A lost response
// can replay the same receipt without producing another transaction.
export const STAGE_TEXT_SCRIPT = `
local old = redis.call('GET', KEYS[1])
if old then
  if redis.call('GET', KEYS[2]) ~= ARGV[2] then return redis.error_reply('TEXT_RECEIPT_CONFLICT') end
  return old
end
if redis.call('EXISTS', KEYS[2]) == 1 then return redis.error_reply('TEXT_ORPHAN_STAGING') end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], ARGV[2])
return ARGV[1]
`;
