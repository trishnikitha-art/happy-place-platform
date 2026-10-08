import { NextRequest } from 'next/server';
import { POST } from '@/app/api/estimate/route';
import { workbenchSession } from '../workbench-session';
import { getGoogleAuth } from '../google';

jest.mock('../workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('../google', () => ({ getGoogleAuth: jest.fn(), google: {} }));
jest.mock('../kit', () => ({ syncEstimateSubscriber: jest.fn() }));
jest.mock('../events', () => ({ logEvent: jest.fn() }));

describe('Private project scoping boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an anonymous submission before parsing it or initializing Google', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
    const request = new NextRequest('https://hpp.example/api/estimate', { method: 'POST', body: 'not json' });
    const parse = jest.spyOn(request, 'json');
    expect((await POST(request)).status).toBe(401);
    expect(parse).not.toHaveBeenCalled();
    expect(getGoogleAuth).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin browser submission even with a valid Workbench session', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
    const request = new NextRequest('https://hpp.example/api/estimate', {
      method: 'POST', headers: { origin: 'https://other.example' }, body: 'not json',
    });
    expect((await POST(request)).status).toBe(403);
    expect(getGoogleAuth).not.toHaveBeenCalled();
  });
});
