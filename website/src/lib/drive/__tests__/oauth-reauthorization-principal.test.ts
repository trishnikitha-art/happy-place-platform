import { upsertAuthorization, type GoogleAuthorizationRecord } from '../oauth-credential-store';
import { encrypt, decrypt } from '../encryption';
import { Redis } from '@upstash/redis';

jest.mock('@upstash/redis', () => ({ Redis: jest.fn() }));

describe('Reauthorization preserves principal and Google identity', () => {
  const savedEnvironment = { ...process.env };
  const redis = { get: jest.fn(), eval: jest.fn(), del: jest.fn() };
  let original: GoogleAuthorizationRecord;
  const reauthorize = () => upsertAuthorization('subject-a', 'updated@example.com', ['drive.readonly'],
    'new-access', Date.now() + 3600000, 'new-refresh');

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.KV_REST_API_URL = 'https://test.invalid';
    process.env.KV_REST_API_TOKEN = 'test-token';
    process.env.HPP_WORKBENCH_PRINCIPAL_ID = 'principal-a';
    process.env.ENCRYPTION_KEY = '01'.repeat(32);
    original = { id: 'auth-a', provider: 'google', principalId: 'principal-a', googleSubject: 'subject-a',
      email: 'original@example.com', scopes: ['drive.readonly'], status: 'active', keyVersion: 0,
      encryptedAccessToken: JSON.stringify(encrypt('old-access')),
      encryptedRefreshToken: JSON.stringify(encrypt('old-refresh')),
      accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(), lastRefreshAt: new Date().toISOString() };
    jest.mocked(Redis).mockImplementation(() => redis as never);
    redis.get.mockImplementation(async (key: string) => key.includes('auth:subject:') ? original.id : structuredClone(original));
    redis.eval.mockResolvedValue(1);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); process.env = { ...savedEnvironment }; });

  it('rejects another principal before overwriting its working credentials', async () => {
    original.principalId = 'principal-b';
    const before = JSON.stringify(original);
    await expect(reauthorize()).rejects.toThrow('identity mismatch');
    expect(redis.eval).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
    expect(JSON.stringify(original)).toBe(before);
  });
  it('rejects a subject-index mismatch before overwriting credentials', async () => {
    original.googleSubject = 'subject-b';
    await expect(reauthorize()).rejects.toThrow('identity mismatch');
    expect(redis.eval).not.toHaveBeenCalled();
  });
  it('keeps the same authorization ID and principal for valid reauthorization', async () => {
    const updated = await reauthorize();
    expect(updated).toMatchObject({ id: original.id, principalId: original.principalId, googleSubject: original.googleSubject });
    expect(decrypt(JSON.parse(updated.encryptedAccessToken))).toBe('new-access');
    expect(decrypt(JSON.parse(updated.encryptedRefreshToken))).toBe('new-refresh');
    const args = redis.eval.mock.calls[0][2];
    expect(args.slice(2)).toEqual(['principal-a', 'subject-a', '0']);
    // The same Lua is executed by oauth-reauthorization-identity.integration.test.ts.
    expect(redis.eval.mock.calls[0][0]).toContain('current_auth.principalId ~= expected_principal');
    expect(redis.eval.mock.calls[0][0]).toContain('current_auth.googleSubject ~= expected_subject');
  });
  it('propagates an atomic rejection without deleting or retrying the current authorization', async () => {
    redis.eval.mockResolvedValue(0);
    await expect(reauthorize()).rejects.toThrow('identity changed');
    expect(redis.eval).toHaveBeenCalledTimes(1);
    expect(redis.del).not.toHaveBeenCalled();
    expect(decrypt(JSON.parse(original.encryptedAccessToken))).toBe('old-access');
  });
  it('preserves a decryptable token for the same returning identity without a new refresh token', async () => {
    const updated = await upsertAuthorization('subject-a', 'updated@example.com', ['drive.readonly'],
      'new-access', Date.now() + 3600000);
    expect(decrypt(JSON.parse(updated.encryptedRefreshToken))).toBe('old-refresh');
    expect(redis.eval.mock.calls[0][2][4]).toBe('1');
  });
  it.each(['revoked', 'expired'])('requires fresh consent for %s authority without a refresh token', async status => {
    original.status = status as GoogleAuthorizationRecord['status'];
    await expect(upsertAuthorization('subject-a', 'updated@example.com', [], 'access', Date.now()))
      .rejects.toThrow('re-consent');
    expect(redis.eval).not.toHaveBeenCalled();
  });
  it('rejects first authorization without a refresh token before any persistence', async () => {
    redis.get.mockResolvedValue(null);
    await expect(upsertAuthorization('subject-a', 'updated@example.com', [], 'access', Date.now()))
      .rejects.toThrow('re-consent');
    expect(redis.eval).not.toHaveBeenCalled();
  });
  it('rejects an undecryptable stored token without overwriting the working record', async () => {
    original.encryptedRefreshToken = 'invalid-envelope';
    await expect(upsertAuthorization('subject-a', 'updated@example.com', [], 'access', Date.now())).rejects.toThrow();
    expect(redis.eval).not.toHaveBeenCalled();
  });
});
