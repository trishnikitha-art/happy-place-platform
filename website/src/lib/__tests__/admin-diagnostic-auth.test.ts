jest.mock('@/lib/workbench-session', () => ({
  workbenchSession: { getCredentials: jest.fn(), isAuthenticated: jest.fn() },
}));
jest.mock('sharp', () => {
  const pipeline = {
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-image')),
  };
  const sharp = jest.fn(() => pipeline);
  return Object.assign(sharp, { versions: { sharp: 'test' }, format: {}, cache: {}, concurrency: {} });
});

import { workbenchSession } from '../workbench-session';
import { GET as diagnostic } from '@/app/api/admin/deploy/diagnostic/route';
import { GET as status } from '@/app/api/admin/deploy/status/route';
import { GET as sharpHealth } from '@/app/api/admin/sharp-health/route';

const handlers = [
  ['configuration diagnostic', diagnostic],
  ['deployment status', status],
  ['Sharp health', sharpHealth],
] as const;
const request = () => new Request('https://site/api/admin/diagnostic?commitSha=' + 'a'.repeat(40));
const sharp = jest.requireMock('sharp') as jest.Mock;
const now = 1_800_000_000_000;
const originalToken = process.env.GITHUB_TOKEN;
const originalFetch = global.fetch;
const provider = jest.fn();

afterAll(() => {
  global.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = originalToken;
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(now);
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
  jest.mocked(workbenchSession.getCredentials).mockResolvedValue({
    sessionId: 'opaque-server-session', authenticated: true, expiresAt: now + 60_000,
  });
  process.env.GITHUB_TOKEN = 'isolated-test-token';
  global.fetch = provider;
  provider.mockReset().mockResolvedValueOnce(new Response(JSON.stringify({
    sha: 'a'.repeat(40), html_url: 'https://github.com/configured-repo/commit/' + 'a'.repeat(40),
    commit: { committer: { date: '2026-10-11T00:00:00Z' } },
  }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ statuses: [] }), { status: 200 }));
});
afterEach(() => jest.restoreAllMocks());

it.each(handlers)('%s rejects missing sessions before diagnostics or provider work', async (_, handler) => {
  jest.mocked(workbenchSession.getCredentials).mockResolvedValue(null);
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
  const response = await handler(request());
  expect(response.status).toBe(401);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'Unauthorized', message: 'Workbench authentication required' });
  expect(sharp).not.toHaveBeenCalled();
  expect(provider).not.toHaveBeenCalled();
});

it.each(handlers)('%s rejects expired server-side sessions without effects', async (_, handler) => {
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
  jest.mocked(workbenchSession.getCredentials).mockResolvedValue({
    sessionId: 'expired-session', authenticated: true, expiresAt: now,
  });
  const response = await handler(request());
  expect(response.status).toBe(401);
  expect(sharp).not.toHaveBeenCalled();
  expect(provider).not.toHaveBeenCalled();
});

it.each([false, undefined, NaN, Infinity, 'tomorrow'])('rejects malformed server-side session data (%s)', async value => {
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
  jest.mocked(workbenchSession.getCredentials).mockResolvedValue({
    sessionId: 'bad-session', authenticated: value === false ? false : true,
    expiresAt: value === false ? now + 60_000 : value,
  } as never);
  for (const [, handler] of handlers) expect((await handler(request())).status).toBe(401);
  expect(sharp).not.toHaveBeenCalled();
  expect(provider).not.toHaveBeenCalled();
});

it('does not accept caller-supplied owner, tenant or bearer assertions in place of a session', async () => {
  jest.mocked(workbenchSession.getCredentials).mockResolvedValue(null);
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
  const forged = new Request('https://site/api/admin/diagnostic?tenantId=victim&demoOwner=true', {
    headers: { Authorization: 'Bearer caller-assertion', 'x-mc-caller-key': 'caller-assertion' },
  });
  for (const [, handler] of handlers) expect((await handler(forged)).status).toBe(401);
  expect(sharp).not.toHaveBeenCalled();
  expect(provider).not.toHaveBeenCalled();
});

it('fails closed and redacts session dependency errors', async () => {
  jest.mocked(workbenchSession.getCredentials).mockRejectedValue(new Error('private-session-secret'));
  for (const [, handler] of handlers) {
    const response = await handler(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private-session-secret');
  }
  expect(sharp).not.toHaveBeenCalled();
  expect(provider).not.toHaveBeenCalled();
});

it('serves diagnostics only for a valid existing Workbench session and prevents caching', async () => {
  const response = await diagnostic(request());
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toMatchObject({ code: { routeExists: true } });
});

it('performs Sharp work only after validating the existing Workbench session', async () => {
  const response = await sharpHealth(request());
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(sharp).toHaveBeenCalledTimes(2);
});

it('delegates status to the existing commit-specific verification rather than claiming success', async () => {
  const input = request();
  const response = await status(input);
  expect(provider).toHaveBeenCalledTimes(2);
  expect(provider.mock.calls[0][0]).toContain('/commits/' + 'a'.repeat(40));
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toMatchObject({ status: 'COMMITTED_DEPLOYING', vercelStatus: 'unknown' });
});

it('does not claim an invented SHA was committed when the configured repository rejects it', async () => {
  provider.mockReset().mockResolvedValue(new Response('{}', { status: 404 }));
  const response = await status(request());
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: 'Commit not found' });
  expect(provider).toHaveBeenCalledTimes(1);
});
