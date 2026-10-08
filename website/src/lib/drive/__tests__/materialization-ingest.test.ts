import { POST } from '@/app/api/drive/ingest/route';
import { driveDiscovery } from '../drive-discovery';
import { storeMedia, findMediaByContentHash, createRedisClient } from '@/lib/media-kv-store';
import { verifyR2Hash, verifyR2RenditionCompleteness, uploadToR2 } from '@/lib/r2-storage';
import { replaceMaterializationLease } from '../materialization-lease';
import crypto from 'crypto';
import sharp from 'sharp';

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

describe('Drive ingest persisted integrity and lease ownership', () => {
  let bytes: Buffer;
  let lease: any;
  const redis = {
    set: jest.fn(async (_key: string, value: string) => {
      if (lease) return null;
      lease = JSON.parse(value); return 'OK';
    }),
    // Upstash returns deserialized JSON by default.
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
    jest.mocked(uploadToR2).mockImplementation(async (buffer, _mime, ext) => ({
      url: `https://bucket.r2.dev/${crypto.createHash('sha256').update(buffer).digest('hex')}-original.${ext}`,
      contentHash: crypto.createHash('sha256').update(buffer).digest('hex'), uploadedAt: new Date().toISOString(),
    }));
    jest.mocked(verifyR2Hash).mockResolvedValue({ success: true });
    jest.mocked(verifyR2RenditionCompleteness).mockResolvedValue({ complete: true } as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('verifies stored original against Drive SHA256 before publishing and completes the same client lease', async () => {
    const response = await ingest(); expect(await response.json()).toEqual(expect.objectContaining({ success: true }));
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    expect(verifyR2Hash).toHaveBeenCalledWith(`${hash}-original.jpg`, hash);
    expect(jest.mocked(verifyR2Hash).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(storeMedia).mock.invocationCallOrder[0]);
    expect(lease).toMatchObject({ status: 'SUCCEEDED', mediaId: hash.slice(0, 32) });
  });
  it('fails closed on persisted hash mismatch and marks the lease retryable', async () => {
    jest.mocked(verifyR2Hash).mockResolvedValue({ success: false, errorType: 'INTEGRITY_FAILURE' });
    expect((await ingest()).status).toBe(500);
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });
  it('reclaims an existing failed lease immediately instead of waiting for TTL', async () => {
    lease = { status: 'FAILED_RETRYABLE', ownerToken: 'previous-owner', retryCount: 1 };
    expect((await ingest()).status).toBe(200);
    expect(lease).toMatchObject({ status: 'SUCCEEDED', retryCount: 2 });
    expect(redis.eval.mock.calls[0][2].slice(0, 2)).toEqual(['FAILED_RETRYABLE', 'previous-owner']);
  });
  it('marks early download failure retryable too', async () => {
    jest.mocked(driveDiscovery.downloadFile).mockResolvedValue(Buffer.alloc(0));
    expect((await ingest()).status).toBe(500);
    expect(lease.status).toBe('FAILED_RETRYABLE');
    expect(storeMedia).not.toHaveBeenCalled();
  });
  it('does not publish when rendition verification fails', async () => {
    jest.mocked(verifyR2RenditionCompleteness).mockResolvedValue({ complete: false } as never);
    expect((await ingest()).status).toBe(500);
    expect(storeMedia).not.toHaveBeenCalled();
    expect(lease.status).toBe('FAILED_RETRYABLE');
  });
  it('never overwrites a new owner with an old completion', async () => {
    lease = { status: 'PROCESSING', ownerToken: 'new-owner' };
    expect(await replaceMaterializationLease(redis as never, 'key', 'PROCESSING', 'old-owner', { status: 'SUCCEEDED' })).toBe(false);
    expect(lease).toEqual({ status: 'PROCESSING', ownerToken: 'new-owner' });
  });
});
