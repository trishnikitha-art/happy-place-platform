import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MotionProvider } from '@/components/motion-provider';
import { pageMetadata, seo } from '@/config/seo';
import { getCompany } from '@/lib/company';
import { getHomepageHero } from '@/lib/brand';
import { getServiceCardAssignment } from '@/lib/assignment-store';
import { resolvePublicMedia } from '@/lib/media';
import { getProjectBySlug, getProjectWithResolvedMedia, getAllProjects } from '@/lib/projects';
import { getServiceBySlug } from '@/lib/registries';
import { getBlogCopy, BLOG_COPY_RECORDS } from '@/lib/blog-copy';
import { generateMetadata as homeMetadata } from '@/app/page';
import { generateMetadata as serviceMetadata } from '@/app/services/[slug]/page';
import { generateMetadata as projectMetadata } from '@/app/projects/[slug]/page';
import { generateMetadata as blogMetadata } from '@/app/blog/[slug]/page';
import BlogPage, { metadata as blogIndexMetadata } from '@/app/blog/page';
import NewsletterPage, { metadata as newsletterMetadata } from '@/app/newsletter/page';
import ReviewLayout, { metadata as reviewMetadata } from '@/app/review/layout';
import ReviewPage from '@/app/review/page';
import ReviewsPage from '@/app/reviews/page';
import NewsletterThankYouPage, { metadata as newsletterThankYouMetadata } from '@/app/newsletter/thank-you/page';
import { getAllReviews, getReviewStats } from '@/lib/reviews';
import catalog from '@/config/strings.v1.json';
import { decodeTextCatalog } from '@/lib/text-contract';
import sitemap from '@/app/sitemap';

jest.mock('@/lib/brand', () => ({ getHomepageHero: jest.fn(), getOwnerPortrait: jest.fn() }));
jest.mock('@/lib/assignment-store', () => ({ getServiceCardAssignment: jest.fn() }));
jest.mock('@/lib/media', () => ({ resolvePublicMedia: jest.fn() }));
jest.mock('@/lib/reviews', () => ({
  ...jest.requireActual('@/lib/reviews'),
  getAllReviews: jest.fn(),
  getReviewStats: jest.fn(),
}));
jest.mock('@/lib/projects', () => ({
  ...jest.requireActual('@/lib/projects'),
  getProjectBySlug: jest.fn(jest.requireActual('@/lib/projects').getProjectBySlug),
  getProjectWithResolvedMedia: jest.fn(),
}));

const logo = `${seo.siteUrl}/brand/logo.png`;
const image = { id: 'published-photo', alt: 'Painted exterior siding', variants: { web: '/images/published.webp' } };

beforeEach(() => jest.clearAllMocks());

it('takes the verified contractor license in default metadata from the existing company authority', () => {
  expect(seo.description).toContain(getCompany().ccbNumber);
});

it('keeps homepage identity when supplying a gate-approved hero instead of replacing all parent social metadata with images', async () => {
  jest.mocked(getHomepageHero).mockResolvedValue({ resolvedMedia: image } as never);
  const result = await homeMetadata();
  expect(result.title).toEqual({ absolute: seo.title });
  expect(result).toMatchObject({
    description: seo.description,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', siteName: seo.siteName, url: `${seo.siteUrl}/`, title: seo.title, description: seo.description, images: [{ url: `${seo.siteUrl}${image.variants.web}`, alt: image.alt }] },
    twitter: { title: seo.title, description: seo.description, images: [{ url: `${seo.siteUrl}${image.variants.web}`, alt: image.alt }] },
  });
});

it('uses the brand fallback when the homepage resolver returns no published image', async () => {
  jest.mocked(getHomepageHero).mockResolvedValue(null);
  expect(await homeMetadata()).toMatchObject({ openGraph: { images: [{ url: logo }] }, twitter: { images: [{ url: logo }] } });
});

