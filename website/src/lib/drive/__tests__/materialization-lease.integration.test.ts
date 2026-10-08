import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { replaceMaterializationLease } from '../materialization-lease';

const enabled = process.env.REDIS_INTEGRATION_TESTS_ENABLED === 'true';
(enabled ? describe : describe.skip)('Materialization lease real Redis CAS', () => {
  const namespace = process.env.TEST_NAMESPACE || '';
  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
  const key = `${namespace}materialization-lease:${crypto.randomUUID()}`;
  beforeAll(() => {
    if (!/^hpp:(test|ci-test|audit):/.test(namespace)) throw new Error('Isolated test namespace required');
  });
  afterEach(async () => { await redis.del(key); });

  it('allows exactly one concurrent reclaim without waiting for expiry', async () => {
    await redis.set(key, JSON.stringify({ status: 'FAILED_RETRYABLE', ownerToken: 'failed-owner' }), { ex: 1800 });
    const attempts = await Promise.all(Array.from({ length: 10 }, (_, i) =>
      replaceMaterializationLease(redis, key, 'FAILED_RETRYABLE', 'failed-owner', {
        status: 'PROCESSING', ownerToken: `retry-${i}`,
      }),
    ));
    expect(attempts.filter(Boolean)).toHaveLength(1);
    const winner = attempts.indexOf(true);
    expect(await redis.get(key)).toEqual({ status: 'PROCESSING', ownerToken: `retry-${winner}` });
    expect(await redis.ttl(key)).toBeGreaterThan(1700);
  });
  it('rejects stale owner, changed status, and expired keys', async () => {
    await redis.set(key, { status: 'PROCESSING', ownerToken: 'new-owner' });
    expect(await replaceMaterializationLease(redis, key, 'PROCESSING', 'old-owner', { status: 'SUCCEEDED' })).toBe(false);
    expect(await replaceMaterializationLease(redis, key, 'FAILED_RETRYABLE', 'new-owner', { status: 'PROCESSING' })).toBe(false);
    expect(await redis.get(key)).toEqual({ status: 'PROCESSING', ownerToken: 'new-owner' });
    await redis.del(key);
    expect(await replaceMaterializationLease(redis, key, 'PROCESSING', 'new-owner', { status: 'SUCCEEDED' })).toBe(false);
  });
});
