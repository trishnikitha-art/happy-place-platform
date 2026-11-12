import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from '@/app/page';
import { getFeaturedProjects, getProjectsWithResolvedMedia } from '@/lib/projects';
import type { Project } from '@/types/projects';
import type { Media } from '@/types/media';

jest.mock('@/lib/projects', () => ({
  getFeaturedProjects: jest.fn(),
  getProjectsWithResolvedMedia: jest.fn(),
}));
jest.mock('@/lib/brand', () => ({
  getHomepageHero: jest.fn(async () => ({
    mediaId: 'workshop',
    resolvedMedia: { id: 'workshop', alt: 'Workshop', variants: { web: '/workshop.webp' } },
  })),
  getOwnerPortrait: jest.fn(async () => null),
}));
jest.mock('@/lib/reviews', () => ({
  getFeaturedReviewsWithResolvedMedia: jest.fn(async () => []),
  getReviewStats: jest.fn(async () => ({ count: 0, average: 0 })),
}));
jest.mock('@/lib/registries', () => ({
  getNonArchivedServices: jest.fn(() => [{
    id: 'painting', slug: 'painting', name: 'Painting', homepageEligible: true,
  }]),
}));
jest.mock('@/lib/homepage-service-media', () => ({ getHomepageServiceMedia: jest.fn(async () => new Map()) }));
jest.mock('@/components/service-card', () => ({ ServiceCard: () => createElement('div', { 'data-test-services': true }) }));
jest.mock('@/components/scroll-reveal', () => ({
  ScrollReveal: ({ children, className }: { children: ReactNode; className?: string }) => createElement('div', { className }, children),
}));
jest.mock('@/components/workshop-atmosphere', () => ({ WorkshopAtmosphere: () => null }));
jest.mock('@/components/newsletter-signup', () => ({ NewsletterSignup: () => null }));
jest.mock('@/components/visual-slot', () => ({
  VisualSlot: ({ id, currentMediaId, children }: { id: string; currentMediaId: string | null; children: ReactNode }) =>
    createElement('div', { 'data-test-slot': id, 'data-test-media': currentMediaId }, children),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, priority, placeholder: _placeholder, blurDataURL: _blurDataURL, fetchPriority: _fetchPriority, ...props }: Record<string, unknown>) =>
    createElement('img', { ...props, 'data-priority': priority ? 'true' : undefined }),
}));

function project(id: string, published = true): Project {
  const hero = {
    id: id + '-photo', alt: id + ' published project', variants: { web: '/' + id + '.webp' },
  } as Media;
  return {
    id, slug: id, title: id + ' project', service: 'painting', status: 'completed',
    location: { city: 'Corvallis', county: 'Benton', state: 'OR' },
    featured: true, tags: [], reviews: [],
    media: { hero: id + '-unresolved-reference', gallery: [], ...(published ? { heroMedia: hero } : {}) },
  };
}

async function render(projects: Project[]) {
  jest.mocked(getFeaturedProjects).mockReturnValue(projects);
  jest.mocked(getProjectsWithResolvedMedia).mockResolvedValue(projects);
  const html = renderToStaticMarkup(await HomePage());
  expect(getProjectsWithResolvedMedia).toHaveBeenLastCalledWith(projects);
  return html;
}

beforeEach(() => jest.clearAllMocks());

it('shows the first approved existing tile before services once, with the same editable slot and one eager hero', async () => {
  const html = await render([project('fence'), project('pergola')]);
  expect(html.indexOf('homepage-featured-project-fence')).toBeLessThan(html.indexOf('data-test-services'));
  expect(html.indexOf('homepage-featured-project-pergola')).toBeGreaterThan(html.indexOf('data-test-services'));
  expect(html.match(/href="\/projects\/fence"/g)).toHaveLength(1);
  expect(html.match(/homepage-featured-project-fence/g)).toHaveLength(1);
  expect(html).toContain('data-test-media="fence-photo"');
  expect(html).toContain('src="/fence.webp"');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('Painting · Corvallis');
  expect(html).toContain('data-content-id="fence" data-content-field="title"');
  expect(html.match(/data-priority="true"/g)).toHaveLength(1);
});

it('promotes the next approved tile when an earlier hero is unavailable and keeps the archive link for one photo', async () => {
  const html = await render([project('withdrawn', false), project('paint')]);
  expect(html).not.toContain('withdrawn-unresolved-reference');
  expect(html).not.toContain('homepage-featured-project-withdrawn');
  expect(html.indexOf('homepage-featured-project-paint')).toBeLessThan(html.indexOf('data-test-services'));
  expect(html.match(/href="\/projects\/paint"/g)).toHaveLength(1);
  expect(html.match(/See all projects/g)).toHaveLength(1);
});

it('keeps the original service and archive paths without manufacturing media when no featured photo resolves', async () => {
  const html = await render([project('missing', false)]);
  expect(html).not.toContain('homepage-featured-project-');
  expect(html).toContain('data-test-services');
  expect(html).toContain('See all projects');
  expect(html).toContain('src="/workshop.webp"');
});

it('keeps selection within the four featured tiles the homepage already presented', async () => {
  const html = await render([
    project('one', false), project('two', false), project('three', false), project('four', false), project('fifth'),
  ]);
  expect(html).not.toContain('homepage-featured-project-fifth');
});

it.each([3, 4])('keeps %i published projects readable without empty bento tracks or cropped work', async (count) => {
  const projects = Array.from({ length: count }, (_, index) => project('work-' + index));
  const html = await render(projects);
  for (const item of projects) {
    expect(html.match(new RegExp('href="/projects/' + item.id + '"', 'g'))).toHaveLength(1);
    expect(html).toContain('data-test-media="' + item.id + '-photo"');
  }
  expect(html).toContain('mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2');
  expect(html).not.toContain('auto-rows-[200px]');
  expect(html).not.toContain('sm:row-span-2');
  expect(html).toContain('data-text-key="home.projects.action">View project');
  expect(html.match(/craft-photo object-contain/g)).toHaveLength(count);
});
