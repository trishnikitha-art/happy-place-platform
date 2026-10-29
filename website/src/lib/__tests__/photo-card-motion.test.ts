import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useMotion } from '@/components/motion-provider';
import { CraftCard } from '@/components/ui/card';
import { ServiceCard } from '@/components/service-card';
import { ProjectPhotos } from '@/components/project-photos';
import { ProjectLightbox } from '@/components/project-lightbox';
import OurWorkClient from '@/app/our-work/OurWorkClient';
import { archiveKey } from '@/lib/archive-order';
import type { Media } from '@/types/media';
import type { Project } from '@/types/projects';
import type { Service } from '@/types/registries';

jest.mock('@/components/motion-provider', () => ({ useMotion: jest.fn() }));
jest.mock('@/components/project-lightbox', () => ({ ProjectLightbox: jest.fn(() => null) }));
jest.mock('@/components/visual-slot', () => ({
  VisualSlot: ({ id, currentMediaId, children }: { id: string; currentMediaId: string | null; children: ReactNode }) =>
    createElement('div', { 'data-test-slot': id, 'data-test-media': currentMediaId }, children),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, priority: _priority, placeholder: _placeholder, blurDataURL: _blurDataURL, ...props }: Record<string, unknown>) =>
    createElement('img', props),
}));

const service: Service = {
  id: 'fences', slug: 'fences', name: 'Fences', description: 'Built for your home.', icon: 'fence',
  featured: true, homepageEligible: true, order: 1, capabilities: { estimationAuthority: 'building' },
};
const firstPhoto: Media = {
  id: 'photo-one', filename: 'one.webp', type: 'image', orientation: 'landscape', alt: 'Aligned cedar boards',
  dimensions: { width: 1600, height: 1200 }, variants: { web: '/one.webp' }, tags: [], roles: ['gallery'],
};
const secondPhoto: Media = { ...firstPhoto, id: 'photo-two', alt: 'Finished fence gate', variants: { web: '/two.webp' } };
const project: Project = {
  id: 'fence-example', slug: 'fence-example', title: 'Cedar fence', service: 'fences', status: 'completed',
  location: { city: 'Albany', county: 'Linn', state: 'OR' },
  media: { hero: firstPhoto.id, heroMedia: firstPhoto, gallery: [firstPhoto.id, secondPhoto.id], galleryMedia: [firstPhoto, secondPhoto] },
  story: { challenge: 'Repair the fence.', solution: 'Rebuilt the gate.', outcome: 'A welcoming yard.' }, tags: [], reviews: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useMotion).mockReturnValue({ prefersReducedMotion: true, isMotionEnabled: false });
});

it('renders static story cards without a client motion consumer or decorative overlay', () => {
  const html = renderToStaticMarkup(createElement(CraftCard, { children: 'Project details' }));
  expect(html).toContain('Project details');
  expect(useMotion).not.toHaveBeenCalled();
  expect(html).not.toMatch(/data-motion|craft-card-sheen|opacity:0|visibility:hidden/);
});

it('does not add a light sweep to a service card without a published photo', () => {
  const html = renderToStaticMarkup(createElement(ServiceCard, { service, runtimeCardMediaObject: null }));
  expect(html).toContain('href="/services/fences"');
  expect(html).toContain('Project photos coming soon');
  expect(useMotion).not.toHaveBeenCalled();
  expect(html).not.toContain('craft-card-sheen');
});

it.each([false, true])('keeps service photographs, names and navigation present with motion enabled=%s', enabled => {
  jest.mocked(useMotion).mockReturnValue({ prefersReducedMotion: !enabled, isMotionEnabled: enabled });
  const html = renderToStaticMarkup(createElement(ServiceCard, { service, runtimeCardMediaObject: firstPhoto }));
  expect(html).toContain('href="/services/fences"');
  expect(html).toContain('src="/one.webp"');
  expect(html).toContain('alt="Aligned cedar boards"');
  expect(html).toContain('>Fences</span>');
  expect(html).toContain(`data-motion="${enabled ? 'enabled' : 'disabled'}"`);
  expect(html).not.toMatch(/opacity:0|visibility:hidden|style="transform/);
});

it('keeps native named photo controls and the filtered canonical lightbox order in the static fallback', () => {
  const photos = [secondPhoto, { ...firstPhoto, id: 'no-rendition', variants: {} }, firstPhoto];
  const html = renderToStaticMarkup(createElement(ProjectPhotos, { photos }));
  expect(html.match(/<button[^>]+type="button"/g)).toHaveLength(2);
  expect(html).toContain('aria-label="View Finished fence gate in full screen"');
  expect(html).toContain('aria-label="View Aligned cedar boards in full screen"');
  expect(html.indexOf('src="/two.webp"')).toBeLessThan(html.indexOf('src="/one.webp"'));
  expect(jest.mocked(ProjectLightbox).mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
    isOpen: false,
    images: [{ src: '/two.webp', alt: secondPhoto.alt }, { src: '/one.webp', alt: firstPhoto.alt }],
  }));
  expect(html).not.toMatch(/opacity:0|visibility:hidden/);
});

it('retains archive ownership, order, slot identities and readable project captions without motion', () => {
  const order = [archiveKey(project.id, secondPhoto.id), archiveKey(project.id, firstPhoto.id)];
  const html = renderToStaticMarkup(createElement(OurWorkClient, {
    company: { proof: { projectsCompleted: '125+' }, ccbNumber: 'CCB #254240' },
    allProjects: [project], featuredProjects: [], archiveOrder: order,
  }));
  expect(html.indexOf(`data-archive-key="${order[0]}"`)).toBeLessThan(html.indexOf(`data-archive-key="${order[1]}"`));
  for (const photo of [firstPhoto, secondPhoto]) {
    expect(html).toContain(`data-test-slot="our-work-gallery::${project.id}::${photo.id}"`);
    expect(html).toContain(`data-test-media="${photo.id}"`);
    expect(html).toContain(`aria-label="View ${photo.alt} in full screen"`);
  }
  const captions = [...html.matchAll(/<span class="gallery-photo-caption([^"]*)">([^<]+)<\/span>/g)];
  expect(captions).toHaveLength(2);
  for (const caption of captions) {
    expect(caption[1]).not.toMatch(/opacity-0|hidden/);
    expect(caption[2]).toBe(project.title);
  }
  expect(html).not.toMatch(/opacity:0|visibility:hidden/);
});
