jest.mock('@/lib/workbench-session', () => ({
  workbenchSession: {
    validateSessionId: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { middleware, config } from '../../middleware';
import { workbenchSession } from '../workbench-session';

const previousNodeEnv = process.env.NODE_ENV;
const previousBypass = process.env.DRIVE_AUTH_BYPASS;

function makeRequest(pathname: string, sessionId?: string) {
  return new NextRequest(`https://example.test${pathname}`, {
    headers: sessionId ? { cookie: `workbench_session_id=${sessionId}` } : undefined,
  });
}

describe('Workbench middleware session boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
    delete process.env.DRIVE_AUTH_BYPASS;
  });

  afterAll(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousBypass === undefined) delete process.env.DRIVE_AUTH_BYPASS;
    else process.env.DRIVE_AUTH_BYPASS = previousBypass;
  });

  it('passes the request cookie to explicit server-side Redis validation', async () => {
    jest.mocked(workbenchSession.validateSessionId).mockResolvedValue({ status: 'authenticated' });
    const response = await middleware(makeRequest('/workbench/projects', '11111111-1111-4111-8111-111111111111'));
    expect(workbenchSession.validateSessionId).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    expect(workbenchSession.isAuthenticated).not.toHaveBeenCalled();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects a missing session to login without setting an auth cookie', async () => {
    jest.mocked(workbenchSession.validateSessionId).mockResolvedValue({ status: 'missing' });
    const response = await middleware(makeRequest('/workbench'));
    expect(workbenchSession.validateSessionId).toHaveBeenCalledWith(null);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.test/workbench/login');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each(['not_found', 'expired', 'revoked', 'invalid'] as const)(
    'redirects a %s session and clears the stale cookie', async status => {
      jest.mocked(workbenchSession.validateSessionId).mockResolvedValue({ status });
      const response = await middleware(makeRequest('/workbench/projects', '11111111-1111-4111-8111-111111111111'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://example.test/workbench/login');
      expect(response.headers.get('set-cookie')).toContain('workbench_session_id=');
      expect(response.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    },
  );

  it('returns a retryable service failure when Redis is unavailable', async () => {
    jest.mocked(workbenchSession.validateSessionId).mockResolvedValue({ status: 'unavailable' });
    const response = await middleware(makeRequest('/workbench/projects', '11111111-1111-4111-8111-111111111111'));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('location')).toBeNull();
    expect(await response.text()).not.toMatch(/password|google credentials/i);
  });

  it.each(['/workbench/login', '/workbench/preview/project-1'])('%s remains accessible without session validation', async pathname => {
    const response = await middleware(makeRequest(pathname));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(workbenchSession.validateSessionId).not.toHaveBeenCalled();
  });

  it('enables the development bypass only when both explicit conditions are true', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DRIVE_AUTH_BYPASS = 'true';
    const response = await middleware(makeRequest('/workbench/projects'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(workbenchSession.validateSessionId).not.toHaveBeenCalled();
  });

  it('protects the Workbench matcher and selects the Node.js runtime', () => {
    expect(config.matcher).toBe('/workbench/:path*');
    expect(config.runtime).toBe('nodejs');
  });
});
