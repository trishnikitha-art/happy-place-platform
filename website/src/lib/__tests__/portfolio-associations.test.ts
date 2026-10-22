import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import projects from '@/config/projects.v1.json';
import media from '@/config/media.v1.json';
import services from '@/config/services.v1.json';
import { archiveKey, archiveSnapshot } from '../archive-order';
import { isPublicContent, type ContentCatalog } from '../content-contract';
import { validateProject } from '../projects';
import { isPublishedMediaAsset } from '@/types/media';

describe('published portfolio project associations', () => {
  const publicProjects = projects.projects.filter(isPublicContent);
  const archive = archiveSnapshot(projects as unknown as ContentCatalog)
    .filter(key => publicProjects.some(project =>
      project.media.gallery.some(id => key === archiveKey(project.id, id))));

  it('keeps every existing archive photo once and preserves its visible position', () => {
    const expectedMedia = [
      'fences-001-hero', 'fences-001-after', 'pergolas-001-hero',
      '876300ab9d29bdc09b18f2c74dd3672f', 'repairs-001-drywall',
      'repairs-001-hero', 'repairs-001-floor', 'repairs-001-floor0',
      'repairs-001-gutter', 'repairs-001-img0544', 'repairs-001-img0546',
      'outdoor-living-001-hero', 'outdoor-living-001-6', 'outdoor-living-001-5',
      'outdoor-living-001-2', 'outdoor-living-001-4', 'outdoor-living-001-3',
      'builtins-001-hero',
    ];
    expect(archive.map(key => key.split('::')[2])).toEqual(expectedMedia);
    expect(new Set(expectedMedia).size).toBe(archive.length);
    expect(archive[4]).toBe(archiveKey('drywall-001', 'repairs-001-drywall'));
    expect(archive[6]).toBe(archiveKey('project-hp011', 'repairs-001-floor'));
  });

  it.each([
    ['drywall-001', 'drywall', 'repairs-001-drywall', 'DRYWALL.png'],
    ['project-hp011', 'restoration', 'repairs-001-floor', 'FLOOR.png'],
  ])('reuses the published asset for %s without a competing public owner', (id, service, mediaId, filename) => {
    const project = publicProjects.find(item => item.id === id)!;
    const asset = media.media.find(item => item.id === mediaId)!;
    expect(validateProject(project)).toBe(true);
    expect(project.service).toBe(service);
    expect(project.services?.primary).toBe(service);
    expect(services.services.some(item => item.slug === service && !item.archived)).toBe(true);
    expect(project.media.hero).toBe(mediaId);
    expect(publicProjects.filter(item => item.media.gallery.includes(mediaId)).map(item => item.id)).toEqual([id]);
    expect(asset.filename).toBe(filename);
    expect(asset.projectId).toBe(id);
    expect(asset.service).toBe(service);
    expect(isPublishedMediaAsset(asset)).toBe(true);
    expect(asset.storage).toBe('static');
    for (const path of Object.values(asset.variants)) {
      if (typeof path === 'string' && path.startsWith('/images/')) {
        expect(readFileSync(join(process.cwd(), 'public', path)).byteLength).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the existing service navigation positions and unrelated repair gallery', () => {
    expect(services.services.find(item => item.id === 'restoration')?.order).toBe(3);
    expect(services.services.find(item => item.id === 'drywall')?.order).toBe(4);
    expect(projects.projects.find(item => item.id === 'repairs-001')?.media.gallery).toEqual([
      'repairs-001-hero', 'repairs-001-floor0', 'repairs-001-gutter',
      'repairs-001-img0544', 'repairs-001-img0546',
    ]);
  });
});
