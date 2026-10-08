import { POST } from '@/app/api/admin/diagnostic/inspect-production-media/route';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw } from '@/lib/media-kv-store';
import { verifyR2Hash } from '@/lib/r2-storage';
import manifest from '@/config/media.v1.json';

jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('@/lib/media-kv-store', () => ({ listMediaIds: jest.fn(), getMediaRecordRaw: jest.fn() }));
jest.mock('@/lib/r2-storage', () => ({ verifyR2Hash: jest.fn() }));
jest.mock('@/lib/environment', () => ({ getKvNamespace: () => 'hpp:test:inspection:' }));

const approved = manifest.media.find(asset => asset.storage === 'static')!;
const originalPublicBase = process.env.R2_PUBLIC_BASE_URL;
afterEach(() => { if (originalPublicBase === undefined) delete process.env.R2_PUBLIC_BASE_URL; else process.env.R2_PUBLIC_BASE_URL = originalPublicBase; });
const request = () => new Request('http://localhost/api/admin/diagnostic/inspect-production-media',
  { method: 'POST', body: '{}' });
beforeEach(() => {
  jest.resetAllMocks();
  (workbenchSession.isAuthenticated as jest.Mock).mockResolvedValue(true);
  process.env.R2_PUBLIC_BASE_URL = 'https://verified.example';
  (verifyR2Hash as jest.Mock).mockResolvedValue({ success: true });
});

it('rejects unauthenticated enumeration', async () => {
  (workbenchSession.isAuthenticated as jest.Mock).mockResolvedValue(false);
  expect((await POST(request())).status).toBe(401);
  expect(listMediaIds).not.toHaveBeenCalled();
});

it('accounts for static records, references, duplicates and vanished records exactly once', async () => {
  const records: Record<string, unknown> = {
    static: { ...approved, id: 'static' },
    invalid: { ...approved, id: 'invalid', variants: { ...approved.variants, web: '/images/invented.webp' } },
    legacy: { ...approved, id: 'legacy', storage: 'blob' },
    'drive-ref-test': { id: 'drive-ref-test', source: 'google-drive', lifecycleState: 'source_reference' },
  };
  (listMediaIds as jest.Mock).mockResolvedValue(['static', 'invalid', 'legacy', 'drive-ref-test', 'vanished', 'static']);
  (getMediaRecordRaw as jest.Mock).mockImplementation(async (id: string) => records[id] ?? null);
  const d = await (await POST(request())).json();
  expect(d.verdict).toBe('CLASSIFIED');
  expect(d.evidence).toMatchObject({ totalMediaRecords: 5, totalClassified: 4, missingRecords: 1,
    accountingValid: true, namespace: 'hpp:test:inspection:', classificationCounts: {
      STATIC_MANIFEST_MATCH: 1, STATIC_MANIFEST_MISMATCH: 1, DRIVE_REFERENCE: 1, ERROR: 1,
      PHYSICALLY_VERIFIED: 0,
    } });
  expect(d.evidence.verificationScope.static).toBe('committed-manifest-identity-only');
  expect(verifyR2Hash).not.toHaveBeenCalled();
});

it.each([
  ['OBJECT_NOT_FOUND', 'R2_NOT_FOUND', false],
  ['INTEGRITY_FAILURE', 'R2_HASH_MISMATCH', true],
  ['AUTH_FAILURE', 'R2_UNVERIFIABLE', undefined],
  ['TRANSPORT_ERROR', 'R2_UNVERIFIABLE', undefined],
])('distinguishes %s from missing bytes', async (errorType, classification, exists) => {
  (listMediaIds as jest.Mock).mockResolvedValue(['r2']);
  (getMediaRecordRaw as jest.Mock).mockResolvedValue({ ...approved, id: 'r2', storage: 'r2',
    variants: { original: 'https://verified.example/nested/object-original.jpg' } });
  (verifyR2Hash as jest.Mock).mockResolvedValue({ success: false, errorType });
  const d = await (await POST(request())).json();
  expect(d.evidence.accountingValid).toBe(true);
  const sample = d.evidence.sampledClassifications[0];
  expect(sample.classification).toBe(classification);
  expect(sample.r2Exists).toBe(exists);
  expect(verifyR2Hash).toHaveBeenCalledWith('nested/object-original.jpg', approved.contentHash);
});

it('does not guess an object key when the public origin is unverified', async () => {
  (listMediaIds as jest.Mock).mockResolvedValue(['r2']);
  (getMediaRecordRaw as jest.Mock).mockResolvedValue({ ...approved, id: 'r2', storage: 'r2' });
  delete process.env.R2_PUBLIC_BASE_URL;
  const d = await (await POST(request())).json();
  expect(d.evidence.sampledClassifications[0]).toMatchObject({ classification: 'R2_UNVERIFIABLE',
    errorType: 'UNVERIFIED_PUBLIC_ORIGIN' });
  expect(verifyR2Hash).not.toHaveBeenCalled();
});
