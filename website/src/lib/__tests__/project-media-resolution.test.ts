jest.mock('../media',()=>({resolvePublicMedia:jest.fn()}));
jest.mock('../effective-project-gallery',()=>({getEffectiveProjectGallery:jest.fn()}));
import { getProjectWithResolvedMedia, getProjectsWithResolvedMedia } from '../projects';
import { resolvePublicMedia } from '../media';
import { getEffectiveProjectGallery } from '../effective-project-gallery';
import type { Project } from '@/types/projects';
import type { Media } from '@/types/media';

const project = (id='one'): Project => ({id,media:{hero:'shared',before:'before',after:'after',gallery:['stale'],details:['shared','detail'],progress:['progress']}} as Project);
const media = (id:string): Media => ({id} as Media);
beforeEach(()=>{
  jest.clearAllMocks();
  jest.mocked(resolvePublicMedia).mockImplementation(async id=>media(id));
  jest.mocked(getEffectiveProjectGallery).mockResolvedValue(['shared','gallery']);
});

it('checks each shared media ID once across roles and projects while preserving effective gallery order',async()=>{
  const resolved=await getProjectsWithResolvedMedia([project(),project('two')]);
  expect(resolvePublicMedia).toHaveBeenCalledTimes(6);
  expect(jest.mocked(resolvePublicMedia).mock.calls.filter(([id])=>id==='shared')).toHaveLength(1);
  expect(getEffectiveProjectGallery).toHaveBeenCalledTimes(2);
  for(const result of resolved) {
    expect(result.media.gallery).toEqual(['shared','gallery']);
    expect(result.media.galleryMedia?.map(item=>item.id)).toEqual(['shared','gallery']);
    expect(result.media.heroMedia).toBe(result.media.galleryMedia?.[0]);
    expect(result.media.detailsMedia?.map(item=>item.id)).toEqual(['shared','detail']);
  }
});
it('starts independent roles before the live gallery read completes',async()=>{
  let finishGallery!: (ids:string[])=>void;
  jest.mocked(getEffectiveProjectGallery).mockReturnValue(new Promise(resolve=>{finishGallery=resolve;}));
  const resolving=getProjectWithResolvedMedia(project());
  expect(jest.mocked(resolvePublicMedia).mock.calls.map(([id])=>id)).toEqual(['shared','before','after','detail','progress']);
  finishGallery(['gallery']);
  await expect(resolving).resolves.toMatchObject({media:{gallery:['gallery']}});
});
it('does not cache denied media across requests or substitute static media',async()=>{
  const error=jest.spyOn(console,'error').mockImplementation(()=>{});
  try {
    jest.mocked(resolvePublicMedia).mockResolvedValue(null);
    const first=await getProjectWithResolvedMedia(project());
    expect(first.media.heroMedia).toBeUndefined();expect(first.media.galleryMedia).toEqual([]);
    expect(error.mock.calls.filter(([,data])=>data.mediaId==='shared')).toHaveLength(1);
    jest.mocked(resolvePublicMedia).mockImplementation(async id=>media(id));
    const next=await getProjectWithResolvedMedia(project());
    expect(next.media.heroMedia?.id).toBe('shared');
    expect(jest.mocked(resolvePublicMedia).mock.calls.filter(([id])=>id==='shared')).toHaveLength(2);
  } finally {error.mockRestore();}
});
it('preserves gallery and media authority failures without fallback',async()=>{
  jest.mocked(getEffectiveProjectGallery).mockRejectedValue(new Error('gallery unavailable'));
  await expect(getProjectWithResolvedMedia(project())).rejects.toThrow('gallery unavailable');
  jest.mocked(getEffectiveProjectGallery).mockResolvedValue([]);
  jest.mocked(resolvePublicMedia).mockRejectedValue(new Error('media unavailable'));
  await expect(getProjectWithResolvedMedia(project())).rejects.toThrow('media unavailable');
});
