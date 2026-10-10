import { getHomepageServiceMedia } from '../homepage-service-media';
import { getServiceCardAssignment } from '../assignment-store';
import { resolvePublicMedia } from '../media';
import type { Media } from '@/types/media';

jest.mock('../assignment-store', () => ({ getServiceCardAssignment: jest.fn() }));
jest.mock('../media', () => ({ resolvePublicMedia: jest.fn() }));

const approved = { id: 'published-image' } as Media;
const service = { slug: 'painting', cardMediaId: 'static-image' };
const empty = { mediaId: null, mediaObject: null };

describe('homepage service reads overlap without bypassing media authority', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('starts independent assignment reads together and preserves registry order', async () => {
    const release = new Map<string, (value: null) => void>();
    jest.mocked(getServiceCardAssignment).mockImplementation(slug => new Promise(resolve => release.set(slug, resolve)));
    const result = getHomepageServiceMedia([
      { slug: 'first', cardMediaId: null }, { slug: 'second', cardMediaId: null }, { slug: 'third', cardMediaId: null },
    ]);
    expect([...release.keys()]).toEqual(['first', 'second', 'third']);
    release.get('third')!(null);
    release.get('first')!(null);
    release.get('second')!(null);
    expect([...await result]).toEqual([['first', empty], ['second', empty], ['third', empty]]);
  });

  it('uses only gate-approved assigned media', async () => {
    jest.mocked(getServiceCardAssignment).mockResolvedValue({ mediaId: 'published-image' } as never);
    jest.mocked(resolvePublicMedia).mockResolvedValue(approved);
    expect((await getHomepageServiceMedia([service])).get('painting')).toEqual({ mediaId: approved.id, mediaObject: approved });
    expect(resolvePublicMedia).toHaveBeenCalledWith('published-image');
  });

  it('does not replace a rejected assigned source with static media', async () => {
    jest.mocked(getServiceCardAssignment).mockResolvedValue({ mediaId: 'drive-reference' } as never);
    jest.mocked(resolvePublicMedia).mockResolvedValue(null);
    expect((await getHomepageServiceMedia([service])).get('painting')).toEqual(empty);
    expect(resolvePublicMedia).toHaveBeenCalledTimes(1);
    expect(resolvePublicMedia).toHaveBeenCalledWith('drive-reference');
  });

  it('resolves static fallback through the gate when no assignment exists', async () => {
    jest.mocked(getServiceCardAssignment).mockResolvedValue(null);
    jest.mocked(resolvePublicMedia).mockResolvedValue(approved);
    expect((await getHomepageServiceMedia([service])).get('painting')).toEqual({ mediaId: 'static-image', mediaObject: approved });
    expect(resolvePublicMedia).toHaveBeenCalledWith('static-image');
  });

  it.each(['assignment', 'assigned-media'])('preserves guarded static fallback on %s failure', async failure => {
    if (failure === 'assignment') jest.mocked(getServiceCardAssignment).mockRejectedValue(new Error('lookup failed'));
    else {
      jest.mocked(getServiceCardAssignment).mockResolvedValue({ mediaId: 'assigned-image' } as never);
      jest.mocked(resolvePublicMedia).mockRejectedValueOnce(new Error('media read failed'));
    }
    jest.mocked(resolvePublicMedia).mockResolvedValue(approved);
    expect((await getHomepageServiceMedia([service])).get('painting')).toEqual({ mediaId: 'static-image', mediaObject: approved });
    expect(resolvePublicMedia).toHaveBeenLastCalledWith('static-image');
  });

  it('preserves the existing one-time static retry and propagates its failure', async () => {
    jest.mocked(getServiceCardAssignment).mockResolvedValue(null);
    jest.mocked(resolvePublicMedia).mockRejectedValue(new Error('static read failed'));
    await expect(getHomepageServiceMedia([service])).rejects.toThrow('static read failed');
    expect(jest.mocked(resolvePublicMedia).mock.calls).toEqual([['static-image'], ['static-image']]);
  });

  it('leaves a card empty when its static source is rejected or absent', async () => {
    jest.mocked(getServiceCardAssignment).mockResolvedValue(null);
    jest.mocked(resolvePublicMedia).mockResolvedValue(null);
    const result = await getHomepageServiceMedia([service, { slug: 'unassigned', cardMediaId: null }]);
    expect(result.get('painting')).toEqual(empty);
    expect(result.get('unassigned')).toEqual(empty);
    expect(resolvePublicMedia).toHaveBeenCalledTimes(1);
  });
});
