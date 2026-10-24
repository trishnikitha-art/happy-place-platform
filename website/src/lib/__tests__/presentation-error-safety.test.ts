import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { serializeJsonLd } from '../json-ld';
import { ProviderErrorBoundary } from '@/components/provider-error-boundary';
import { ReviewStructuredData } from '@/components/review-structured-data';
import { ReviewProvider, ReviewStatus, type Review } from '@/types/reviews';
import ErrorPage from '@/app/error';
import GlobalError from '@/app/global-error';
import { PageErrorFallback } from '@/components/page-error-fallback';

describe('JSON-LD HTML serialization', () => {
  it('preserves structured facts and neutralizes HTML script termination', () => {
    const value = {
      '@type': 'LocalBusiness',
      name: 'Happy Place Carpentry',
      description: '</script><script>alert("private-content")</script>',
      areaServed: 'Benton < Linn & Marion > Polk',
    };
    const serialized = serializeJsonLd(value);
    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('</script>');
    expect(JSON.parse(serialized)).toEqual(value);
  });

  it('keeps hostile published review text inside one JSON-LD script element', () => {
    const review: Review = {
      id: 'published-review', provider: ReviewProvider.Manual, status: ReviewStatus.Published,
      featured: false, verified: false, reviewer: { name: 'Homeowner' }, rating: 5,
      date: '2026-10-12', service: 'deck', body: '</script><script>alert("injected")</script>',
    };
    const markup = renderToStaticMarkup(React.createElement(ReviewStructuredData, {
      reviews: [review], businessName: 'Happy Place Carpentry', businessUrl: 'https://happyplacecarpentry.com',
    }));
    expect(markup.match(/<script\b/g)).toHaveLength(1);
    expect(markup.match(/<\/script>/g)).toHaveLength(1);
    const json = markup.match(/<script\b[^>]*>([\s\S]*)<\/script>/)?.[1];
    expect(JSON.parse(json!).review[0].reviewBody).toBe(review.body);
  });
});

describe('native route recovery surfaces', () => {
  it.each([ErrorPage, GlobalError])('offers recovery without exposing private error details', (Boundary) => {
    const markup = renderToStaticMarkup(React.createElement(Boundary, {
      error: new Error('sensitive token and customer details'), reset: jest.fn(),
    }));
    expect(markup).toContain('We couldn’t load this page');
    expect(markup).toContain('Try again');
    expect(markup).toContain('href="/contact"');
    expect(markup).not.toContain('sensitive token');
    expect(markup).not.toContain('customer details');
  });

  it('provides its own document when the root layout fails', () => {
    const markup = renderToStaticMarkup(React.createElement(GlobalError, { error: new Error('root failed'), reset: jest.fn() }));
    expect(markup).toMatch(/^<html lang="en"><body/);
    expect(markup).toContain('<main>');
    expect(markup).toMatch(/<\/body><\/html>$/);
  });

  it('uses the framework reset callback only when recovery is requested', () => {
    const reset = jest.fn();
    const surface = PageErrorFallback({ reset });
    function findButton(node: React.ReactNode): React.ReactElement<{ onClick: () => void }> | undefined {
      if (!React.isValidElement<{ children?: React.ReactNode; onClick: () => void }>(node)) return;
      if (node.type === 'button') return node;
      for (const child of React.Children.toArray(node.props.children)) {
        const button = findButton(child);
        if (button) return button;
      }
    }
    const button = findButton(surface);
    expect(button).toBeDefined();
    expect(reset).not.toHaveBeenCalled();
    button!.props.onClick();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe('provider error fallback', () => {
  it('never retries rendering the crashed children without an explicit fallback', () => {
    const child = React.createElement('div', null, 'crashed provider tree');
    const boundary = new ProviderErrorBoundary({ children: child, providerName: 'test' });
    boundary.state = ProviderErrorBoundary.getDerivedStateFromError(new Error('private-failure'));
    expect(boundary.render()).toBeNull();
  });

  it('renders the explicit fallback after a failure and children before a failure', () => {
    const child = React.createElement('div', null, 'normal tree');
    const fallback = React.createElement('p', null, 'Recovery available');
    const boundary = new ProviderErrorBoundary({ children: child, providerName: 'test', fallback });
    expect(boundary.render()).toBe(child);
    boundary.state = ProviderErrorBoundary.getDerivedStateFromError(new Error('private-failure'));
    expect(renderToStaticMarkup(boundary.render())).toContain('Recovery available');
    expect(renderToStaticMarkup(boundary.render())).not.toContain('normal tree');
  });
});
