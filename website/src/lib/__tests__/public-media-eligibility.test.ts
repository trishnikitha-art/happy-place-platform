import manifest from '@/config/media.v1.json';
import type { Media } from '@/types/media';
import { hasPublicMediaStructure, isPubliclyComplete } from '@/lib/media-contracts';
import { resolvePublicMedia } from '@/lib/media';
import { getPublishedMediaAssets } from '@/lib/visual-asset-registry';
import { getMedia, getMediaBatch, listMediaIds } from '@/lib/media-kv-store';

jest.mock('@/lib/media-kv-store', () => ({ getMedia: jest.fn(), getMediaBatch: jest.fn(), listMediaIds: jest.fn() }));
jest.mock('@/lib/assignment-store', () => ({ getAllServiceCardAssignments: async () => [] }));
jest.mock('@/lib/r2-storage', () => ({ verifyR2RenditionCompleteness: jest.fn(), getR2ObjectKey: jest.fn(), verifyR2Hash: jest.fn() }));

const valid = { ...manifest.media[0], source: 'local', lifecycleState: 'published', storage: 'static' } as Media;
beforeEach(() => { jest.clearAllMocks(); delete process.env.NEXT_PHASE; delete process.env.DEV_MODE_SKIP_KV; });

it('retains all committed static assets under the final public predicate', async () => {
  for (const media of manifest.media) {
    expect(await isPubliclyComplete(media as Media)).toBe(true);
  }
});

it.each([
  valid,
  { ...valid, storage: 'blob' },
  { ...valid, contentHash: 'a'.repeat(64) },
  { ...valid, variants: { ...valid.variants, original: '/images/unverified.jpg' } },
  { ...valid, variants: { original: valid.variants.original } },
  { ...valid, storage: 'r2', variants: { original: 'https://media.example.test/original.jpg' } },
])('Workbench assignability and public resolution agree for fixture %#', async record => {
  const media = record as Media;
  (getMedia as jest.Mock).mockResolvedValue(media);
  (listMediaIds as jest.Mock).mockResolvedValue([media.id]);
  (getMediaBatch as jest.Mock).mockResolvedValue(new Map([[media.id, media]]));
  const complete = await isPubliclyComplete(media);
  expect(!!await resolvePublicMedia(media.id)).toBe(complete);
  const result = await getPublishedMediaAssets();
  expect(result.available).toBe(true);
  expect(result.assets.map(asset => asset.id)).toEqual(complete ? [media.id] : []);
  const { verifyPublicMediaAuthority } = jest.requireActual('@/lib/media-kv-store');
  expect(await verifyPublicMediaAuthority(media)).toBe(complete);
});

it('keeps KV failure distinct from a successfully loaded empty eligible list', async () => {
  (listMediaIds as jest.Mock).mockRejectedValue(new Error('KV unavailable'));
  expect(await getPublishedMediaAssets()).toEqual({ available: false, assets: [], error: 'KV unavailable' });
});

it('requires the R2 original address to carry the claimed content identity', () => {
  const record = { ...valid, storage: 'r2', contentHash: 'a'.repeat(64), variants: { original: `https://media.example.test/nested/${'a'.repeat(64)}-original.jpg` } } as Media;
  expect(hasPublicMediaStructure(record)).toBe(true);
  expect(hasPublicMediaStructure({ ...record, contentHash: 'b'.repeat(64) })).toBe(false);
});

it.each([false, true])('explicit byte auditing returns the hash comparison result %s', async success => {
  const hash = 'a'.repeat(64);
  const record = { ...valid, storage: 'r2', contentHash: hash, dimensions: { width: 1080, height: 720 }, variants: {
    original: `https://media.example.test/nested/${hash}-original.jpg`, thumbnail: 'https://media.example.test/thumb.webp',
    webp: 'https://media.example.test/1080.webp', avif: 'https://media.example.test/1080.avif', blur: 'data:image/jpeg;base64,AA==',
    responsive: [480, 768, 1080].map(width => ({ width, webp: `https://media.example.test/${width}.webp`, avif: `https://media.example.test/${width}.avif` })),
  } } as Media;
  const { verifyR2RenditionCompleteness, getR2ObjectKey, verifyR2Hash } = require('@/lib/r2-storage');
  verifyR2RenditionCompleteness.mockResolvedValue({ complete: true });
  getR2ObjectKey.mockReturnValue(`nested/${hash}-original.jpg`);
  verifyR2Hash.mockResolvedValue({ success });
  const { verifyPublicMediaAuthority } = jest.requireActual('@/lib/media-kv-store');
  expect(await verifyPublicMediaAuthority(record, { verifyPhysicalBytes: true })).toBe(success);
  expect(verifyR2Hash).toHaveBeenCalledWith(`nested/${hash}-original.jpg`, hash);
});
