import { cookies } from 'next/headers';
import { renewSessionActivity } from '../session-store';
import { recordDriveActivity } from '../authenticated-activity';
import { DRIVE_IDLE_SECONDS } from '../session-renewal';
import type { GoogleAuthorizationRecord } from '../oauth-credential-store';
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('../session-store', () => ({ renewSessionActivity: jest.fn() }));

describe('Drive activity cookie renewal', () => {
  const set = jest.fn();
  const auth = { id: 'test-auth' } as GoogleAuthorizationRecord;
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(cookies).mockResolvedValue({ set } as never);
  });
  it('refreshes the same opaque cookie only after atomic renewal succeeds', async () => {
    jest.mocked(renewSessionActivity).mockResolvedValue(true);
    expect(await recordDriveActivity('test-session', auth)).toBe(true);
    expect(set).toHaveBeenCalledWith('drive_session_id', 'test-session', expect.objectContaining({
      httpOnly: true, sameSite: 'lax', maxAge: DRIVE_IDLE_SECONDS, path: '/',
    }));
  });
  it('does not issue a fresh cookie for rejected or revoked activity', async () => {
    jest.mocked(renewSessionActivity).mockResolvedValue(false);
    expect(await recordDriveActivity('test-session', auth)).toBe(false);
    expect(cookies).not.toHaveBeenCalled();
  });
  it('propagates storage failure without extending the cookie', async () => {
    jest.mocked(renewSessionActivity).mockRejectedValue(new Error('test-storage-failure'));
    await expect(recordDriveActivity('test-session', auth)).rejects.toThrow('test-storage-failure');
    expect(set).not.toHaveBeenCalled();
  });
});
