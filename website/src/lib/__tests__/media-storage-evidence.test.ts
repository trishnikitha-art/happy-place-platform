import { identifyStorageProvider, classifyR2ProbeError } from '../media-storage-evidence';
import { collectMediaReferences } from '../media-inventory';
import { POST } from '@/app/api/workbench/media-audit/route';
import { probeR2Object } from '../r2-storage';
import { getMediaRecordRaw, listMediaIds } from '../media-kv-store';
import { loadMediaManifest } from '../media';
import { workbenchSession } from '../workbench-session';
jest.mock('../r2-storage', () => ({ probeR2Object: jest.fn() }));
jest.mock('../media-kv-store', () => ({ getMediaRecordRaw: jest.fn(), listMediaIds: jest.fn() }));
jest.mock('../media', () => ({ loadMediaManifest: jest.fn() }));
jest.mock('../workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));

describe('Provider-aware media diagnostics', () => {
  const previous = process.env.R2_PUBLIC_BASE_URL;
  const record = (original: string, storage?: string) => ({ id: 'test-media', source: 'local', lifecycleState: 'published',
    contentHash: 'a'.repeat(64), dimensions: { width: 100, height: 100 }, variants: { original }, storage });
  const audit = (body = { action: 'auditPublicGate' }) => POST(new Request('https://test.invalid/api/workbench/media-audit',
    { method: 'POST', body: JSON.stringify(body) }));
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.R2_PUBLIC_BASE_URL = 'https://media.example.com';
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
    jest.mocked(listMediaIds).mockResolvedValue(['test-media']);
    jest.mocked(loadMediaManifest).mockReturnValue({ media: [] } as never);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });
  afterAll(() => { if (previous === undefined) delete process.env.R2_PUBLIC_BASE_URL; else process.env.R2_PUBLIC_BASE_URL = previous; });
  it.each([
    ['/images/test.jpg', 'static'], ['https://abc.public.blob.vercel-storage.com/test.jpg', 'legacy-blob'],
    ['https://media.example.com/path/test.webp', 'r2'], ['https://drive.google.com/test', 'unknown'],
    ['https://media.example.com.attacker.invalid/test.jpg', 'unknown'],
    ['http://media.example.com/test.jpg', 'unknown'], ['https://media.example.com/test.jpg?query=1', 'unknown'],
  ])('identifies %s without guessing from hashes (%s)', (url, provider) => {
    expect(identifyStorageProvider(record(url))).toMatchObject({ provider });
  });
  it.each(['https://abc.public.blob.vercel-storage.com/test.jpg', 'https://drive.google.com/test', '/images/test.jpg'])(
    'never probes a legacy or unrelated URL in R2 (%s)', async url => {
      jest.mocked(getMediaRecordRaw).mockResolvedValue(record(url) as never);
      const result = await (await audit()).json();
      expect(probeR2Object).not.toHaveBeenCalled();
      expect(result.audit.records[0]).toMatchObject({ classification: 'AMBIGUOUS' });
      expect(result.audit.repairableR2Ids).toEqual([]);
    });
  it.each(['NOT_FOUND', 'AUTH_FAILURE', 'NOT_CONFIGURED', 'TRANSPORT_ERROR', 'EXISTS'])(
    'preserves original probe outcome %s without authorizing undeclared storage', async outcome => {
      jest.mocked(getMediaRecordRaw).mockResolvedValue(record('https://media.example.com/nested/key.webp') as never);
      jest.mocked(probeR2Object).mockResolvedValue({ outcome } as never);
      const result = await (await audit()).json();
      expect(probeR2Object).toHaveBeenCalledWith('nested/key.webp');
      expect(result.audit.records[0].reason).toContain(outcome);
      expect(result.audit.repairableR2Ids).toEqual([]);
    });
  it('distinguishes an actual R2 404 from access failure', async () => {
    jest.mocked(getMediaRecordRaw).mockResolvedValue(record('https://media.example.com/key.webp', 'r2') as never);
    jest.mocked(probeR2Object).mockResolvedValue({ outcome: 'NOT_FOUND' });
    expect((await (await audit()).json()).audit.records[0].classification).toBe('MISSING_STORAGE');
    jest.mocked(probeR2Object).mockResolvedValue({ outcome: 'AUTH_FAILURE' });
    expect((await (await audit()).json()).audit.records[0].classification).toBe('AMBIGUOUS');
  });
  it.each([
    [{ $metadata: { httpStatusCode: 404 } }, 'NOT_FOUND'], [{ name: 'NoSuchKey' }, 'NOT_FOUND'],
    [{ $metadata: { httpStatusCode: 403 } }, 'AUTH_FAILURE'], [{ name: 'SignatureDoesNotMatch' }, 'AUTH_FAILURE'],
    [{ name: 'TimeoutError' }, 'TRANSPORT_ERROR'], [{ $metadata: { httpStatusCode: 503 } }, 'TRANSPORT_ERROR'],
  ])('keeps storage failures distinct (%j)', (failure, outcome) => expect(classifyR2ProbeError(failure)).toEqual({ outcome }));
  it('returns complete page details with the next offset rather than just sampled records', async () => {
    jest.mocked(listMediaIds).mockResolvedValue(['b', 'a', 'a']);
    jest.mocked(getMediaRecordRaw).mockResolvedValue({ lifecycleState: 'source_reference', source: 'google-drive' } as never);
    const first = await (await audit({ action: 'auditPublicGate', limit: 1, offset: 0 } as never)).json();
    expect(first.audit).toMatchObject({ totalRecords: 2, processedRecords: 1, nextOffset: 1 });
    expect(first.audit.records[0].id).toBe('a');
  });
  it('does not inspect private media for an anonymous caller', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
    expect((await audit()).status).toBe(401);
    expect(listMediaIds).not.toHaveBeenCalled();
  });
  it('correlates hidden project and committed assignment references without treating names as media IDs', () => {
    const refs = new Map<string, Set<string>>();
    collectMediaReferences({ media: { hero: 'a', details: ['b'], hiddenGallery: ['c'] }, title: 'not-an-id' }, 'project', refs);
    collectMediaReferences({ mediaId: 'a' }, 'assignment', refs);
    expect([...refs.keys()].sort()).toEqual(['a', 'b', 'c']);
    expect([...refs.get('a')!]).toEqual(['project', 'assignment']);
  });
});