it('reads service copy from the public registry and applies the brand once per channel', async () => {
  const service = getServiceBySlug('painting')!;
  jest.mocked(getServiceCardAssignment).mockResolvedValue({ mediaId: image.id } as never);
  jest.mocked(resolvePublicMedia).mockResolvedValue(image as never);
  const result = await serviceMetadata({ params: Promise.resolve({ slug: service.slug }) });
  expect(result.title).toBe(`${service.name} – Willamette Valley`);
  expect(result).toMatchObject({
    description: service.description,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: { title: `${service.name} – Willamette Valley · ${seo.siteName}`, url: `${seo.siteUrl}/services/${service.slug}`, description: service.description, images: [{ url: `${seo.siteUrl}${image.variants.web}`, alt: image.alt }] },
    twitter: { title: `${service.name} – Willamette Valley · ${seo.siteName}`, description: service.description },
  });
  expect(getServiceCardAssignment).toHaveBeenCalledWith(service.slug, 'services-page');
  expect(resolvePublicMedia).toHaveBeenCalledWith(image.id);
});

it('does not expose a rejected service image through inherited static photography', async () => {
  jest.mocked(getServiceCardAssignment).mockResolvedValue({ mediaId: 'withdrawn-photo' } as never);
  jest.mocked(resolvePublicMedia).mockResolvedValue(null);
  expect(await serviceMetadata({ params: Promise.resolve({ slug: 'painting' }) })).toMatchObject({ openGraph: { images: [{ url: logo }] }, twitter: { images: [{ url: logo }] } });
});

it('prefers the existing editable project metaDescription over story copy and shares the actual project URL', async () => {
  const project = getProjectBySlug('fence-installation-willamette-valley')!;
  expect(project.metaDescription).toBeTruthy();
  jest.mocked(getProjectWithResolvedMedia).mockResolvedValue({ ...project, media: { ...project.media, heroMedia: image } } as never);
  const result = await projectMetadata({ params: Promise.resolve({ slug: project.slug! }) });
  expect(result).toMatchObject({
    title: project.title,
    description: project.metaDescription,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { url: `${seo.siteUrl}/projects/${project.slug}`, description: project.metaDescription, images: [{ url: `${seo.siteUrl}${image.variants.web}`, alt: image.alt }] },
    twitter: { title: `${project.title} · ${seo.siteName}`, description: project.metaDescription },
  });
});

it('preserves project outcome/title fallbacks when editorial metadata or published photography is missing', async () => {
  const project = getProjectBySlug('fence-installation-willamette-valley')!;
  jest.mocked(getProjectWithResolvedMedia).mockResolvedValue({ ...project, media: {} } as never);
  jest.mocked(getProjectBySlug).mockReturnValueOnce({ ...project, metaDescription: ' ' });
  expect(await projectMetadata({ params: Promise.resolve({ slug: project.slug! }) })).toMatchObject({ description: project.story!.outcome, openGraph: { images: [{ url: logo }] } });
  jest.mocked(getProjectBySlug).mockReturnValueOnce({ ...project, metaDescription: undefined, story: undefined });
  expect(await projectMetadata({ params: Promise.resolve({ slug: project.slug! }) })).toMatchObject({ description: project.title, twitter: { images: [{ url: logo }] } });
});

it('uses the registered blog excerpt for search and sharing instead of extracting a body line', async () => {
  const post = getBlogCopy(BLOG_COPY_RECORDS[0].slug)!;
  const result = await blogMetadata({ params: Promise.resolve({ slug: post.slug }) });
  expect(result).toMatchObject({ description: post.excerpt, openGraph: { type: 'article', description: post.excerpt, url: `${seo.siteUrl}/blog/${post.slug}` }, twitter: { description: post.excerpt } });
});

it('keeps missing or archived content out of metadata image resolution', async () => {
  expect(await serviceMetadata({ params: Promise.resolve({ slug: 'bathrooms' }) })).toEqual({ title: 'Service Not Found' });
  expect(await projectMetadata({ params: Promise.resolve({ slug: 'custom-builtins-corvallis' }) })).toEqual({});
  expect(getServiceCardAssignment).not.toHaveBeenCalled();
  expect(getProjectWithResolvedMedia).not.toHaveBeenCalled();
});

