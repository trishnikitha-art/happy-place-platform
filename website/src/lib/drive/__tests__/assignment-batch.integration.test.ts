import { Redis } from '@upstash/redis';
import { POST } from '@/app/api/workbench/assign-media/route';
import { saveMedia } from '@/lib/media-kv-store';
import { resolveAssignmentKey } from '@/lib/workbench-assignment-contract';

// In direct mode only WB auth is stubbed; the media gate, store, and Lua are real.
// HTTP mode logs in to the running server and exercises its real WB session.
jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: async () => true } }));

const ns = process.env.TEST_NAMESPACE!;
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const base = process.env.NEXT_PUBLIC_TEST_BASE_URL;
const ids = ['hero-background', 'homepage-service-card-slot-decks', 'homepage-service-card-slot-repairs'];
const key = (slotId: string) => `${ns}service-card-assignment:${resolveAssignmentKey(slotId)}`;
const mediaId = 'editor-test-published-a';
const otherMedia = 'editor-test-published-b';
let cookie = '';

const body = (revisions: unknown[] = [5, 8, 3], media = mediaId, slots = ids) => ({
  mediaId: media, slotIds: slots,
  slotRevisions: slots.map((slotId, i) => ({ slotId, expectedRevision: revisions[i] })),
});
async function request(payload: unknown) {
  const init = { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(payload) };
  const response = base ? await fetch(`${base}/api/workbench/assign-media`, init)
    : await POST(new Request('http://localhost/api/workbench/assign-media', init));
  return { status: response.status, body: await response.json() };
}
async function read() { return redis.mget<Array<{ mediaId: string; revision: number }>>(...ids.map(key)); }

