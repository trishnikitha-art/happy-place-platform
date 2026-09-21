import { POST } from '@/app/api/workbench/use-drive-asset/route';
import { POST as ingest } from '@/app/api/drive/ingest/route';
import { workbenchSession } from '@/lib/workbench-session';
import { getDriveClient } from '@/lib/drive/oauth-manager';
import { verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';
import { assignMediaBatch } from '@/lib/assignment-store';
import { AssignmentBatchError } from '@/lib/workbench-assignment-contract';
import { Redis } from '@upstash/redis';

const mockSet = jest.fn();
const mockEval = jest.fn();
const mockMetadata = jest.fn();
jest.mock('@upstash/redis', () => ({ Redis: jest.fn().mockImplementation(() => ({ set: mockSet, eval: mockEval })) }));
jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('@/lib/drive/oauth-manager', () => ({ getDriveClient: jest.fn() }));
jest.mock('@/lib/drive/corpus-authorization', () => ({ verifyCorpusAuthorization: jest.fn() }));
jest.mock('@/lib/assignment-store', () => ({ assignMediaBatch: jest.fn() }));
jest.mock('@/app/api/drive/ingest/route', () => ({ POST: jest.fn() }));

const originalEnv = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
const input = { sourceFileId: 'source-file', sourceCorpusId: 'shared-drive', sourceSharedDriveId: 'shared-drive',
  targetSlotIds: ['hero-background', 'homepage-service-card-slot-decks'],
  slotRevisions: [{ slotId: 'hero-background', expectedRevision: 4 }, { slotId: 'homepage-service-card-slot-decks', expectedRevision: 2 }] };
async function request(body: unknown = input) {
  const response = await POST(new Request('http://localhost/api/workbench/use-drive-asset', {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie: 'existing-session' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(Redis).mockImplementation(() => ({ set: mockSet, eval: mockEval }) as any);
  process.env.KV_REST_API_URL = 'https://test.invalid';
  process.env.KV_REST_API_TOKEN = 'test-only';
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
  jest.mocked(getDriveClient).mockResolvedValue({ files: { get: mockMetadata } } as any);
  mockMetadata.mockResolvedValue({ data: { id: 'source-file', name: 'source.jpg', mimeType: 'image/jpeg', driveId: 'shared-drive' } });
  jest.mocked(verifyCorpusAuthorization).mockResolvedValue({ authorized: true });
  mockSet.mockResolvedValue('OK');
  mockEval.mockResolvedValue(1);
  jest.mocked(ingest).mockImplementation(async () => Response.json({ mediaId: 'published-id', media: { id: 'published-id' } }) as any);
  jest.mocked(assignMediaBatch).mockResolvedValue({ success: true, committed: true, verified: true,
    operationId: 'batch-id', canonicalMediaId: 'published-id', replayed: false, slotResults: [], verificationResults: [] });
});
afterAll(() => {
  if (originalEnv.url === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = originalEnv.url;
  if (originalEnv.token === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = originalEnv.token;
});

describe('Drive handoff behavior', () => {
  it('authenticates before source access or assignment', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
    expect((await request()).status).toBe(401);
    expect(mockMetadata).not.toHaveBeenCalled();
    expect(ingest).not.toHaveBeenCalled();
    expect(assignMediaBatch).not.toHaveBeenCalled();
  });
  it.each([
    { ...input, sourceFileId: undefined },
    { ...input, targetSlotIds: [] },
    { ...input, slotRevisions: [] },
    { ...input, targetSlotIds: ['not-registered'], slotRevisions: [{ slotId: 'not-registered', expectedRevision: 0 }] },
    { ...input, targetSlotIds: ['hero-background', 'hero-background'] },
    { ...input, slotRevisions: [{ slotId: 'hero-background', expectedRevision: '4' }, input.slotRevisions[1]] },
  ])('rejects invalid source/targets/revisions before materialization', async body => {
    expect((await request(body)).status).toBe(400);
    expect(mockMetadata).not.toHaveBeenCalled();
    expect(ingest).not.toHaveBeenCalled();
    expect(assignMediaBatch).not.toHaveBeenCalled();
  });
  it('passes authoritative file/corpus and the request session to existing ingest, then assigns once', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(ingest).toHaveBeenCalledTimes(1);
    const ingestRequest = jest.mocked(ingest).mock.calls[0][0];
    expect(ingestRequest.headers.get('cookie')).toBe('existing-session');
    expect(await ingestRequest.json()).toEqual({ fileId: 'source-file', sharedDriveId: 'shared-drive', roles: ['gallery'] });
    expect(assignMediaBatch).toHaveBeenCalledTimes(1);
    expect(assignMediaBatch).toHaveBeenCalledWith('published-id', [
      { slotId: 'hero-background', serviceSlug: 'brand-hero-background', expectedRevision: 4 },
      { slotId: 'homepage-service-card-slot-decks', serviceSlug: 'decks', expectedRevision: 2 },
    ]);
    expect(response.body).toMatchObject({ committed: true, verified: true, operationId: 'batch-id' });
  });
  it('fails closed if the Drive session cannot provide a client', async () => {
    jest.mocked(getDriveClient).mockRejectedValue(new Error('Drive session missing'));
    expect((await request()).status).toBe(500);
    expect(ingest).not.toHaveBeenCalled();
    expect(assignMediaBatch).not.toHaveBeenCalled();
  });
  it.each([{ sourceCorpusId: 'other' }, { sourceSharedDriveId: 'other' }])('rejects mismatched corpus assertions', async overrides => {
    expect((await request({ ...input, ...overrides })).status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
    expect(assignMediaBatch).not.toHaveBeenCalled();
  });
  it('rejects unauthorized corpus', async () => {
    jest.mocked(verifyCorpusAuthorization).mockResolvedValue({ authorized: false });
    expect((await request()).status).toBe(403);
    expect(ingest).not.toHaveBeenCalled();
    expect(assignMediaBatch).not.toHaveBeenCalled();
  });
  it('preserves shortcut lineage and sends its target through ingest authorization', async () => {
    mockMetadata.mockResolvedValue({ data: { id: 'source-file', mimeType: 'application/vnd.google-apps.shortcut',
      driveId: 'shared-drive', shortcutDetails: { targetId: 'target-file' } } });
    expect((await request()).status).toBe(200);
    expect(await jest.mocked(ingest).mock.calls[0][0].json()).toMatchObject({
      fileId: 'target-file', originalShortcutId: 'source-file', sharedDriveId: 'shared-drive',
    });
  });
  it('does not assign after an ingest error', async () => {
    jest.mocked(ingest).mockImplementation(async () => Response.json({ error: 'IMAGE_INVALID' }, { status: 400 }) as any);
    expect((await request()).status).toBe(400);
    expect(assignMediaBatch).not.toHaveBeenCalled();
    expect(mockEval).toHaveBeenCalledTimes(1);
  });
  it('rejects a mismatched ingest identity', async () => {
    jest.mocked(ingest).mockImplementation(async () => Response.json({ mediaId: 'a', media: { id: 'b' } }) as any);
    expect((await request()).status).toBe(502);
    expect(assignMediaBatch).not.toHaveBeenCalled();
  });
  it('propagates CAS conflicts and verification failures without claiming success', async () => {
    jest.mocked(assignMediaBatch).mockRejectedValue(new AssignmentBatchError('REVISION_CONFLICT', 'stale', 409));
    const response = await request();
    expect(response.status).toBe(409);
    expect(response.body.success).toBeUndefined();
    expect(response.body.committed).toBe(false);
  });
  it('preserves committed/unknown outcome details from the shared operation', async () => {
    jest.mocked(assignMediaBatch).mockRejectedValue(new AssignmentBatchError('ASSIGNMENT_VERIFICATION_UNAVAILABLE', 'readback unavailable', 503,
      { operationId: 'receipt', committed: true, retrySameRequest: true }));
    const response = await request();
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ committed: true, operationId: 'receipt', retrySameRequest: true });
  });
  it('does not execute while another request owns the materialization lock', async () => {
    mockSet.mockResolvedValue(null);
    expect((await request()).status).toBe(409);
    expect(ingest).not.toHaveBeenCalled();
    expect(assignMediaBatch).not.toHaveBeenCalled();
    expect(mockEval).not.toHaveBeenCalled();
  });
  it('releases only its own lock on success and tolerates release failure', async () => {
    mockEval.mockRejectedValue(new Error('Redis unavailable after commit'));
    expect((await request()).status).toBe(200);
    expect(mockEval.mock.calls[0][2][0]).toBe(mockSet.mock.calls[0][1]);
    expect(mockEval.mock.calls[0][0]).toContain("redis.call(\"GET\", KEYS[1]) == ARGV[1]");
  });
  it('rechecks authorization and uses the shared receipt on retry instead of cached success', async () => {
    expect((await request()).status).toBe(200);
    jest.mocked(assignMediaBatch).mockResolvedValue({ success: true, committed: true, verified: true,
      operationId: 'batch-id', canonicalMediaId: 'published-id', replayed: true, slotResults: [], verificationResults: [] });
    expect((await request()).body.replayed).toBe(true);
    expect(getDriveClient).toHaveBeenCalledTimes(2);
    expect(assignMediaBatch).toHaveBeenCalledTimes(2);
  });
});
