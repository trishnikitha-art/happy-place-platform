import { GET } from '@/app/api/drive/oauth/authorize/route';
import { cookies } from 'next/headers';
import { workbenchSession } from '@/lib/workbench-session';
import { createState } from '../oauth-state-manager';
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('../oauth-state-manager', () => ({ createState: jest.fn() }));

describe('Normal reconnect versus explicit recovery consent', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client';
    process.env.GOOGLE_REDIRECT_URI = 'https://test.example/api/drive/oauth/callback';
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
    jest.mocked(cookies).mockResolvedValue({} as never);
    jest.mocked(createState).mockResolvedValue('test-state');
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { process.env = { ...saved }; jest.restoreAllMocks(); });
  it.each(['', '?reconsent=0', '?reconsent=invalid'])('omits forced consent on normal reconnect (%s)', async query => {
    const response = await GET(new Request('https://test.example/api/drive/oauth/authorize' + query));
    const url = new URL(response.headers.get('location')!);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.has('prompt')).toBe(false);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('state')).toBe('test-state');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/drive.readonly');
  });
  it('requests explicit consent only for recovery', async () => {
    const response = await GET(new Request('https://test.example/api/drive/oauth/authorize?reconsent=1'));
    expect(new URL(response.headers.get('location')!).searchParams.get('prompt')).toBe('consent');
  });
  it('does not create OAuth state for an unauthenticated recovery caller', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
    const response = await GET(new Request('https://test.example/api/drive/oauth/authorize?reconsent=1'));
    expect(response.status).toBe(401);
    expect(createState).not.toHaveBeenCalled();
  });
});
