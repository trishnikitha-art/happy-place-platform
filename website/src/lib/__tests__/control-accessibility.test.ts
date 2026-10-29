import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MotionProvider } from '@/components/motion-provider';
import ReviewPage from '@/app/review/page';
import { ReviewsFilter } from '@/components/reviews-filter';
import { NewsletterSignup } from '@/components/newsletter-signup';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

it('gives every native review rating control a distinct value and one selected state', () => {
  const html = renderToStaticMarkup(createElement(MotionProvider, { children: createElement(ReviewPage) }));
  expect(html).toContain('role="group" aria-labelledby="review-rating-label"');
  for (const rating of [1, 2, 3, 4, 5]) {
    expect(html).toMatch(new RegExp(`<button[^>]*type="button"[^>]*aria-label="${rating} ${rating === 1 ? 'star' : 'stars'}"[^>]*aria-pressed="${rating === 5}"[^>]*class="motion-control[^>]*h-11 w-11`));
  }
  expect(html).not.toContain('hover:scale-110');
});

it('exposes the selected review service and native 44px filter controls without JavaScript', () => {
  const html = renderToStaticMarkup(createElement(ReviewsFilter, { selectedService: 'painting', onServiceChange: jest.fn() }));
  expect(html).toContain('role="group" aria-label="Filter reviews by service"');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*class="review-filter-control motion-control min-h-11 min-w-11[^>]*>Painting<\/button>/);
});

it('reserves newsletter feedback space while preserving its accessible native inputs', () => {
  const html = renderToStaticMarkup(createElement(MotionProvider, { children: createElement(NewsletterSignup) }));
  expect(html).toMatch(/<p id="[^"]+-error" class="control-motion-feedback min-h-18 text-xs text-text-on-dark\/80"><span data-text-key="newsletter.privacy">/);
  expect(html).not.toContain('role="alert"');
  expect(html).toMatch(/<input[^>]*name="email"[^>]*type="email"[^>]*required=""/);
  expect(html).toMatch(/<input[^>]*name="firstName"[^>]*autoComplete="given-name"/i);
  expect(html).not.toContain('opacity:0');
});
