import { resolvePublicMedia } from '../media';
import { getMedia, getMediaBatch, listMediaIds } from '../media-kv-store';
import { getR2PublicOrigin } from '../r2-public-origin';
import { getPublishedMediaAssets } from '../visual-asset-registry';
import { verifyR2ObjectExists, verifyR2RenditionCompleteness } from '../r2-storage';
import type { Media } from '@/types/media';

jest.mock('../media-kv-store', () => ({ getMedia: jest.fn(), getMediaBatch: jest.fn(), listMediaIds: jest.fn() }));
jest.mock('../assignment-store', () => ({ getAllServiceCardAssignments: jest.fn(async () => []) }));
jest.mock('../r2-storage', () => ({
  verifyR2ObjectExists: jest.fn(), verifyR2RenditionCompleteness: jest.fn(),
}));

const oldOrigin = 'https://historical-bucket.r2.dev';
const canonical = 'https://media.happyplacecarpentry.com';
const sourceHash = 'a'.repeat(64);
const url = (hash: string, ext = 'webp') => `${oldOrigin}/${hash.repeat(64)}-original.${ext}`;
const published = {
  id: 'published-fence', source: 'local', storage: 'r2', lifecycleState: 'published',
  contentHash: sourceHash, dimensions: { width: 480, height: 320 },
  provenance: { driveFileId: 'authorized-file', sharedDriveId: 'authorized-corpus' },
  variants: {
    original: url('a', 'jpg'), web: url('b'), webp: url('b'), avif: url('c', 'avif'),
    thumbnail: url('d'), blur: url('e'),
    responsive: [{ width: 480, webp: url('b'), avif: url('c', 'avif') }],
  },
} as Media;
const savedOrigin = process.env.R2_PUBLIC_BASE_URL;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NEXT_PHASE; delete process.env.DEV_MODE_SKIP_KV;
  process.env.R2_PUBLIC_BASE_URL = canonical;
  jest.mocked(getMedia).mockResolvedValue(structuredClone(published));
  jest.mocked(listMediaIds).mockResolvedValue([published.id]);
  jest.mocked(getMediaBatch).mockResolvedValue(new Map([[published.id, structuredClone(published)]]));
  jest.mocked(verifyR2ObjectExists).mockResolvedValue(true);
  jest.mocked(verifyR2RenditionCompleteness).mockResolvedValue({ complete: true } as never);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  if (savedOrigin === undefined) delete process.env.R2_PUBLIC_BASE_URL;
  else process.env.R2_PUBLIC_BASE_URL = savedOrigin;
});

it('serves every rendition through the canonical origin without rewriting stored authority', async () => {
  const stored = structuredClone(published);
  jest.mocked(getMedia).mockResolvedValue(stored);
  const result = await resolvePublicMedia(published.id);
  expect(result?.variants.original).toBe(`${canonical}/${sourceHash}-original.jpg`);
  expect(result?.variants).toEqual({
    original: `${canonical}/${sourceHash}-original.jpg`,
    web: `${canonical}/${'b'.repeat(64)}-original.webp`,
    webp: `${canonical}/${'b'.repeat(64)}-original.webp`,
    avif: `${canonical}/${'c'.repeat(64)}-original.avif`,
    thumbnail: `${canonical}/${'d'.repeat(64)}-original.webp`,
    blur: `${canonical}/${'e'.repeat(64)}-original.webp`,
    responsive: [{ width: 480, webp: `${canonical}/${'b'.repeat(64)}-original.webp`, avif: `${canonical}/${'c'.repeat(64)}-original.avif` }],
  });
  expect(stored).toEqual(published);
  expect(result?.provenance).toEqual(published.provenance);
  expect(verifyR2ObjectExists).toHaveBeenCalledWith(`${sourceHash}-original.jpg`);
});

it('supports switching back to the prior public origin without record mutation', async () => {
  process.env.R2_PUBLIC_BASE_URL = oldOrigin;
  expect(await resolvePublicMedia(published.id)).toEqual(published);
});

it('uses the canonical public projection for existing Workbench media previews', async () => {
  const result = await getPublishedMediaAssets();
  expect(result.available).toBe(true);
  expect(result.assets[0].variants.original).toBe(`${canonical}/${sourceHash}-original.jpg`);
  expect(result.assets[0].physicalPath).toBe(`${canonical}/${sourceHash}-original.jpg`);
});

it('omits incomplete R2 assets from the published Workbench preview list', async () => {
  jest.mocked(verifyR2RenditionCompleteness).mockResolvedValue({ complete: false } as never);
  expect((await getPublishedMediaAssets()).assets).toEqual([]);
});

it('requires complete physical renditions before projecting URLs', async () => {
  jest.mocked(verifyR2RenditionCompleteness).mockResolvedValue({ complete: false } as never);
  expect(await resolvePublicMedia(published.id)).toBeNull();
});

it.each(['source_reference', 'materializing', 'stale'])('does not promote %s media through URL rewriting', async state => {
  jest.mocked(getMedia).mockResolvedValue({ ...published, lifecycleState: state } as Media);
  expect(await resolvePublicMedia(published.id)).toBeNull();
});

it.each([
  'https://drive.google.com/file/d/source',
  `${oldOrigin}/${sourceHash}-original.jpg?secret=value`,
  `${oldOrigin}/${'f'.repeat(64)}-original.jpg`,
  '/api/drive/files/source',
])('rejects an original without the verified content-addressed source identity: %s', async original => {
  jest.mocked(getMedia).mockResolvedValue({ ...published, variants: { ...published.variants, original } });
  expect(await resolvePublicMedia(published.id)).toBeNull();
});

it('rejects missing canonical configuration', async () => {
  delete process.env.R2_PUBLIC_BASE_URL;
  expect(await resolvePublicMedia(published.id)).toBeNull();
});

it.each([
  'http://media.example.com', 'https://user:password@media.example.com',
  'https://media.example.com/path', 'https://media.example.com?query=1',
  'https://media.example.com#fragment', 'https://*.example.com',
  'https://account.r2.cloudflarestorage.com',
])('rejects noncanonical origin configuration: %s', origin => {
  expect(() => getR2PublicOrigin(origin)).toThrow();
});

it('permits only the configured HTTPS origin in Next.js image optimization', () => {
  jest.isolateModules(() => {
    const config = require('../../../next.config').default;
    expect(config.images.remotePatterns.map((pattern: URL) => pattern.href)).toEqual([`${canonical}/**`]);
  });
});
