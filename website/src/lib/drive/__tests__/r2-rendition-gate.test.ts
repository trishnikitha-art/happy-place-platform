import { verifyR2RenditionCompleteness } from '@/lib/r2-storage';
import { resolvePublicMedia } from '@/lib/media';
import { getMedia } from '@/lib/media-kv-store';
import { getExplorerNextPageToken } from '../explorer-pagination';
import { createHash } from 'crypto';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  HeadObjectCommand: jest.fn((input) => ({ input })),
}));
jest.mock('@/lib/media-kv-store', () => ({ getMedia: jest.fn() }));

describe('Required R2 renditions and public assignment boundary', () => {
  const objectKey = (key: string) => `${key === 'original' ? 'a'.repeat(64) : createHash('sha256').update(key).digest('hex')}-original.${key.includes('avif') ? 'avif' : 'webp'}`;
  const url = (key: string) => `https://bucket.r2.dev/${objectKey(key)}`;
  const asset = {
    id: 'content-id', contentHash: 'a'.repeat(64), source: 'local', storage: 'r2', lifecycleState: 'published',
    dimensions: { width: 480, height: 320 },
    variants: {
      original: url('original'), thumbnail: url('thumbnail'), blur: url('blur'),
      web: url('webp'), webp: url('webp'), avif: url('avif'),
      responsive: [{ width: 480, webp: url('480-webp'), avif: url('480-avif') }],
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.R2_ACCOUNT_ID = 'test'; process.env.R2_ACCESS_KEY_ID = 'test';
    process.env.R2_SECRET_ACCESS_KEY = 'test'; process.env.R2_BUCKET_NAME = 'test';
    process.env.R2_PUBLIC_BASE_URL = 'https://bucket.r2.dev';
    delete process.env.DEV_MODE_SKIP_KV; delete process.env.NEXT_PHASE;
    mockSend.mockResolvedValue({});
    jest.mocked(getMedia).mockResolvedValue(asset as never);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('accepts a complete physically present asset using HEAD only', async () => {
    expect(await resolvePublicMedia(asset.id)).toEqual(asset);
    expect(mockSend.mock.calls.map(([command]) => command.input.Key)).toEqual(expect.arrayContaining([objectKey('blur'), objectKey('480-webp'), objectKey('480-avif')]));
  });
  it.each(['original', 'thumbnail', 'blur', 'webp', 'avif', '480-webp', '480-avif'])(
    'rejects public assignment when %s is absent even if original exists', async (missing) => {
      mockSend.mockImplementation(async command => {
        if (command.input.Key === objectKey(missing)) throw new Error('NoSuchKey');
        return {};
      });
      expect((await verifyR2RenditionCompleteness(asset)).complete).toBe(false);
      expect(await resolvePublicMedia(asset.id)).toBeNull();
    },
  );
  it('rejects structurally missing responsive widths', async () => {
    jest.mocked(getMedia).mockResolvedValue({ ...asset, variants: { ...asset.variants, responsive: [] } } as never);
    expect(await resolvePublicMedia(asset.id)).toBeNull();
  });
  it('preserves DriveReference and Drive-prefixed ID rejection', async () => {
    expect(await resolvePublicMedia('drive-file')).toBeNull();
    jest.mocked(getMedia).mockResolvedValue({ ...asset, lifecycleState: 'source_reference', source: 'google-drive' } as never);
    expect(await resolvePublicMedia(asset.id)).toBeNull();
  });
});

describe('Explorer independent continuation tokens', () => {
  it('uses search token while searching and folder token after clearing search', () => {
    const state = { activeSearchQuery: 'fence', folderNextPageToken: 'folder-page', searchNextPageToken: 'search-page' };
    expect(getExplorerNextPageToken(state)).toBe('search-page');
    expect(getExplorerNextPageToken({ ...state, activeSearchQuery: '' })).toBe('folder-page');
  });
  it('does not continue a folder after exhausting search results', () => {
    expect(getExplorerNextPageToken({ activeSearchQuery: 'fence', folderNextPageToken: 'folder-page' })).toBeUndefined();
  });
});
