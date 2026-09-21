import { assignMediaBatch } from '@/lib/assignment-store';
import { resolvePublicMedia } from '@/lib/media';
import { prepareAssignmentTargets } from '@/lib/workbench-assignment-contract';
import { Redis } from '@upstash/redis';

const mockEval = jest.fn();
const mockMget = jest.fn();
jest.mock('@upstash/redis', () => ({ Redis: jest.fn().mockImplementation(() => ({ eval: mockEval, mget: mockMget })) }));
jest.mock('@/lib/media', () => ({ resolvePublicMedia: jest.fn() }));

const targets = prepareAssignmentTargets({ slotId: 'hero-background', expectedRevision: 4 });
const originalEnv = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(Redis).mockImplementation(() => ({ eval: mockEval, mget: mockMget }) as any);
  process.env.KV_REST_API_URL = 'https://test.invalid';
  process.env.KV_REST_API_TOKEN = 'test-only';
  jest.mocked(resolvePublicMedia).mockResolvedValue({ id: 'published' } as any);
  mockEval.mockImplementation(async (_script, _keys, args) => [0, JSON.parse(args[2])]);
  mockMget.mockResolvedValue([{ serviceSlug: 'brand-hero-background', mediaId: 'published', revision: 5 }]);
});
afterAll(() => {
  if (originalEnv.url === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = originalEnv.url;
  if (originalEnv.token === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = originalEnv.token;
});

describe('Published-media assignment boundary', () => {
  it.each(['drive-source', 'drive-ref-source', ''])('rejects non-public ID %s before Redis', async id => {
    await expect(assignMediaBatch(id, targets)).rejects.toMatchObject({ code: 'INVALID_MEDIA' });
    expect(mockEval).not.toHaveBeenCalled();
  });
  it.each([null, { id: 'wrong-asset' }])('rejects absent or mismatched public media before writes', async media => {
    jest.mocked(resolvePublicMedia).mockResolvedValue(media as any);
    await expect(assignMediaBatch('published', targets)).rejects.toMatchObject({ code: 'INVALID_MEDIA' });
    expect(mockEval).not.toHaveBeenCalled();
  });
  it('validates public media once, before commit, then reads all affected keys', async () => {
    const result = await assignMediaBatch('published', targets);
    expect(result).toMatchObject({ success: true, committed: true, verified: true });
    expect(resolvePublicMedia).toHaveBeenCalledTimes(1);
    expect(jest.mocked(resolvePublicMedia).mock.invocationCallOrder[0]).toBeLessThan(mockEval.mock.invocationCallOrder[0]);
    expect(mockEval.mock.invocationCallOrder[0]).toBeLessThan(mockMget.mock.invocationCallOrder[0]);
    expect(mockMget.mock.calls[0]).toHaveLength(1);
  });
  it('decodes both string and already-decoded Redis receipts', async () => {
    mockEval.mockImplementationOnce(async (_s, _k, args) => [0, args[2]]);
    expect((await assignMediaBatch('published', targets)).verified).toBe(true);
    expect((await assignMediaBatch('published', targets)).verified).toBe(true);
  });
  it.each([
    null, { serviceSlug: 'brand-hero-background', mediaId: 'different', revision: 5 },
    { serviceSlug: 'brand-hero-background', mediaId: 'published', revision: 6 },
    { serviceSlug: 'wrong-key', mediaId: 'published', revision: 5 },
  ])('refuses success for mismatched final state %j', async assignment => {
    mockMget.mockResolvedValue([assignment]);
    await expect(assignMediaBatch('published', targets)).rejects.toMatchObject({
      code: 'ASSIGNMENT_VERIFICATION_MISMATCH', status: 409, details: { committed: true },
    });
  });
  it('distinguishes a lost commit acknowledgement from a rejected write', async () => {
    mockEval.mockRejectedValue(new Error('connection lost'));
    await expect(assignMediaBatch('published', targets)).rejects.toMatchObject({
      code: 'ASSIGNMENT_OUTCOME_UNKNOWN', details: { committed: 'unknown', retrySameRequest: true },
    });
  });
  it('reports readback unavailability as committed with a safe exact-request retry', async () => {
    mockMget.mockRejectedValue(new Error('connection lost'));
    await expect(assignMediaBatch('published', targets)).rejects.toMatchObject({
      code: 'ASSIGNMENT_VERIFICATION_UNAVAILABLE', details: { committed: true, retrySameRequest: true },
    });
  });
  it('returns conflict without pretending any assignments committed', async () => {
    mockEval.mockResolvedValue([3, 'hero-background', '7']);
    await expect(assignMediaBatch('published', targets)).rejects.toMatchObject({
      code: 'REVISION_CONFLICT', details: { committed: false, actualRevision: 7 },
    });
    expect(mockMget).not.toHaveBeenCalled();
  });
});
