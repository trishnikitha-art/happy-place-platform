import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MediaWorkbenchLoading, PublicPageLoading, PhotoGridLoading } from '@/components/loading-ui';
import { ReviewsFilterClient } from '@/components/reviews-filter-client';

describe('loading presentation boundaries', () => {
  it('reserves editor regions without exposing a preview or enabled editing controls before access is checked', () => {
    const html = renderToStaticMarkup(createElement(MediaWorkbenchLoading, { navigation: true, label: 'Checking website editor access' }));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('lg:grid-cols-2');
    expect(html).toContain('aspect-[4/3]');
    expect(html).not.toMatch(/<(iframe|button|input|img)\b/);
  });

  it.each(['work', 'project', 'service', 'reviews'] as const)('renders a bounded, accessible %s fallback with decorative blocks hidden', kind => {
    const html = renderToStaticMarkup(createElement(PublicPageLoading, { kind }));
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('animate-spin');
  });

  it('matches photo file cards and list rows rather than displaying a false empty folder', () => {
    const grid = renderToStaticMarkup(createElement(PhotoGridLoading, { fileCards: true }));
    const list = renderToStaticMarkup(createElement(PhotoGridLoading, { list: true }));
    const explorerList = renderToStaticMarkup(createElement(PhotoGridLoading, { list: true, compact: false }));
    expect(grid).toContain('aspect-square');
    expect(list).toContain('h-12 w-12');
    expect(explorerList).toContain('h-16 w-16');
    expect(grid).not.toContain('No files');
  });

  it('renders the completed empty reviews state on the server without an artificial loading step', () => {
    const html = renderToStaticMarkup(createElement(ReviewsFilterClient, { allReviews: [] }));
    expect(html).toContain('No reviews found for this service');
    expect(html).not.toContain('Loading reviews');
  });
});
