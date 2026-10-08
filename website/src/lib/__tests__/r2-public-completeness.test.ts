import { getR2ObjectKey, verifyR2RenditionCompleteness } from '@/lib/r2-storage';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  HeadObjectCommand: jest.fn().mockImplementation(input => ({ input })),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

const originalEnv = { ...process.env };
const originalFetch = global.fetch;
const base = 'https://media.example.test/bucket';
const url = (key: string) => `${base}/${key}`;
const fixture = () => ({
  dimensions: { width: 1080, height: 720 },
  variants: {
    original: url('nested/source.jpg'), thumbnail: url('thumbnail.webp'),
    web: url('1080.webp'), webp: url('1080.webp'), avif: url('1080.avif'),
    blur: url('blur.webp'),
    responsive: [480, 768, 1080].map(width => ({ width, webp: url(`${width}.webp`), avif: url(`${width}.avif`) })),
  },
});

beforeEach(() => {
  process.env.R2_PUBLIC_BASE_URL = base;
  process.env.R2_ACCOUNT_ID = 'test-account';
  process.env.R2_ACCESS_KEY_ID = 'test-key';
  process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
  process.env.R2_BUCKET_NAME = 'test-bucket';
  mockSend.mockReset().mockResolvedValue({});
  global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 200, headers: { 'content-type': 'image/webp' } }));
});
afterEach(() => { process.env = { ...originalEnv }; global.fetch = originalFetch; });

it('proves all distinct URLs anonymously and preserves nested object keys', async () => {
  expect((await verifyR2RenditionCompleteness(fixture())).complete).toBe(true);
  expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ input: { Bucket: 'test-bucket', Key: 'nested/source.jpg' } }), expect.any(Object));
  expect(global.fetch).toHaveBeenCalledTimes(9);
  for (const [, options] of (global.fetch as jest.Mock).mock.calls) {
    expect(options).toEqual(expect.objectContaining({ method: 'HEAD', redirect: 'error', cache: 'no-store' }));
    expect(options.headers).toBeUndefined();
  }
});

it('rejects a missing responsive AVIF even when the original exists', async () => {
  mockSend.mockImplementation(async command => {
    if (command.input.Key === '768.avif') throw new Error('NoSuchKey');
    return {};
  });
  const result = await verifyR2RenditionCompleteness(fixture());
  expect(result.details.original).toBe(true);
  expect(result.details.responsive.find(variant => variant.width === 768)?.avif).toBe(false);
  expect(result.complete).toBe(false);
});

it('rejects a responsive width omitted from the record', async () => {
  const media = fixture();
  media.variants.responsive = media.variants.responsive.filter(variant => variant.width !== 768);
  expect((await verifyR2RenditionCompleteness(media)).complete).toBe(false);
});

it.each([403, 404])('rejects anonymous image access returning %s despite authenticated existence', async status => {
  (global.fetch as jest.Mock).mockImplementation(async address => new Response(null, {
    status: address === url('768.webp') ? status : 200, headers: { 'content-type': 'image/webp' },
  }));
  expect((await verifyR2RenditionCompleteness(fixture())).complete).toBe(false);
});

it('rejects an HTML response at a nominal image address', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(new Response(null, { headers: { 'content-type': 'text/html' } }));
  expect((await verifyR2RenditionCompleteness(fixture())).complete).toBe(false);
});

it('rejects public transport failure without throwing or allowing the record', async () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('network unavailable'));
  expect((await verifyR2RenditionCompleteness(fixture())).complete).toBe(false);
});

it('rejects a missing configured public origin without probing guessed addresses', async () => {
  delete process.env.R2_PUBLIC_BASE_URL;
  expect((await verifyR2RenditionCompleteness(fixture())).complete).toBe(false);
  expect(mockSend).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

it.each(['https://other.example.test/bucket/image.jpg', `${base}-other/image.jpg`, `${base}/image.jpg?token=private`, `${base}/%2e%2e%2fimage.jpg`])('rejects an address outside the configured public object namespace: %s', address => {
  expect(getR2ObjectKey(address)).toBeNull();
});

it('bounds concurrent storage verification and deduplicates shared variants', async () => {
  let active = 0;
  let peak = 0;
  mockSend.mockImplementation(async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return {};
  });
  expect((await verifyR2RenditionCompleteness(fixture())).complete).toBe(true);
  expect(peak).toBeGreaterThan(1);
  expect(peak).toBeLessThanOrEqual(4);
  expect(mockSend).toHaveBeenCalledTimes(9);
});
