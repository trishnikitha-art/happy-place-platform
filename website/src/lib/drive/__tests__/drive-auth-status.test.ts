import { GET } from '@/app/api/drive/auth/status/route';
import { workbenchSession } from '@/lib/workbench-session';
import { driveSession } from '../drive-session';
import { getOAuthClient } from '../oauth-manager';
import { getAuthorization } from '../oauth-credential-store';
import { getSession } from '../session-store';
import { recordDriveActivity } from '../authenticated-activity';
jest.mock('../authenticated-activity', () => ({ recordDriveActivity: jest.fn() }));

jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('../drive-session', () => ({ driveSession: { getSessionId: jest.fn(), getCredentials: jest.fn() } }));
jest.mock('../oauth-manager', () => ({ getOAuthClient: jest.fn() }));
jest.mock('../oauth-credential-store', () => ({ getAuthorization: jest.fn() }));
jest.mock('../session-store', () => ({ getSession: jest.fn() }));

describe('Drive status respects Workbench identity and persisted credentials', () => {
  const originalPrincipal = process.env.HPP_WORKBENCH_PRINCIPAL_ID;
  const credentials = () => ({
    access_token: 'test-access', refresh_token: 'test-refresh',
    expiry_date: Date.now() + 3600000, scope: 'drive.readonly',
  });
  const status = async () => {
    const response = await GET();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    return response.json();
  };
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.HPP_WORKBENCH_PRINCIPAL_ID = 'principal-a';
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
    jest.mocked(driveSession.getSessionId).mockResolvedValue('test-session');
    jest.mocked(getSession).mockResolvedValue({ authorizationId: 'test-authorization' } as never);
    jest.mocked(getAuthorization).mockResolvedValue({ status: 'active', principalId: 'principal-a' } as never);
    jest.mocked(driveSession.getCredentials).mockResolvedValue(credentials());
    jest.mocked(recordDriveActivity).mockResolvedValue(true);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => {
    if (originalPrincipal === undefined) delete process.env.HPP_WORKBENCH_PRINCIPAL_ID;
    else process.env.HPP_WORKBENCH_PRINCIPAL_ID = originalPrincipal;
  });

  it('rejects an unauthenticated Workbench caller before any Drive read', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
    expect(await status()).toMatchObject({ authenticated: false, has_access_token: false });
    expect(driveSession.getSessionId).not.toHaveBeenCalled();
    expect(driveSession.getCredentials).not.toHaveBeenCalled();
  });
  it.each([undefined, '', '   '])('fails closed without a configured principal (%s)', async principal => {
    if (principal === undefined) delete process.env.HPP_WORKBENCH_PRINCIPAL_ID;
    else process.env.HPP_WORKBENCH_PRINCIPAL_ID = principal;
    expect(await status()).toMatchObject({ authenticated: false });
    expect(driveSession.getSessionId).not.toHaveBeenCalled();
  });
  it('rejects a principal mismatch even with an unexpired token', async () => {
    jest.mocked(getAuthorization).mockResolvedValue({ status: 'active', principalId: 'principal-b' } as never);
    expect(await status()).toMatchObject({ authenticated: false });
    expect(driveSession.getCredentials).not.toHaveBeenCalled();
    expect(getOAuthClient).not.toHaveBeenCalled();
  });
  it('rejects revoked authorization before credential access', async () => {
    jest.mocked(getAuthorization).mockResolvedValue({ status: 'revoked', principalId: 'principal-a' } as never);
    expect(await status()).toMatchObject({ authenticated: false });
    expect(driveSession.getCredentials).not.toHaveBeenCalled();
  });
  it('keeps the working connection and reports only presence flags', async () => {
    expect(await status()).toEqual({ authenticated: true, has_access_token: true,
      has_refresh_token: true, has_expiry_date: true, has_scope: true });
    expect(getOAuthClient).not.toHaveBeenCalled();
  });
  it('reports connected after refresh only with usable persisted credentials', async () => {
    jest.mocked(driveSession.getCredentials).mockResolvedValueOnce({ ...credentials(), expiry_date: Date.now() - 1 })
      .mockResolvedValueOnce(credentials());
    expect(await status()).toMatchObject({ authenticated: true });
    expect(getOAuthClient).toHaveBeenCalledTimes(1);
  });
  it.each([null, { access_token: '', refresh_token: '', expiry_date: 0 },
    { access_token: 'test-access', refresh_token: 'test-refresh', expiry_date: 1 }])(
    'does not claim refresh success for missing or expired persisted credentials (%s)', async persisted => {
      jest.mocked(driveSession.getCredentials).mockResolvedValueOnce({ ...credentials(), expiry_date: 1 })
        .mockResolvedValueOnce(persisted);
      expect(await status()).toMatchObject({ authenticated: false, has_access_token: false });
    });
  it('classifies revoked grants without exposing errors or credential presence', async () => {
    jest.mocked(driveSession.getCredentials).mockResolvedValue({ ...credentials(), expiry_date: 1 });
    jest.mocked(getOAuthClient).mockRejectedValue(new Error('invalid_grant test-sensitive-detail'));
    expect(await status()).toEqual({ authenticated: false, has_access_token: false,
      has_refresh_token: false, has_expiry_date: false, has_scope: false, requiresReauth: true });
    expect(console.warn).toHaveBeenCalledWith('[DRIVE_AUTH_STATUS] Refresh failed', { permanentFailure: true });
  });
  it('fails closed on infrastructure failure', async () => {
    jest.mocked(getSession).mockRejectedValue(new Error('test-storage-error'));
    expect(await status()).toMatchObject({ authenticated: false });
    expect(driveSession.getCredentials).not.toHaveBeenCalled();
  });
  it('renews a usable connection and rejects an atomic renewal race', async () => {
    await status();
    expect(recordDriveActivity).toHaveBeenCalledWith('test-session', expect.objectContaining({ principalId: 'principal-a' }));
    jest.mocked(recordDriveActivity).mockResolvedValue(false);
    expect(await status()).toMatchObject({ authenticated: false });
  });
});
