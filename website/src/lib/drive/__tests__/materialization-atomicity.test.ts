import { POST } from '@/app/api/drive/ingest/route';
import { driveDiscovery } from '../drive-discovery';
import { storeMedia, findMediaByContentHash, createRedisClient } from '@/lib/media-kv-store';
import { verifyR2Hash, verifyR2RenditionCompleteness, uploadToR2 } from '@/lib/r2-storage';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import sharp from 'sharp';
import type { Media } from '@/types/media';

jest.mock('../drive-discovery', () => ({ driveDiscovery: { getFile: jest.fn(), downloadFile: jest.fn() } }));
jest.mock('../drive-session', () => ({ driveSession: { isAuthenticated: async () => true } }));
jest.mock('@/lib/workbench-session', () => ({ workbenchSession: {
  isAuthenticated: async () => true, getSessionIdentity: async () => ({ email: 'test@example.com' }),
} }));
jest.mock('../corpus-authorization', () => ({ verifyCorpusAuthorization: async () => ({ authorized: true }) }));
jest.mock('@/lib/media-kv-store', () => ({
  createRedisClient: jest.fn(), namespacedKey: (key: string) => `test:${key}`,
  storeMedia: jest.fn(), findMediaByContentHash: jest.fn(), getMedia: jest.fn(),
}));
jest.mock('@/lib/r2-storage', () => ({
  uploadToR2: jest.fn(), verifyR2Hash: jest.fn(),
  verifyR2ObjectExists: async () => true, verifyR2RenditionCompleteness: jest.fn(),
}));

describe('materialization atomicity behavior', () => {
  let bytes: Buffer;
  let lease: any;
  const redis = {
    set: jest.fn(async (_key: string, value: string) => {
      if (lease) return null;
      lease = JSON.parse(value); return 'OK';
    }),
    get: jest.fn(async () => lease),
    eval: jest.fn(async (_script: string, _keys: string[], args: any[]) => {
      if (!lease || lease.status !== args[0] || lease.ownerToken !== args[1]) return 0;
      lease = JSON.parse(args[2]); return 1;
    }),
  };
  const ingest = () => POST(new Request('https://test/api/drive/ingest', {
    method: 'POST', body: JSON.stringify({ fileId: 'authorized-file', sharedDriveId: 'corpus' }),
  }));

  beforeAll(async () => {
    bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: 'red' } }).jpeg().toBuffer();
  });
  beforeEach(() => {
    jest.clearAllMocks(); lease = null;
    process.env.R2_ACCOUNT_ID = 'test'; process.env.R2_BUCKET_NAME = 'test';
    process.env.R2_ACCESS_KEY_ID = 'test'; process.env.R2_SECRET_ACCESS_KEY = 'test';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.mocked(createRedisClient).mockReturnValue(redis as never);
    jest.mocked(driveDiscovery.getFile).mockResolvedValue({ name: 'photo.jpg', mimeType: 'image/jpeg' } as never);
    jest.mocked(driveDiscovery.downloadFile).mockResolvedValue(bytes);
    jest.mocked(findMediaByContentHash).mockResolvedValue(null);
    jest.mocked(uploadToR2).mockImplementation(async (buffer, _mime, ext) => {
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      return { url: `https://bucket.r2.dev/${hash}-original.${ext}`, contentHash: hash, uploadedAt: new Date().toISOString() };
    });
    jest.mocked(verifyR2Hash).mockResolvedValue({ success: true });
    jest.mocked(verifyR2RenditionCompleteness).mockResolvedValue({ complete: true } as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('keeps the public record absent when Drive download fails', async () => {
    jest.mocked(driveDiscovery.downloadFile).mockRejectedValue(new Error('Drive unavailable'));
    expect((await ingest()).status).toBe(500);
    expect(uploadToR2).not.toHaveBeenCalled();
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });

  it('keeps the public record absent when image metadata/decode fails', async () => {
    jest.mocked(driveDiscovery.downloadFile).mockResolvedValue(Buffer.from('not an image'));
    expect((await ingest()).status).toBe(400);
    expect(uploadToR2).not.toHaveBeenCalled();
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });

  it('does not publish after WebP encoding fails, even if the original upload already exists', async () => {
    jest.spyOn(sharp.prototype, 'webp').mockImplementation(() => { throw new Error('native encoder failure'); });
    expect((await ingest()).status).toBe(500);
    expect(uploadToR2).toHaveBeenCalledTimes(1);
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });

  it('does not publish after AVIF encoding fails, even if earlier renditions were uploaded', async () => {
    jest.spyOn(sharp.prototype, 'avif').mockImplementation(() => { throw new Error('native encoder failure'); });
    expect((await ingest()).status).toBe(500);
    expect(uploadToR2).toHaveBeenCalledTimes(2);
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });

  it('does not persist a media record after an R2 upload failure', async () => {
    jest.mocked(uploadToR2).mockRejectedValue(new Error('R2 unavailable'));
    expect((await ingest()).status).toBe(500);
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });

  it('does not complete the lease when KV persistence fails after uploads', async () => {
    jest.mocked(storeMedia).mockRejectedValue(new Error('KV unavailable'));
    expect((await ingest()).status).toBe(500);
    expect(uploadToR2).toHaveBeenCalled();
    expect(storeMedia).toHaveBeenCalledTimes(1);
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });

  it('refuses to persist a record when physical rendition verification fails', async () => {
    jest.mocked(verifyR2RenditionCompleteness).mockResolvedValue({ complete: false } as never);
    expect((await ingest()).status).toBe(500);
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });

  it('retries the same source after a KV failure and completes the owned lease', async () => {
    jest.mocked(storeMedia).mockRejectedValueOnce(new Error('transient KV failure'));
    expect((await ingest()).status).toBe(500);
    expect(lease.status).toBe('FAILED_RETRYABLE');

    jest.mocked(storeMedia).mockResolvedValue(undefined);
    const retry = await ingest();
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ success: true, action: 'created' });
    expect(lease.status).toBe('SUCCEEDED');
    expect(storeMedia).toHaveBeenCalledTimes(2);
  });

  it('reuses an existing complete content-hash record without uploading or persisting a duplicate', async () => {
    const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
    process.env.R2_PUBLIC_BASE_URL = 'https://bucket.r2.dev';
    const renditionUrl = (label: string, extension: string) =>
      `https://bucket.r2.dev/${crypto.createHash('sha256').update(label).digest('hex')}-original.${extension}`;
    const existing: Media = {
      id: contentHash.slice(0, 32), filename: 'photo.jpg', type: 'image', orientation: 'square', alt: 'Photo',
      tags: [], roles: ['gallery'], source: 'local', lifecycleState: 'published', storage: 'r2', contentHash,
      dimensions: { width: 32, height: 32 },
      variants: {
        original: `https://bucket.r2.dev/${contentHash}-original.jpg`,
        web: renditionUrl('web', 'webp'), webp: renditionUrl('webp', 'webp'),
        avif: renditionUrl('avif', 'avif'), thumbnail: renditionUrl('thumbnail', 'webp'),
        blur: renditionUrl('blur', 'webp'), responsive: [],
      },
    };
    jest.mocked(findMediaByContentHash).mockResolvedValue(existing);
    const response = await ingest();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, action: 'existing', mediaId: existing.id, deduplicated: true });
    expect(uploadToR2).not.toHaveBeenCalled();
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease).toMatchObject({ status: 'SUCCEEDED', mediaId: existing.id });
  });
});
