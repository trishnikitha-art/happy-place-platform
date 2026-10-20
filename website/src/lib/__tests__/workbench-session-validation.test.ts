const mockGet = jest.fn();
const mockCookies = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({ get: (...args: unknown[]) => mockGet(...args) })),
}));
jest.mock('next/headers', () => ({ cookies: (...args: unknown[]) => mockCookies(...args) }));

import { workbenchSession } from '../workbench-session';

const validSessionId = '11111111-1111-4111-8111-111111111111';

describe('Workbench session validation without implicit request context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KV_REST_API_URL = 'https://test.redis.invalid';
    process.env.KV_REST_API_TOKEN = 'test-token';
    mockGet.mockResolvedValue({ authenticated: true, expiresAt: Date.now() + 60_000 });
  });

  afterAll(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it('returns missing without touching Redis or next/headers cookies', async () => {
    await expect(workbenchSession.validateSessionId(null)).resolves.toEqual({ status: 'missing' });
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockCookies).not.toHaveBeenCalled();
  });

  it('validates an opaque cookie ID against its namespaced Redis session', async () => {
    await expect(workbenchSession.validateSessionId(validSessionId)).resolves.toEqual({ status: 'authenticated' });
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet.mock.calls[0][0]).toContain(`workbench_session:${validSessionId}`);
    expect(mockCookies).not.toHaveBeenCalled();
  });

  it('returns not_found when the Redis record was deleted or expired by its TTL', async () => {
    mockGet.mockResolvedValueOnce(null);
    await expect(workbenchSession.validateSessionId(validSessionId)).resolves.toEqual({ status: 'not_found' });
  });

  it('distinguishes an expired session record', async () => {
    mockGet.mockResolvedValueOnce({ authenticated: true, expiresAt: Date.now() - 1 });
    await expect(workbenchSession.validateSessionId(validSessionId)).resolves.toEqual({ status: 'expired' });
  });

  it('distinguishes an explicitly revoked session record', async () => {
    mockGet.mockResolvedValueOnce({ authenticated: true, expiresAt: Date.now() + 60_000, revokedAt: new Date().toISOString() });
    await expect(workbenchSession.validateSessionId(validSessionId)).resolves.toEqual({ status: 'revoked' });
  });

  it('rejects malformed cookie values before they become Redis keys', async () => {
    await expect(workbenchSession.validateSessionId('not-a-session-id')).resolves.toEqual({ status: 'invalid' });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns invalid for malformed or unauthenticated session records', async () => {
    mockGet.mockResolvedValueOnce('{not-json');
    await expect(workbenchSession.validateSessionId(validSessionId)).resolves.toEqual({ status: 'invalid' });
    mockGet.mockResolvedValueOnce({ authenticated: false, expiresAt: Date.now() + 60_000 });
    await expect(workbenchSession.validateSessionId(validSessionId)).resolves.toEqual({ status: 'invalid' });
  });

  it('distinguishes Redis infrastructure failure from an invalid session', async () => {
    mockGet.mockRejectedValueOnce(new Error('private Redis endpoint detail'));
    await expect(workbenchSession.validateSessionId(validSessionId)).resolves.toEqual({ status: 'unavailable' });
    expect(mockCookies).not.toHaveBeenCalled();
  });
});
