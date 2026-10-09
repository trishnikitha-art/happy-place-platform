import type { Redis } from '@upstash/redis';
import type { GoogleAuthorizationRecord } from './oauth-credential-store';

/** Recheck identity inside Redis so a stale OAuth callback cannot overwrite another binding. */
export async function replaceAuthorizationForIdentity(
  client: Redis,
  key: string,
  principalId: string,
  googleSubject: string,
  replacement: GoogleAuthorizationRecord,
  expiry: number,
  preserveRefreshToken = false,
  subjectKey?: string,
): Promise<boolean> {
  if (replacement.principalId !== principalId || replacement.googleSubject !== googleSubject) return false;
  const result = await client.eval(`
    local raw = redis.call('GET', KEYS[1])
    if not raw then return 0 end
    local ok, current_auth = pcall(cjson.decode, raw)
    if not ok or type(current_auth) ~= 'table' then return 0 end
    local expected_principal = ARGV[3]
    local expected_subject = ARGV[4]
    if current_auth.status ~= 'active' then return 0 end
    if current_auth.principalId ~= expected_principal or current_auth.googleSubject ~= expected_subject then
      return 0
    end
    local replacement = cjson.decode(ARGV[1])
    if ARGV[5] == '1' then
      if type(current_auth.encryptedRefreshToken) ~= 'string' or current_auth.encryptedRefreshToken == '' then return 0 end
      replacement.encryptedRefreshToken = current_auth.encryptedRefreshToken
    end
    if KEYS[2] and redis.call('GET', KEYS[2]) ~= current_auth.id then return 0 end
    redis.call('SET', KEYS[1], cjson.encode(replacement), 'EX', ARGV[2])
    if KEYS[2] then redis.call('EXPIRE', KEYS[2], ARGV[2]) end
    return 1
  `, subjectKey ? [key, subjectKey] : [key], [JSON.stringify(replacement), expiry, principalId, googleSubject, preserveRefreshToken ? '1' : '0']);
  return result === 1;
}
