import crypto from 'node:crypto';
import { get } from '@vercel/blob';
import { verifyBlobHash } from '../blob-storage';

jest.mock('@vercel/blob', () => ({
  get: jest.fn(), put: jest.fn(), head: jest.fn(), del: jest.fn(),
}));
jest.mock('@upstash/redis', () => ({ Redis: jest.fn() }));

const blobUrl = 'https://store.public.blob.vercel-storage.com/photo.jpg';
const digest = (bytes: Uint8Array) => crypto.createHash('sha256').update(bytes).digest('hex');

function serve(stream: ReadableStream<Uint8Array>) {
  jest.mocked(get).mockResolvedValue({ stream } as NonNullable<Awaited<ReturnType<typeof get>>>);
}

function chunksOf(bytes: Uint8Array, chunkSize: number) {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset === bytes.length) { controller.close(); return; }
      const end = Math.min(offset + chunkSize, bytes.length);
      controller.enqueue(bytes.subarray(offset, end));
      offset = end;
    },
  });
}

describe('Blob byte-hash verification', () => {
  beforeEach(() => {
    jest.mocked(get).mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it.each([
    [0, 1], [1, 1], [63, 7], [64, 1], [65, 17], [1024, 63], [65537, 4096],
  ])('matches SHA-256 for %i bytes across %i-byte chunks', async (length, chunkSize) => {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 128) % 256);
    const stream = chunksOf(bytes, chunkSize);
    serve(stream);
    expect(await verifyBlobHash(blobUrl, digest(bytes))).toEqual({ success: true });
    expect(get).toHaveBeenCalledWith(blobUrl, { access: 'public' });
    expect(stream.locked).toBe(false);
  });

  it('hashes exact byte views and empty chunks without UTF-8 decoding or backing-buffer bytes', async () => {
    const backing = Uint8Array.from([99, 0xf0, 0x9f, 0x92, 0xa9, 0, 255, 99]);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(backing.subarray(1, 3));
        controller.enqueue(new Uint8Array(0));
        controller.enqueue(backing.subarray(3, 7));
        controller.close();
      },
    });
    serve(stream);
    expect(await verifyBlobHash(blobUrl, digest(backing.subarray(1, 7)))).toEqual({ success: true });
    expect(stream.locked).toBe(false);
  });

  it('consumes each chunk before the producer reuses its buffer for the next read', async () => {
    const bytes = Uint8Array.from([1, 2, 3, 4]);
    let reads = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (reads === 2) { controller.close(); return; }
        bytes.fill(++reads);
        controller.enqueue(bytes);
      },
    }, { highWaterMark: 0 });
    serve(stream);
    expect(await verifyBlobHash(blobUrl, digest(Uint8Array.from([1, 1, 1, 1, 2, 2, 2, 2]))))
      .toEqual({ success: true });
  });

  it('preserves integrity-mismatch classification and the actual full-stream hash', async () => {
    const bytes = Uint8Array.from([0, 255, 128, 3]);
    const stream = chunksOf(bytes, 1);
    serve(stream);
    expect(await verifyBlobHash(blobUrl, '0'.repeat(64))).toEqual({
      success: false, errorType: 'INTEGRITY_FAILURE', actualHash: digest(bytes),
    });
    expect(stream.locked).toBe(false);
  });

  it('rejects an interrupted stream even when the bytes received match the expected digest', async () => {
    const prefix = Uint8Array.from([1, 2, 3]);
    let reads = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (reads++ === 0) controller.enqueue(prefix);
        else controller.error(new Error('connection interrupted'));
      },
    }, { highWaterMark: 0 });
    serve(stream);
    expect(await verifyBlobHash(blobUrl, digest(prefix))).toEqual({ success: false, errorType: 'TRANSPORT_ERROR' });
    expect(stream.locked).toBe(false);
  });

  it.each([
    [new Error('Blob not found'), 'BLOB_NOT_FOUND'],
    [new Error('Unauthorized'), 'AUTH_FAILURE'],
    [new Error('Access denied'), 'AUTH_FAILURE'],
    [new Error('connection reset'), 'TRANSPORT_ERROR'],
    ['non-Error failure', 'UNKNOWN_ERROR'],
  ])('preserves the failure classification for %s', async (failure, errorType) => {
    jest.mocked(get).mockRejectedValue(failure);
    expect(await verifyBlobHash(blobUrl, 'a'.repeat(64))).toEqual({ success: false, errorType });
  });

  it.each([null, {}])('preserves missing-Blob and missing-stream handling for %s', async (result) => {
    jest.mocked(get).mockResolvedValue(result as Awaited<ReturnType<typeof get>>);
    expect(await verifyBlobHash(blobUrl, 'a'.repeat(64))).toEqual({ success: false, errorType: 'BLOB_NOT_FOUND' });
  });

  it.each([
    ['https://attacker.invalid/photo.jpg', 'a'.repeat(64)],
    [blobUrl, 'not-a-digest'],
  ])('rejects invalid input before calling storage', async (url, hash) => {
    expect(await verifyBlobHash(url, hash)).toEqual({ success: false, errorType: 'INVALID_URL' });
    expect(get).not.toHaveBeenCalled();
  });
});
