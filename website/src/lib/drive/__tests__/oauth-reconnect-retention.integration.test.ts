import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { upsertAuthorization, findAuthorizationBySubject, updateAuthorizationAfterRefresh,
  revokeAuthorization, revokeAuthorizationWithSessions, decrypt } from '../oauth-credential-store';
import { AUTH_RETENTION_SECONDS } from '../session-renewal';

const enabled = process.env.REDIS_INTEGRATION_TESTS_ENABLED === 'true';
(enabled ? describe : describe.skip)('Returning OAuth repository and retention in real Redis', () => {
  let redis: Redis;
  let namespace: string;
  let subject: string;
  let authIds: string[];
  const reconnect = (token?: string) => upsertAuthorization(subject, 'fixture@example.com', ['drive.readonly'],
    'fixture-access', Date.now() + 3600000, token);
  beforeAll(() => {
    namespace = process.env.TEST_NAMESPACE || '';
    if (!/^hpp:(test|ci-test|audit):/.test(namespace)) throw new Error('Isolated namespace required');
    redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
  });
  beforeEach(() => { subject = 'reconnect-' + crypto.randomUUID(); authIds = []; });
  afterEach(async () => {
    await redis.del(namespace + 'drive:auth:subject:' + subject,
      ...authIds.map(id => namespace + 'drive:auth:' + id));
  });
  it('retains the authoritative encrypted token across concurrent callbacks and token refreshes', async () => {
    const original = await reconnect('original-refresh');
    authIds.push(original.id);
    await updateAuthorizationAfterRefresh(original.id, 'refreshed-access', Date.now() + 3600000, 'rotated-refresh');
    const callbacks = await Promise.all(Array.from({ length: 8 }, () => reconnect()));
    expect(new Set(callbacks.map(auth => auth.id))).toEqual(new Set([original.id]));
    callbacks.forEach(auth => expect(decrypt(JSON.parse(auth.encryptedRefreshToken))).toBe('rotated-refresh'));
    expect(await redis.ttl(namespace + 'drive:auth:' + original.id)).toBeGreaterThan(AUTH_RETENTION_SECONDS - 10);
    expect(await redis.ttl(namespace + 'drive:auth:subject:' + subject)).toBeGreaterThan(AUTH_RETENTION_SECONDS - 10);
  });
  it.each([revokeAuthorization, revokeAuthorizationWithSessions])(
    'does not erase a newer connection when an old authorization is revoked again', async revoke => {
      const original = await reconnect('original-refresh');
      authIds.push(original.id);
      await revokeAuthorization(original.id);
      const current = await reconnect('new-refresh');
      authIds.push(current.id);
      expect(current.id).not.toBe(original.id);
      await revoke(original.id);
      expect(await findAuthorizationBySubject(subject)).toMatchObject({ id: current.id, status: 'active' });
    });
  it('does not establish a new authorization without durable refresh credentials', async () => {
    await expect(reconnect()).rejects.toThrow('re-consent');
    expect(await redis.exists(namespace + 'drive:auth:subject:' + subject)).toBe(0);
  });
});
