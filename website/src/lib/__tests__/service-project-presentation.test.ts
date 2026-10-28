import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ServicePage from '@/app/services/[slug]/page';
import ProjectPage from '@/app/projects/[slug]/page';
import { MotionProvider } from '@/components/motion-provider';
import { getServiceBySlug, getNonArchivedServices } from '@/lib/registries';
import { getServiceGallery } from '@/lib/galleries';
import { getProjectBySlug, getProjectWithResolvedMedia, getProjectsWithResolvedMedia } from '@/lib/projects';
import type { Project } from '@/types/projects';
import type { Media } from '@/types/media';
import type { Service } from '@/types/registries';

jest.mock('@/lib/registries', () => ({ getServiceBySlug: jest.fn(), getNonArchivedServices: jest.fn() }));
jest.mock('@/lib/galleries', () => ({ getServiceGallery: jest.fn() }));
jest.mock('@/lib/projects', () => ({
  getProjectBySlug: jest.fn(), getProjectWithResolvedMedia: jest.fn(), getProjectsWithResolvedMedia: jest.fn(),
}));
jest.mock('@/lib/assignment-store', () => ({ getServiceCardAssignment: jest.fn(async () => null) }));
jest.mock('@/lib/media', () => ({ resolvePublicMedia: jest.fn(async () => null) }));
jest.mock('@/components/visual-slot', () => ({
  VisualSlot: ({ id, currentMediaId, children }: { id: string; currentMediaId: string | null; children: ReactNode }) =>
    createElement('div', { 'data-test-slot': id, 'data-test-media': currentMediaId }, children),
}));
jest.mock('@/components/before-after-slider', () => ({
  BeforeAfterSlider: ({ project }: { project: Project }) => createElement('div', {
    'data-comparison-project': project.id,
    'data-before': project.media.beforeMedia?.id,
    'data-after': project.media.afterMedia?.id,
  }),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, priority: _priority, placeholder: _placeholder, blurDataURL: _blurDataURL, ...props }: Record<string, unknown>) =>
    createElement('img', props),
}));

const service: Service = {
  id: 'fences', slug: 'fences', name: 'Fences', description: 'Fences built for your home.', icon: 'fence',
  featured: true, homepageEligible: true, order: 1, capabilities: { estimationAuthority: 'building' },
};
const sourceProject: Project = {
  id: 'fence-example', slug: 'fence-example', title: 'Cedar fence', service: 'fences', status: 'completed',
  location: { city: 'Albany', county: 'Linn', state: 'OR' },
  media: { hero: 'source-only-hero-reference', gallery: [] },
  story: { challenge: 'The old fence needed repair.', solution: 'Rebuilt the fence.', outcome: 'A welcoming yard.' },
  tags: [], reviews: [], featured: true,
};
const publishedHero: Media = {
  id: 'published-hero', filename: 'fence.webp', type: 'image', orientation: 'landscape',
  alt: 'Completed cedar fence with aligned boards', tags: [], roles: ['hero'],
  dimensions: { width: 1600, height: 1200 }, variants: { web: '/published-fence.webp' },
  source: 'local', storage: 'static', lifecycleState: 'published', contentHash: 'a'.repeat(64),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getServiceBySlug).mockReturnValue(service);
  jest.mocked(getNonArchivedServices).mockReturnValue([service]);
  jest.mocked(getServiceGallery).mockReturnValue({
    id: 'service-fences', name: 'Fences', description: '', projects: [sourceProject], count: 1, filter: { service: 'fences' },
  });
  jest.mocked(getProjectBySlug).mockReturnValue(sourceProject);
});

async function renderService(media: Project['media']) {
  const resolvedProject = { ...sourceProject, media };
  jest.mocked(getProjectsWithResolvedMedia).mockResolvedValue([resolvedProject]);
  const html = renderToStaticMarkup(createElement(MotionProvider, {
    children: await ServicePage({ params: Promise.resolve({ slug: 'fences' }) }),
  }));
  expect(getProjectsWithResolvedMedia).toHaveBeenCalledWith([sourceProject]);
  expect(getProjectWithResolvedMedia).not.toHaveBeenCalled();
  return html;
}

it('retains the completed comparison when both validated comparison images exist', async () => {
  const html = await renderService({
    ...sourceProject.media, heroMedia: publishedHero,
    beforeMedia: { ...publishedHero, id: 'published-before' },
    afterMedia: { ...publishedHero, id: 'published-after' },
  });
  expect(html).toContain('data-comparison-project="fence-example" data-before="published-before" data-after="published-after"');
  expect(html).not.toContain('data-test-slot="project-hero-fence-example"');
});

it.each([false, true])('shows the validated hero with lazy responsive delivery when the comparison is incomplete (before only: %s)', async beforeOnly => {
  const html = await renderService({
    ...sourceProject.media, heroMedia: publishedHero,
    ...(beforeOnly ? { beforeMedia: { ...publishedHero, id: 'published-before' } } : {}),
  });
  const spotlight = html.match(/<div data-test-slot="project-hero-fence-example" data-test-media="published-hero">([\s\S]*?)<\/div>/)?.[1];
  expect(spotlight).toBeDefined();
  expect(spotlight).toContain('src="/published-fence.webp"');
  expect(spotlight).toContain(`alt="${publishedHero.alt}"`);
  expect(spotlight).toContain('loading="lazy"');
  expect(spotlight).toMatch(/sizes="\(max-width: 639px\) calc\(100vw - 2rem\)[^"]+76rem"/);
  expect(html).not.toContain('data-comparison-project');
});

it('keeps the project link without substituting an image when the public resolver supplies no hero', async () => {
  const html = await renderService(sourceProject.media);
  expect(html).toContain('href="/projects/fence-example"');
  expect(html).toContain('View Full Project');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('source-only-hero-reference');
  expect(html).not.toContain('data-comparison-project');
});

it('shows the canonical service and location while omitting unavailable project facts and empty materials', async () => {
  const project = { ...sourceProject, materials: { primary: '', secondary: [], customMaterials: [] } };
  jest.mocked(getProjectBySlug).mockReturnValue(project);
  jest.mocked(getProjectWithResolvedMedia).mockResolvedValue(project);
  const html = renderToStaticMarkup(createElement(MotionProvider, {
    children: await ProjectPage({ params: Promise.resolve({ slug: 'fence-example' }) }),
  }));
  expect(getServiceBySlug).toHaveBeenCalledWith(sourceProject.service);
  expect(html).toContain('>Fences</p>');
  expect(html).toContain('>Albany</p>');
  expect(html).not.toMatch(/>(?:Completed|Duration|Materials|Materials Used)<|>—</);
});
