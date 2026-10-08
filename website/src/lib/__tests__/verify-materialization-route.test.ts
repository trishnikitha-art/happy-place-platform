import { GET } from '@/app/api/workbench/verify-materialization/route';
import { workbenchSession } from '@/lib/workbench-session';
import { getMedia } from '@/lib/media-kv-store';
import { isPubliclyComplete } from '@/lib/media-contracts';

jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('@/lib/media-kv-store', () => ({ getMedia: jest.fn() }));
jest.mock('@/lib/media-contracts', () => ({ isPubliclyComplete: jest.fn() }));

beforeEach(() => {
  jest.resetAllMocks();
  (workbenchSession.isAuthenticated as jest.Mock).mockResolvedValue(true);
  (getMedia as jest.Mock).mockResolvedValue({ id: 'test', source: 'local', lifecycleState: 'published' });
});

it.each([false, true])('waits for the actual proof and returns boolean %s', async complete => {
  let resolveProof!: (value: boolean) => void;
  (isPubliclyComplete as jest.Mock).mockReturnValue(new Promise<boolean>(resolve => { resolveProof = resolve; }));
  let settled = false;
  const pending = GET(new Request('http://localhost/api/workbench/verify-materialization?assetId=test'))
    .then(response => { settled = true; return response; });
  await new Promise(resolve => setImmediate(resolve));
  expect(isPubliclyComplete).toHaveBeenCalledTimes(1);
  expect(settled).toBe(false);
  resolveProof(complete);
  const response = await pending;
  expect(response.status).toBe(200);
  expect((await response.json()).complete).toBe(complete);
});

it('denies unauthenticated verification before reading or probing an asset', async () => {
  (workbenchSession.isAuthenticated as jest.Mock).mockResolvedValue(false);
  expect((await GET(new Request('http://localhost/api/workbench/verify-materialization?assetId=test'))).status).toBe(401);
  expect(getMedia).not.toHaveBeenCalled();
  expect(isPubliclyComplete).not.toHaveBeenCalled();
});