it('keeps a single visible H1 on the blog and newsletter indexes with page-specific social URLs', () => {
  for (const Page of [BlogPage, NewsletterPage]) {
    const html = renderToStaticMarkup(React.createElement(MotionProvider, { children: React.createElement(Page) }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  }
  expect(blogIndexMetadata).toMatchObject({ openGraph: { url: `${seo.siteUrl}/blog` } });
  expect(newsletterMetadata).toMatchObject({ openGraph: { url: `${seo.siteUrl}/newsletter` } });
});

it('keeps the unfinished newsletter archive noindex and out of the sitemap until its existing article placeholders are browsable', () => {
  expect(newsletterMetadata).toMatchObject({
    robots: { index: false, follow: true },
    alternates: { canonical: '/newsletter' },
    openGraph: { url: `${seo.siteUrl}/newsletter` },
  });
  expect(sitemap().some(entry => entry.url === `${seo.siteUrl}/newsletter` || entry.url.startsWith(`${seo.siteUrl}/newsletter/`))).toBe(false);
  const html = renderToStaticMarkup(React.createElement(MotionProvider, { children: React.createElement(NewsletterPage) }));
  expect(html.match(/<article\b/g)).toHaveLength(3);
  expect(html.match(/<button\b/g)).toHaveLength(3);
  for (const id of [1, 2, 3]) expect(html).toContain(`data-text-key="newsletterArchive.article.${id}.title"`);
  expect(html).not.toMatch(/href="\/newsletter\//);
});

it('renders one H1 on the async homeowner reviews page, including the empty state', async () => {
  jest.mocked(getReviewStats).mockResolvedValue({ count: 0, average: 0 } as never);
  jest.mocked(getAllReviews).mockResolvedValue([]);
  const html = renderToStaticMarkup(await ReviewsPage());
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain('data-text-key="reviews.hero.title"');
  expect(html).toContain('data-text-key="reviews.empty"');
  expect(html).toContain('href="/review"');
});

it('renders one H1 and a working blog destination on the newsletter confirmation page', () => {
  const html = renderToStaticMarkup(React.createElement(NewsletterThankYouPage));
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain('data-text-key="newsletterThanks.copy.2"');
  expect(html).toContain('href="/blog"');
  expect(html).not.toContain('href="/resources"');
  expect(newsletterThankYouMetadata).toMatchObject({ robots: { index: false, follow: true }, alternates: { canonical: '/newsletter/thank-you' } });
});

it('uses a brand fallback without manufacturing image descriptions or rewriting the input URL', () => {
  const result = pageMetadata({ title: 'A project', description: 'A useful description.', path: '/projects/a-project' });
  expect(result).toMatchObject({ openGraph: { images: [{ url: logo, alt: `${seo.siteName} logo` }] }, twitter: { images: [{ url: logo, alt: `${seo.siteName} logo` }] } });
});

it('gives the review form its own canonical identity using existing copy and keeps the utility page out of search', () => {
  const copy = decodeTextCatalog(catalog).fields;
  const description = `${copy['review.introduction'].value} ${copy['review.question'].value}`;
  expect(reviewMetadata).toMatchObject({
    title: copy['review.title'].value,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: '/review' },
    openGraph: { url: `${seo.siteUrl}/review`, title: `${copy['review.title'].value} · ${seo.siteName}`, description },
    twitter: { title: `${copy['review.title'].value} · ${seo.siteName}`, description },
  });
  const html = renderToStaticMarkup(React.createElement(ReviewLayout, { children: React.createElement(ReviewPage) }));
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain('data-text-key="review.title"');
  expect(html).toContain('data-text-key="review.submit"');
  expect(html).toContain('id="service"');
});

it('publishes the same project slugs as the routes, only public content, and every linked blog article', () => {
  const entries = sitemap();
  const projectUrls = entries.filter(entry => entry.url.includes('/projects/')).map(entry => entry.url);
  expect(projectUrls).toEqual(getAllProjects().map(project => `${seo.siteUrl}/projects/${project.slug || project.id}`));
  expect(projectUrls).not.toContain(`${seo.siteUrl}/projects/fences-001`);
  expect(projectUrls.some(url => url.includes('custom-builtins'))).toBe(false);
  for (const post of BLOG_COPY_RECORDS) expect(entries.filter(entry => entry.url === `${seo.siteUrl}/blog/${post.slug}`)).toHaveLength(1);
  expect(entries.filter(entry => entry.url === `${seo.siteUrl}/blog`)).toHaveLength(1);
  expect(entries.some(entry => /\/workbench|\/admin|\/newsletter\/thank-you/.test(entry.url))).toBe(false);
  expect(entries.find(entry => entry.url === `${seo.siteUrl}/services`)).not.toHaveProperty('lastModified');
});