beforeAll(async () => {
  if (!ns || !/^hpp:(test|ci-test|audit):/.test(ns)) throw new Error('An isolated test namespace is required.');
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) throw new Error('Real Redis credentials are required.');
  if (base) {
    if (!process.env.WORKBENCH_PASSWORD) throw new Error('HTTP mode requires a test Workbench password.');
    const response = await fetch(`${base}/api/workbench/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.WORKBENCH_PASSWORD }),
    });
    expect(response.status).toBe(200);
    cookie = response.headers.get('set-cookie')?.split(';')[0] || '';
    expect(cookie).toContain('workbench_session_id=');
  }
  for (const id of [mediaId, otherMedia]) {
    await saveMedia({ id, filename: `${id}.jpg`, type: 'image', orientation: 'landscape',
      alt: 'Integration fixture', description: '', tags: [], roles: [],
      source: 'local', classification: 'hero', lifecycleState: 'published', storage: 'static',
      contentHash: `fixture-${id}`, dimensions: { width: 1920, height: 1080 },
      variants: { original: '/images/test.jpg', webp: '/images/test.webp', thumbnail: '/images/test-thumb.jpg' },
      usageSlots: [], physicalPath: '/images/test.jpg', physicalStatus: 'PHYSICAL_PRESENT',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } as any);
  }
});

beforeEach(async () => {
  const receipts = await redis.keys(`${ns}assignment-operation:*`);
  if (receipts.length) await redis.del(...receipts);
  for (const [i, revision] of [5, 8, 3].entries()) {
    await redis.set(key(ids[i]), {
      serviceSlug: resolveAssignmentKey(ids[i]), revision, mediaId: 'old-media',
      source: 'workbench', actor: 'workbench', updatedAt: new Date().toISOString(),
    });
  }
});

describe(base ? 'Real HTTP + Redis batch assignment' : 'Real Redis batch assignment', () => {
  it('commits all canonical keys and verifies exact revision progression', async () => {
    const result = await request(body());
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ committed: true, verified: true, replayed: false, canonicalMediaId: mediaId });
    expect(result.body.operationId).toMatch(/^[a-f0-9]{64}$/);
    expect(result.body.slotResults).toHaveLength(3);
    expect((await read()).map(a => a.revision)).toEqual([6, 9, 4]);
    expect((await read()).map(a => a.mediaId)).toEqual([mediaId, mediaId, mediaId]);
    expect(await redis.get(`${ns}service-card-assignment:${ids[1]}`)).toBeNull();
  });
  it.each([[4, 8, 3], [5, 7, 3], [5, 8, 2]])('rejects a stale slot anywhere without any writes: %j', async (...revisions) => {
    const before = await read();
    const result = await request(body(revisions));
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: 'REVISION_CONFLICT', committed: false });
    expect(await read()).toEqual(before);
  });
  it('rejects duplicate targets before writing', async () => {
    const before = await read();
    expect((await request(body([5, 5, 3], mediaId, [ids[0], ids[0], ids[2]]))).status).toBe(400);
    expect(await read()).toEqual(before);
  });
  it('rejects a missing slot and incomplete or duplicate revision maps', async () => {
    const before = await read();
    expect((await request(body([5, 0, 3], mediaId, [ids[0], 'missing-slot', ids[2]]))).status).toBe(400);
    expect((await request({ ...body(), slotRevisions: body().slotRevisions.slice(1) })).status).toBe(400);
    expect((await request({ ...body(), slotRevisions: [body().slotRevisions[0], body().slotRevisions[0], body().slotRevisions[2]] })).status).toBe(400);
    expect(await read()).toEqual(before);
  });
  it.each(['not-a-number', '8', -1, 1.5, null])('rejects malformed revision %s before writing', async revision => {
    const before = await read();
    expect((await request(body([5, revision, 3]))).status).toBe(400);
    expect(await read()).toEqual(before);
  });
  it.each(['missing-published-asset', 'drive-file-reference'])('rejects invalid media %s without writing', async source => {
    const before = await read();
    expect((await request(body([5, 8, 3], source))).status).toBe(400);
    expect(await read()).toEqual(before);
  });
  it('retries the exact request without incrementing revisions again', async () => {
    const first = await request(body());
    const after = await read();
    const second = await request(body());
    expect(second.status).toBe(200);
    expect(second.body.operationId).toBe(first.body.operationId);
    expect(second.body.replayed).toBe(true);
    expect(await read()).toEqual(after);
  });
  it('treats reordered targets as the same operation', async () => {
    const first = await request(body());
    const result = await request(body([3, 8, 5], mediaId, [...ids].reverse()));
    expect(result.status).toBe(200);
    expect(result.body.operationId).toBe(first.body.operationId);
    expect(result.body.replayed).toBe(true);
  });
  it('allows only one competing batch to commit', async () => {
    const results = await Promise.all([request(body()), request(body([5, 8, 3], otherMedia))]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const winner = results.find(r => r.status === 200)!.body.canonicalMediaId;
    expect((await read()).map(a => a.mediaId)).toEqual([winner, winner, winner]);
    expect((await read()).map(a => a.revision)).toEqual([6, 9, 4]);
  });
  it('reports committed-but-mismatched readback when a retry has been superseded', async () => {
    expect((await request(body())).status).toBe(200);
    expect((await request(body([6, 9, 4], otherMedia))).status).toBe(200);
    const result = await request(body());
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: 'ASSIGNMENT_VERIFICATION_MISMATCH', committed: true });
    expect(result.body.verificationResults.every((r: { verified: boolean }) => !r.verified)).toBe(true);
    expect((await read()).map(a => a.mediaId)).toEqual([otherMedia, otherMedia, otherMedia]);
  });
  it('rejects a corrupt middle assignment without changing the others', async () => {
    await redis.set(key(ids[1]), '{broken-json');
    const before = await read();
    expect((await request(body())).status).toBe(409);
    expect(await read()).toEqual(before);
  });
  it('creates only when the expected revision is explicitly zero', async () => {
    await redis.del(...ids.map(key));
    expect((await request(body([0, 0, 0]))).status).toBe(200);
    expect((await read()).map(a => a.revision)).toEqual([1, 1, 1]);
  });
});
