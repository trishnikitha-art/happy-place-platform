import { isPubliclyComplete } from '../media-contracts';
import { identifyStorageProvider, isAllowedVercelBlobUrl, legacyBlobOriginalMatchesHash } from '../media-storage-evidence';
import { getBlobMetadataByContentHash } from '@/lib/blob-storage';
import type { Media } from '@/types/media';

jest.mock('@/lib/blob-storage', () => ({
  ...jest.requireActual('@/lib/blob-storage'),
  getBlobMetadataByContentHash: jest.fn(),
}));

describe('legacy Vercel Blob public-media contract', () => {
  const hash = 'a'.repeat(64);
  const origin = 'https://store.public.blob.vercel-storage.com';
  const asset = (overrides: Partial<Media> = {}): Media => ({
    id: 'legacy-fence-photo', filename: 'fence.jpg', type: 'image', orientation: 'landscape',
    alt: 'Fence project', tags: [], roles: ['gallery'], source: 'local', lifecycleState: 'published',
    storage: 'blob', contentHash: hash, dimensions: { width: 100, height: 80 },
    variants: {
      original: `${origin}/fence-${hash.slice(0, 12)}.jpg`,
      thumbnail: `${origin}/fence-thumb.webp`,
      webp: `${origin}/fence.webp`,
      avif: `${origin}/fence.avif`,
      blur: 'data:image/webp;base64,AA==',
      responsive: [],
    },
    ...overrides,
  });
  let originalFetch: typeof fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchMock as typeof fetch;
    jest.mocked(getBlobMetadataByContentHash).mockImplementation(async (contentHash: string) => ({
      url: asset().variants.original!, contentHash, filename: 'fence-original.jpg',
      contentType: 'image/jpeg', uploadedAt: new Date(0).toISOString(), byteSize: 100,
    }));
  });
  afterEach(() => { global.fetch = originalFetch; });

  it('recognizes only canonical HTTPS Vercel Blob hosts and binds the original to the source hash prefix', () => {
    expect(isAllowedVercelBlobUrl(`${origin}/photo.jpg`)).toBe(true);
    expect(isAllowedVercelBlobUrl('https://store.public.blob.vercel-storage.com.attacker.invalid/a')).toBe(false);
    expect(isAllowedVercelBlobUrl('https://user@store.public.blob.vercel-storage.com/a')).toBe(false);
    expect(isAllowedVercelBlobUrl(`${origin}/a?redirect=https://attacker.invalid`)).toBe(false);
    expect(legacyBlobOriginalMatchesHash(asset().variants.original!, hash)).toBe(true);
    expect(legacyBlobOriginalMatchesHash(`${origin}/wrong-${'b'.repeat(12)}.jpg`, hash)).toBe(false);
    expect(identifyStorageProvider({ ...asset(), storage: 'r2' })).toMatchObject({ provider: 'unknown', reason: 'STORAGE_URL_MISMATCH' });
  });

  it('allows a content-addressed legacy record only when every required rendition is physically present', async () => {
    expect(await isPubliclyComplete(asset())).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('public.blob.vercel-storage.com'), {
      method: 'HEAD', redirect: 'manual',
    });
  });

  it('rejects a missing physical rendition without publishing the record', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      new Response(null, { status: url.endsWith('/fence-thumb.webp') ? 404 : 200 }));
    expect(await isPubliclyComplete(asset())).toBe(false);
  });

  it('rejects a missing metadata receipt that cannot bind the full content hash to the original URL', async () => {
    jest.mocked(getBlobMetadataByContentHash).mockResolvedValue(null);
    expect(await isPubliclyComplete(asset())).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a metadata receipt whose original URL or content hash differs', async () => {
    jest.mocked(getBlobMetadataByContentHash).mockResolvedValue({
      url: `${origin}/different-${hash.slice(0, 12)}.jpg`, contentHash: 'c'.repeat(64),
      filename: 'different.jpg', contentType: 'image/jpeg', uploadedAt: new Date(0).toISOString(), byteSize: 100,
    });
    expect(await isPubliclyComplete(asset())).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an arbitrary host before making any network request', async () => {
    const invalid = asset({ variants: {
      ...asset().variants,
      webp: 'https://attacker.invalid/fence.webp',
    } });
    expect(await isPubliclyComplete(invalid)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a noncanonical blur URL instead of loading it as a public variant', async () => {
    const invalid = asset({ variants: { ...asset().variants, blur: 'https://attacker.invalid/blur.png' } });
    expect(await isPubliclyComplete(invalid)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects redirects rather than following them to a new destination', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://attacker.invalid/' } }));
    expect(await isPubliclyComplete(asset())).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
