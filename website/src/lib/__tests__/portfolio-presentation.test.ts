import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { allPortfolioFilters, filterPortfolio, readPortfolioFilters } from '@/app/our-work/portfolio-filters';
import { ProjectPhotos } from '@/components/project-photos';
import { BeforeAfterSlider } from '@/components/before-after-slider';
import type { Project } from '@/types/projects';
import type { Media } from '@/types/media';

const projects = [
  { id: 'fence-b', service: 'fences', location: { city: 'Corvallis' } },
  { id: 'paint-a', service: 'painting', location: { city: 'Albany' } },
  { id: 'fence-a', service: 'fences', location: { city: 'Albany' } },
] as Project[];

it('filters the approved order without sorting or mutating the source collection', () => {
  const before = structuredClone(projects);
  expect(filterPortfolio(projects, { service: 'fences', city: 'all' }).map(project => project.id)).toEqual(['fence-b', 'fence-a']);
  expect(filterPortfolio(projects, { service: 'all', city: 'Albany' }).map(project => project.id)).toEqual(['paint-a', 'fence-a']);
  expect(filterPortfolio(projects, { service: 'fences', city: 'Albany' }).map(project => project.id)).toEqual(['fence-a']);
  expect(projects).toEqual(before);
});

it('restores valid URL selections and ignores options absent from actual project data', () => {
  expect(readPortfolioFilters('?service=fences&city=Albany', projects)).toEqual({ service: 'fences', city: 'Albany' });
  expect(readPortfolioFilters('?service=imaginary&city=Unknown&workbench=true', projects)).toEqual(allPortfolioFilters);
  expect(readPortfolioFilters('?service=painting&city=Corvallis', projects)).toEqual({ service: 'painting', city: 'Corvallis' });
  expect(filterPortfolio(projects, { service: 'painting', city: 'Corvallis' })).toEqual([]);
});

it('keeps gallery sequence and existing editor slot identity while offering full-photo controls', () => {
  const media = (id: string): Media => ({ id, filename: `${id}.webp`, alt: `${id} detail`, type: 'image', orientation: 'landscape', dimensions: { width: 1200, height: 800 }, variants: { web: `/images/${id}.webp` }, tags: [], roles: ['gallery'] });
  const html = renderToStaticMarkup(React.createElement(ProjectPhotos, { photos: [media('second'), media('first')], project: { id: 'fence', title: 'Cedar fence', slug: 'cedar-fence' } }));
  expect(html.indexOf('data-media-id="second"')).toBeLessThan(html.indexOf('data-media-id="first"'));
  expect(html).toContain('data-slot-id="project-gallery::fence::0"');
  expect(html).toContain('data-slot-id="project-gallery::fence::1"');
  expect(html).toContain('data-slot-route="/projects/cedar-fence"');
  expect(html).toContain('aria-label="View photo 1: second detail"');
  expect(html).not.toContain('/placeholder');
});

it('omits an empty gallery instead of inventing a project image or empty proof card', () => {
  expect(renderToStaticMarkup(React.createElement(ProjectPhotos, { photos: [] }))).toBe('');
});

it('offers native comparison controls only for an explicit pair with different bytes', () => {
  const media = (id: string, contentHash: string) => ({ id, contentHash, alt: id, variants: { web: `/images/${id}.webp` } }) as Media;
  const project = { id: 'fence', title: 'Cedar fence', location: { city: 'Corvallis' }, media: { before: 'before', after: 'after', beforeMedia: media('before', 'a'), afterMedia: media('after', 'b') } } as Project;
  const html = renderToStaticMarkup(React.createElement(BeforeAfterSlider, { project, route: '/projects/cedar-fence' }));
  expect(html).toContain('type="range"');
  expect(html).toContain('aria-label="Choose comparison view"');
  expect(html).toContain('data-slot-id="slider-left-fence"');
  expect(html).toContain('data-slot-route="/projects/cedar-fence"');
  expect(html).not.toContain('grayscale');
  const sameBytes = { ...project, media: { ...project.media, afterMedia: media('after', 'a') } };
  expect(renderToStaticMarkup(React.createElement(BeforeAfterSlider, { project: sameBytes }))).toBe('');
  expect(renderToStaticMarkup(React.createElement(BeforeAfterSlider, { project: { ...project, media: {} } as Project }))).toBe('');
});
