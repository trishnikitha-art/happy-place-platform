import { POST as assignHero } from '@/app/api/admin/brand/hero/route';
import { POST as assignPortrait } from '@/app/api/admin/brand/portrait/route';
import { POST as assignService } from '@/app/api/admin/services/card/route';
import { getMediaByIdAsync, resolvePublicMedia } from '@/lib/media';
import manifest from '@/config/media.v1.json';

const mockSet = jest.fn();
jest.mock('@upstash/redis', () => ({ Redis: jest.fn().mockImplementation(() => ({ set: mockSet, get: jest.fn() })) }));
jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: async () => true } }));
jest.mock('@/lib/assignment-store', () => ({ getServiceCardAssignment: jest.fn(), storeServiceCardAssignment: jest.fn() }));
jest.mock('@/lib/registries', () => ({ getAllServices: () => [{ slug: 'fences' }] }));
jest.mock('@/lib/media', () => ({ getMediaByIdAsync: jest.fn(), resolvePublicMedia: jest.fn(), getStaticMediaForBootstrap: () => manifest.media[0] }));
jest.mock('@/lib/deployment-transaction', () => ({ createDeploymentTransaction: jest.fn() }));

const originalEnv = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env.KV_REST_API_URL = 'https://fixture-redis.example.test';
  process.env.KV_REST_API_TOKEN = 'fixture-token';
  (getMediaByIdAsync as jest.Mock).mockResolvedValue({ ...manifest.media[0], id: 'incomplete-asset', storage: 'r2', variants: { original: 'https://media.example.test/original.jpg' } });
});
afterEach(() => { process.env = { ...originalEnv }; });

it.each([['hero', assignHero], ['portrait', assignPortrait], ['service-card', assignService]] as const)('%s waits for the final public gate and rejects before staging', async (_name, route) => {
  let resolveProof!: (value: null) => void;
  (resolvePublicMedia as jest.Mock).mockReturnValue(new Promise(resolve => { resolveProof = resolve; }));
  let settled = false;
  const pending = route(new Request('http://localhost/api/admin/assignment', { method: 'POST',
    body: JSON.stringify({ mediaId: 'incomplete-asset', serviceSlug: 'fences' }) }))
    .then(response => { settled = true; return response; });
  await new Promise(resolve => setImmediate(resolve));
  expect(resolvePublicMedia).toHaveBeenCalledWith('incomplete-asset');
  expect(settled).toBe(false);
  expect(mockSet).not.toHaveBeenCalled();
  resolveProof(null);
  const response = await pending;
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe('MEDIA_NOT_PUBLICLY_COMPLETE');
  expect(mockSet).not.toHaveBeenCalled();
});

it.each([['hero', assignHero], ['portrait', assignPortrait]] as const)('%s cannot assign a static fallback missing from runtime authority', async (_name, route) => {
  (getMediaByIdAsync as jest.Mock).mockResolvedValue(null);
  (resolvePublicMedia as jest.Mock).mockResolvedValue(null);
  const response = await route(new Request('http://localhost/api/admin/assignment', { method: 'POST', body: JSON.stringify({ mediaId: manifest.media[0].id }) }));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe('MEDIA_NOT_PUBLICLY_COMPLETE');
  expect(mockSet).not.toHaveBeenCalled();
});
