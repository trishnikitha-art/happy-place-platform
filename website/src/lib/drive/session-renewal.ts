import type { Redis } from '@upstash/redis';

export const DRIVE_IDLE_SECONDS = 30 * 24 * 60 * 60;
export const DRIVE_INDEX_SECONDS = 60 * 24 * 60 * 60;
export const AUTH_RETENTION_SECONDS = 365 * 24 * 60 * 60;

/** Identities and keys come exclusively from the authenticated server-side session. */
export async function renewAuthenticatedSession(
  redis: Redis, namespace: string, sessionId: string, authorizationId: string,
  principalId: string, googleSubject: string, now = new Date(),
): Promise<boolean> {
  if (!sessionId || !authorizationId || !principalId || !googleSubject) return false;
  const result = await redis.eval(`
    local session_raw = redis.call('GET', KEYS[1])
    local auth_raw = redis.call('GET', KEYS[2])
    if not session_raw or not auth_raw then return 0 end
    local session_ok, session = pcall(cjson.decode, session_raw)
    local auth_ok, auth = pcall(cjson.decode, auth_raw)
    if not session_ok or not auth_ok or type(session) ~= 'table' or type(auth) ~= 'table' then return 0 end
    if session.id ~= ARGV[1] or session.authorizationId ~= ARGV[2] or session.revokedAt then return 0 end
    if type(session.expiresAt) ~= 'string' or not string.match(session.expiresAt, '^%d%d%d%d%-%d%d%-%d%dT%d%d:%d%d:%d%d%.%d%d%dZ$') then return 0 end
    if session.expiresAt <= ARGV[5] or redis.call('TTL', KEYS[1]) <= 0 then return 0 end
    if auth.id ~= ARGV[2] or auth.principalId ~= ARGV[3] or auth.googleSubject ~= ARGV[4] or auth.status ~= 'active' then return 0 end
    if redis.call('GET', KEYS[4]) ~= auth.id then return 0 end
    session.expiresAt = ARGV[6]
    session.lastSeenAt = ARGV[5]
    auth.lastUsedAt = ARGV[5]
    redis.call('SET', KEYS[1], cjson.encode(session), 'EX', ARGV[7])
    redis.call('SADD', KEYS[3], session.id)
    redis.call('EXPIRE', KEYS[3], ARGV[8])
    redis.call('SET', KEYS[2], cjson.encode(auth), 'EX', ARGV[9])
    redis.call('EXPIRE', KEYS[4], ARGV[9])
    return 1
  `, [
    `${namespace}drive:session:${sessionId}`, `${namespace}drive:auth:${authorizationId}`,
    `${namespace}drive:auth:sessions:${authorizationId}`, `${namespace}drive:auth:subject:${googleSubject}`,
  ], [sessionId, authorizationId, principalId, googleSubject, now.toISOString(),
    new Date(now.getTime() + DRIVE_IDLE_SECONDS * 1000).toISOString(),
    DRIVE_IDLE_SECONDS, DRIVE_INDEX_SECONDS, AUTH_RETENTION_SECONDS]);
  return result === 1;
}
