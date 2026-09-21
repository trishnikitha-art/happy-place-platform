import { Redis } from '@upstash/redis';

const base = process.env.NEXT_PUBLIC_TEST_BASE_URL;
const ns = process.env.TEST_NAMESPACE!;
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const assignmentKey = () => `${ns}service-card-assignment:brand-hero-background`;
let cookie = '';
beforeAll(async () => {
  if (!base || !/^hpp:(test|ci-test|audit):/.test(ns || '')) throw new Error('HTTP server and isolated test Redis are required.');
  const response = await fetch(`${base}/api/workbench/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.WORKBENCH_PASSWORD }),
  });
  expect(response.status).toBe(200);
  cookie = response.headers.get('set-cookie')?.split(';')[0] || '';
});

describe('Workbench mutation HTTP guards', () => {
  it.each(['assign-media', 'use-drive-asset'])('rejects unauthenticated %s without mutating Redis', async route => {
    const before = await redis.get(assignmentKey());
    const response = await fetch(`${base}/api/workbench/${route}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: 'hero-background', targetSlotId: 'hero-background', expectedRevision: 0, mediaId: 'drive-ref', sourceFileId: 'file' }),
    });
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe('WORKBENCH_AUTH_REQUIRED');
    expect(await redis.get(assignmentKey())).toEqual(before);
  });
  it.each([
    [{ sourceFileId: 'file', targetSlotId: 'hero-background' }, 'INVALID_REVISION'],
    [{ sourceFileId: 'file', targetSlotId: 'unregistered', expectedRevision: 0 }, 'INVALID_TARGET_SLOT'],
    [{ sourceFileId: 'file', targetSlotIds: ['hero-background', 'hero-background'], slotRevisions: [] }, 'DUPLICATE_TARGET'],
    [{ sourceFileId: 'file', targetSlotIds: ['hero-background'], slotRevisions: [{ slotId: 'other', expectedRevision: 0 }] }, 'SLOT_REVISIONS_REQUIRED'],
  ])('rejects malformed Drive targets before attempting source access', async (payload, code) => {
    const before = await redis.get(assignmentKey());
    const response = await fetch(`${base}/api/workbench/use-drive-asset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(payload),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(code);
    expect(await redis.get(assignmentKey())).toEqual(before);
  });
});
