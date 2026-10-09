import { GET } from '@/app/api/drive/oauth/callback/route';
import { cookies } from 'next/headers';
import { workbenchSession } from '@/lib/workbench-session';
import { consumeState } from '../oauth-state-manager';
import { upsertAuthorization, revokeAuthorizationWithSessions } from '../oauth-credential-store';
import { createSession } from '../session-store';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('../oauth-state-manager', () => ({ consumeState: jest.fn() }));
jest.mock('../oauth-credential-store', () => ({ upsertAuthorization: jest.fn(), revokeAuthorizationWithSessions: jest.fn() }));
jest.mock('../session-store', () => ({ createSession: jest.fn(), getSession: jest.fn() }));

describe('Fresh OAuth callback preserves the working session on failure', () => {
  const originalEnvironment = { ...process.env };
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const cookieStore = { get: jest.fn(() => ({ value: 'existing-drive-session' })), set: jest.fn(), delete: jest.fn() };
  const scopes = ['openid', 'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/drive.photos.readonly'];
  const tokenData = () => ({ access_token: 'test-new-access', refresh_token: 'test-new-refresh',
    expires_in: 3600, token_type: 'Bearer', scope: scopes.join(' ') });
  const callback = (query = 'state=test-state&code=test-code') => GET(new Request(
    `https://test.example/api/drive/oauth/callback?${query}`, { headers: { 'user-agent': 'test-browser' } }));
  const expectSessionPreserved = () => {
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
    expect(revokeAuthorizationWithSessions).not.toHaveBeenCalled();
  };
  beforeEach(() => {
    jest.resetAllMocks();
    Object.assign(process.env, { GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_REDIRECT_URI: 'https://test.example/api/drive/oauth/callback', NODE_ENV: 'production' });
    global.fetch = fetchMock;
    jest.mocked(cookies).mockResolvedValue(cookieStore as never);
    jest.mocked(consumeState).mockResolvedValue(true);
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
    jest.mocked(upsertAuthorization).mockResolvedValue({ id: 'new-authorization' } as never);
    jest.mocked(createSession).mockResolvedValue({ id: 'new-session' } as never);
    fetchMock.mockResolvedValueOnce(Response.json(tokenData()))
      .mockResolvedValueOnce(Response.json({ sub: 'verified-google-subject', email: 'test@example.com' }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { global.fetch = originalFetch; process.env = { ...originalEnvironment }; jest.restoreAllMocks(); });

  it('binds the Google subject to authorization and issues an opaque secure session after success', async () => {
    const response = await callback();
    expect(response.status).toBe(307);
    expect(upsertAuthorization).toHaveBeenCalledWith('verified-google-subject', 'test@example.com', scopes,
      'test-new-access', expect.any(Number), 'test-new-refresh');
    expect(createSession).toHaveBeenCalledWith('new-authorization', 'test-browser');
    expect(cookieStore.set).toHaveBeenCalledWith('drive_session_id', 'new-session', expect.objectContaining({
      httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    }));
    expect(revokeAuthorizationWithSessions).not.toHaveBeenCalled();
    expect(JSON.stringify(jest.mocked(console.log).mock.calls)).not.toContain('test-new-access');
  });
  it('does not revoke existing authorization when the new code exchange fails', async () => {
    fetchMock.mockReset().mockResolvedValue(Response.json({ error: 'invalid_grant' }, { status: 400 }));
    await callback();
    expect(upsertAuthorization).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
    expectSessionPreserved();
  });
  it('preserves the existing connection when Google consent is denied', async () => {
    await callback('state=test-state&error=access_denied');
    expect(fetchMock).not.toHaveBeenCalled();
    expectSessionPreserved();
  });
  it('rejects invalid or replayed state before contacting Google', async () => {
    jest.mocked(consumeState).mockResolvedValue(false);
    await callback();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsertAuthorization).not.toHaveBeenCalled();
    expectSessionPreserved();
  });
  it('requires an authenticated Workbench session before token exchange', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
    const response = await callback();
    expect(response.headers.get('location')).toBe('https://test.example/workbench/login');
    expect(fetchMock).not.toHaveBeenCalled();
    expectSessionPreserved();
  });
  it('rejects missing Drive scopes without promoting the new authorization', async () => {
    fetchMock.mockReset().mockResolvedValue(Response.json({ ...tokenData(), scope: 'openid' }));
    await callback();
    expect(upsertAuthorization).not.toHaveBeenCalled();
    expectSessionPreserved();
  });
  it('rejects an identity without a Google subject', async () => {
    fetchMock.mockReset().mockResolvedValueOnce(Response.json(tokenData()))
      .mockResolvedValueOnce(Response.json({ email: 'test@example.com' }));
    await callback();
    expect(upsertAuthorization).not.toHaveBeenCalled();
    expectSessionPreserved();
  });
  it('preserves the existing session when identity binding is rejected', async () => {
    jest.mocked(upsertAuthorization).mockRejectedValue(new Error('Authorization identity mismatch - update rejected'));
    await callback();
    expect(createSession).not.toHaveBeenCalled();
    expectSessionPreserved();
  });
  it('keeps the existing browser session when new session persistence fails', async () => {
    jest.mocked(createSession).mockRejectedValue(new Error('test-session-storage-failure'));
    await callback();
    expectSessionPreserved();
  });
});
