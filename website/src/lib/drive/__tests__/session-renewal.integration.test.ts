import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { renewAuthenticatedSession, DRIVE_IDLE_SECONDS, AUTH_RETENTION_SECONDS } from '../session-renewal';

const enabled = process.env.REDIS_INTEGRATION_TESTS_ENABLED === 'true';
(enabled ? describe : describe.skip)('Authenticated idle renewal in real Redis', () => {
  let redis: Redis;
  let namespace: string;
  let keys: string[];
  let session: Record<string, string>;
  let auth: Record<string, string>;
  const now = new Date();
  const renew = () => renewAuthenticatedSession(redis, namespace, 'session-a', 'auth-a', 'principal-a', 'subject-a', now);
  beforeAll(() => {
    const base = process.env.TEST_NAMESPACE || '';
    if (!/^hpp:(test|ci-test|audit):/.test(base)) throw new Error('Isolated namespace required');
    namespace = base + 'renewal:' + crypto.randomUUID() + ':';
    redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
    keys = ['drive:session:session-a', 'drive:auth:auth-a', 'drive:auth:sessions:auth-a', 'drive:auth:subject:subject-a']
      .map(key => namespace + key);
  });
  beforeEach(async () => {
    session = { id: 'session-a', authorizationId: 'auth-a',
      expiresAt: new Date(now.getTime() + 3600000).toISOString(), lastSeenAt: new Date(now.getTime() - 86400000).toISOString() };
    auth = { id: 'auth-a', principalId: 'principal-a', googleSubject: 'subject-a', status: 'active',
      encryptedRefreshToken: 'test-ciphertext-unchanged' };
    await redis.set(keys[0], session, { ex: 3600 });
    await redis.set(keys[1], auth, { ex: 3600 });
    await redis.set(keys[3], auth.id, { ex: 3600 });
  });
  afterEach(async () => { await redis.del(...keys); });
  it('renews the session, revocation index and authorization retention without replacing credentials', async () => {
    expect(await renew()).toBe(true);
    expect(await redis.ttl(keys[0])).toBeGreaterThan(DRIVE_IDLE_SECONDS - 10);
    expect(await redis.sismember(keys[2], session.id)).toBe(1);
    expect(await redis.ttl(keys[2])).toBeGreaterThan(DRIVE_IDLE_SECONDS);
    expect(await redis.ttl(keys[1])).toBeGreaterThan(AUTH_RETENTION_SECONDS - 10);
    expect(await redis.ttl(keys[3])).toBeGreaterThan(AUTH_RETENTION_SECONDS - 10);
    expect(await redis.get(keys[1])).toMatchObject({ encryptedRefreshToken: auth.encryptedRefreshToken });
    expect(await redis.get(keys[0])).toMatchObject({ lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + DRIVE_IDLE_SECONDS * 1000).toISOString() });
  });
  it.each([
    { sessionChange: { revokedAt: now.toISOString() } },
    { sessionChange: { expiresAt: new Date(now.getTime() - 1).toISOString() } },
    { sessionChange: { authorizationId: 'auth-b' } },
    { authChange: { status: 'revoked' } },
    { authChange: { principalId: 'principal-b' } },
    { authChange: { googleSubject: 'subject-b' } },
  ])('rejects expired, revoked or rebound authority without extending lifetime (%s)', async changes => {
    await redis.set(keys[0], { ...session, ...changes.sessionChange }, { ex: 3600 });
    await redis.set(keys[1], { ...auth, ...changes.authChange }, { ex: 3600 });
    const before = await redis.mget(keys[0], keys[1]);
    expect(await renew()).toBe(false);
    expect(await redis.mget(keys[0], keys[1])).toEqual(before);
    expect(await redis.ttl(keys[0])).toBeLessThanOrEqual(3600);
    expect(await redis.exists(keys[2])).toBe(0);
  });
  it.each([0, 1, 3])('does not recreate absent session, authorization or subject binding (%s)', async index => {
    await redis.del(keys[index]);
    expect(await renew()).toBe(false);
    expect(await redis.exists(keys[index])).toBe(0);
  });
  it('rejects a replaced subject index', async () => {
    await redis.set(keys[3], 'auth-b', { ex: 3600 });
    expect(await renew()).toBe(false);
    expect(await redis.get(keys[3])).toBe('auth-b');
  });
  it('rejects malformed stored data without writes', async () => {
    await redis.set(keys[0], 'broken-json', { ex: 3600 });
    expect(await renew()).toBe(false);
    expect(await redis.get(keys[0])).toBe('broken-json');
  });
  it('supports concurrent activity while retaining every valid session in the revocation index', async () => {
    const second = { ...session, id: 'session-b' };
    const secondKey = namespace + 'drive:session:session-b';
    try {
      await redis.set(secondKey, second, { ex: 3600 });
      expect(await Promise.all([renew(), renewAuthenticatedSession(redis, namespace, second.id,
        auth.id, auth.principalId, auth.googleSubject, now)])).toEqual([true, true]);
      expect((await redis.smembers(keys[2])).sort()).toEqual(['session-a', 'session-b']);
    } finally { await redis.del(secondKey); }
  });
});
