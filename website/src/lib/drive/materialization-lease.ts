import type { Redis } from '@upstash/redis';

// Compare and replace inside Redis; GET followed by SET can overwrite a new owner.
export async function replaceMaterializationLease(
  client: Redis,
  key: string,
  expectedStatus: 'FAILED_RETRYABLE' | 'PROCESSING',
  expectedOwner: string,
  replacement: Record<string, unknown>,
  expiry = 1800,
): Promise<boolean> {
  const result = await client.eval(`
    local raw = redis.call('GET', KEYS[1])
    if not raw then return 0 end
    local ok, lease = pcall(cjson.decode, raw)
    if not ok or lease.status ~= ARGV[1] or lease.ownerToken ~= ARGV[2] then
      return 0
    end
    redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[4])
    return 1
  `, [key], [expectedStatus, expectedOwner, JSON.stringify(replacement), expiry]);
  return result === 1;
}
