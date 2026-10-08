import { listMediaIds } from '@/lib/media-kv-store';
import { Redis } from '@upstash/redis';

jest.mock('@upstash/redis', () => ({ Redis: jest.fn() }));
jest.mock('@/lib/r2-storage', () => ({ verifyR2ObjectExists: jest.fn() }));
jest.mock('@/lib/environment', () => ({
  getEnvironment: () => 'test', getKvNamespace: () => 'hpp:test:scan:',
}));

it('finishes numeric cursors, deduplicates overlapping pages and preserves IDs containing the prefix', async () => {
  const originalUrl = process.env.KV_REST_API_URL;
  const originalToken = process.env.KV_REST_API_TOKEN;
  const originalSkip = process.env.DEV_MODE_SKIP_KV;
  const scan = jest.fn()
    .mockResolvedValueOnce([23, ['hpp:test:scan:media:first', 'hpp:test:scan:media:second']])
    .mockResolvedValueOnce([0, ['hpp:test:scan:media:second', 'hpp:test:scan:media:hpp:test:scan:media:third']]);
  (Redis as unknown as jest.Mock).mockImplementation(() => ({ scan }));
  process.env.KV_REST_API_URL = 'https://scan-fixture.example';
  process.env.KV_REST_API_TOKEN = 'scan-fixture-token';
  delete process.env.DEV_MODE_SKIP_KV;
  try {
    expect(await listMediaIds()).toEqual(['first', 'second', 'hpp:test:scan:media:third']);
    expect(scan).toHaveBeenNthCalledWith(1, '0', { match: 'hpp:test:scan:media:*', count: 100 });
    expect(scan).toHaveBeenNthCalledWith(2, '23', { match: 'hpp:test:scan:media:*', count: 100 });
    expect(scan).toHaveBeenCalledTimes(2);
  } finally {
    for (const [name, value] of Object.entries({ KV_REST_API_URL: originalUrl,
      KV_REST_API_TOKEN: originalToken, DEV_MODE_SKIP_KV: originalSkip })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
