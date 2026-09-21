import { POST } from '@/app/api/workbench/media-authority/route';
import { workbenchSession } from '@/lib/workbench-session';
import { getServiceCardAssignment } from '@/lib/assignment-store';
import { getPublishedMediaAssets } from '@/lib/visual-asset-registry';
import { listMediaIds, getMediaRecordRaw } from '@/lib/media-kv-store';

jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('@/lib/assignment-store', () => ({ getServiceCardAssignment: jest.fn() }));
jest.mock('@/lib/visual-asset-registry', () => ({ getPublishedMediaAssets: jest.fn() }));
jest.mock('@/lib/media-kv-store', () => ({ listMediaIds: jest.fn(), getMediaRecordRaw: jest.fn() }));

async function request(body: unknown) {
  const response = await POST(new Request('http://localhost/api/workbench/media-authority', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() };
}
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
  jest.mocked(getServiceCardAssignment).mockResolvedValue(null);
});
describe('Media authority route behavior', () => {
  it('authenticates before reading authority', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
    expect((await request({ action: 'getAssignment', slotSlug: 'hero-background' })).status).toBe(401);
    expect(getServiceCardAssignment).not.toHaveBeenCalled();
  });
  it.each([
    ['hero-background', 'brand-hero-background'],
    ['homepage-owner-portrait-slot', 'brand-portrait-homepage'],
    ['homepage-service-card-slot-decks', 'decks'],
    ['homepage-service-card-slot-drywall', 'drywall'],
  ])('reads canonical authority for %s', async (slotSlug, assignmentKey) => {
    const result = await request({ action: 'getAssignment', slotSlug });
    expect(result.status).toBe(200);
    expect(getServiceCardAssignment).toHaveBeenCalledWith(assignmentKey);
    expect(result.body).toEqual({ slotSlug, assignmentKey, assignment: null, revision: 0 });
  });
  it('returns the existing revision unchanged', async () => {
    jest.mocked(getServiceCardAssignment).mockResolvedValue({ revision: 37, mediaId: 'current' } as any);
    expect((await request({ action: 'getAssignment', slotSlug: 'hero-background' })).body.revision).toBe(37);
  });
  it.each([undefined, 'service-card-decks', 'unknown', 'homepage-service-card-slot-unknown'])('rejects unsupported slot %s', async slotSlug => {
    expect((await request({ action: 'getAssignment', slotSlug })).status).toBe(400);
    expect(getServiceCardAssignment).not.toHaveBeenCalled();
  });
  it.each(['list', 'getPublishedMediaAssets'])('preserves %s', async action => {
    jest.mocked(getPublishedMediaAssets).mockResolvedValue({ assets: [], available: true });
    expect((await request({ action })).body).toMatchObject({ media: [], available: true });
  });
  it('matches Drive provenance and corpus exactly', async () => {
    jest.mocked(listMediaIds).mockResolvedValue(['wrong', 'correct']);
    jest.mocked(getMediaRecordRaw).mockResolvedValueOnce({ id: 'wrong', provenance: { driveFileId: 'file', sharedDriveId: 'other' } } as any)
      .mockResolvedValueOnce({ id: 'correct', provenance: { driveFileId: 'file', sharedDriveId: 'shared' } } as any);
    const result = await request({ action: 'getByDriveFileId', driveFileId: 'file', sharedDriveId: 'shared' });
    expect(result.body).toMatchObject({ found: true, media: { id: 'correct' } });
  });
});
