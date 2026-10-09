import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { replaceAuthorizationForIdentity } from '../reauthorization-identity';
import type { GoogleAuthorizationRecord } from '../oauth-credential-store';

const enabled = process.env.REDIS_INTEGRATION_TESTS_ENABLED === 'true';
(enabled ? describe : describe.skip)('Reauthorization identity real Redis guard', () => {
  let redis: Redis;
  let key: string;
  const replacement = { id: 'test-auth', principalId: 'principal-a', googleSubject: 'subject-a',
    status: 'active', encryptedAccessToken: 'test-new-ciphertext' } as GoogleAuthorizationRecord;
  beforeAll(() => {
    const namespace = process.env.TEST_NAMESPACE || '';
    if (!/^hpp:(test|ci-test|audit):/.test(namespace)) throw new Error('Isolated test namespace required');
    redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
    key = `${namespace}reauthorization-identity:${crypto.randomUUID()}`;
  });
  afterEach(async () => { await redis.del(key); });

  it('replaces credentials for the same active identity', async () => {
    await redis.set(key, { ...replacement, encryptedAccessToken: 'test-old-ciphertext' });
    expect(await replaceAuthorizationForIdentity(redis, key, 'principal-a', 'subject-a', replacement, 1800)).toBe(true);
    expect(await redis.get(key)).toEqual(replacement);
    expect(await redis.ttl(key)).toBeGreaterThan(1700);
  });
  it.each([
    { principalId: 'principal-b' }, { googleSubject: 'subject-b' }, { status: 'revoked' },
  ])('rejects a changed identity or state and preserves current credentials (%s)', async changed => {
    const current = { ...replacement, ...changed, encryptedAccessToken: 'test-current-ciphertext' };
    await redis.set(key, current, { ex: 900 });
    expect(await replaceAuthorizationForIdentity(redis, key, 'principal-a', 'subject-a', replacement, 1800)).toBe(false);
    expect(await redis.get(key)).toEqual(current);
    expect(await redis.ttl(key)).toBeLessThanOrEqual(900);
  });
  it('does not recreate an absent authorization', async () => {
    expect(await replaceAuthorizationForIdentity(redis, key, 'principal-a', 'subject-a', replacement, 1800)).toBe(false);
    expect(await redis.exists(key)).toBe(0);
  });
  it('fails closed on malformed stored data without altering it', async () => {
    await redis.set(key, 'invalid-json');
    expect(await replaceAuthorizationForIdentity(redis, key, 'principal-a', 'subject-a', replacement, 1800)).toBe(false);
    expect(await redis.get(key)).toBe('invalid-json');
  });
});
