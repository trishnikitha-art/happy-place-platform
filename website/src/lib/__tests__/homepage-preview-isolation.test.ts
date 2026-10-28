import React, { cloneElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from '@/app/page';
import PreviewPage from '@/app/workbench/preview/[[...path]]/page';
import { workbenchSession } from '@/lib/workbench-session';
import { readTextTransaction } from '@/lib/text-authority';
import catalog from '@/config/strings.v1.json';
import { MotionProvider } from '@/components/motion-provider';

function renderInApp(children: React.ReactNode) {
  return renderToStaticMarkup(React.createElement(MotionProvider, { children }));
}

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error('NOT_FOUND'); },
}));
jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));
jest.mock('@/lib/text-authority', () => ({ readTextTransaction: jest.fn() }));
jest.mock('@/lib/content-authority', () => ({ readContentReceipt: jest.fn() }));
jest.mock('@/lib/brand', () => ({ getHomepageHero: async () => null, getOwnerPortrait: async () => null }));
jest.mock('@/lib/registries', () => ({ getNonArchivedServices: () => [] }));
jest.mock('@/lib/homepage-service-media', () => ({ getHomepageServiceMedia: async () => ({}) }));
jest.mock('@/lib/projects', () => ({ getFeaturedProjects: () => [], getProjectsWithResolvedMedia: async () => [] }));
jest.mock('@/lib/reviews', () => ({
  getFeaturedReviewsWithResolvedMedia: async () => [],
  getReviewStats: async () => ({ count: 0, average: 0 }),
}));

const heroKeys = [
  'homepage.hero.title', 'homepage.hero.description',
  'homepage.hero.primaryAction', 'homepage.hero.secondaryAction',
] as const;

function receipt(key: typeof heroKeys[number], state = 'prepared', stagingVerified = true) {
  return { mutation: { key, value: 'Private staged copy' }, state, stagingVerified };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
});

it('renders public homepage copy without reading preview query values, sessions or transactions', async () => {
  const props = new Proxy({}, { get: () => { throw new Error('Public page inspected preview input'); } });
  const html = renderInApp(await Reflect.apply(HomePage, undefined, [props]));
  for (const key of heroKeys) {
    expect(html).toContain(catalog.fields[key].value.replaceAll('&', '&amp;'));
    expect(html.split(`data-text-key="${key}"`)).toHaveLength(2);
  }
  expect(html).toContain('href="/contact"');
  expect(html).toContain('href="/our-work"');
  expect(workbenchSession.isAuthenticated).not.toHaveBeenCalled();
  expect(readTextTransaction).not.toHaveBeenCalled();
});

it.each(heroKeys)('uses the existing authenticated preview provider for %s without leaking into public copy', async key => {
  const baseline = renderInApp(await HomePage());
  jest.mocked(readTextTransaction).mockResolvedValue(receipt(key) as never);
  const preview = await PreviewPage({
    params: Promise.resolve({}), searchParams: Promise.resolve({ textTransaction: 'staged-text' }),
  });
  // Resolve the async server page while retaining the actual preview provider.
  const html = renderInApp(cloneElement(preview, {}, await HomePage()));
  expect(html).toContain('Private staged copy');
  expect(html).not.toBe(baseline);
  expect(readTextTransaction).toHaveBeenCalledTimes(1);
  expect(readTextTransaction).toHaveBeenCalledWith('staged-text');
  expect(html).toContain('href="/contact"');
  expect(html).toContain('href="/our-work"');
  expect(renderInApp(await HomePage())).toBe(baseline);
});

it('redirects anonymous previews before inspecting draft inputs or reading receipts', async () => {
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
  const unreadable = new Proxy({}, { get: () => { throw new Error('Anonymous preview inspected draft input'); } });
  await expect(PreviewPage({ params: unreadable as never, searchParams: unreadable as never }))
    .rejects.toThrow('REDIRECT:/workbench/login');
  expect(readTextTransaction).not.toHaveBeenCalled();
});

it.each(['consumed', 'committed', 'cancelled'])('rejects %s text receipts at the private preview boundary', async state => {
  jest.mocked(readTextTransaction).mockResolvedValue(receipt(heroKeys[0], state) as never);
  await expect(PreviewPage({
    params: Promise.resolve({}), searchParams: Promise.resolve({ textTransaction: 'staged-text' }),
  })).rejects.toThrow('Text preview is unavailable');
});

it('rejects a receipt whose staging bytes are unavailable', async () => {
  jest.mocked(readTextTransaction).mockResolvedValue(receipt(heroKeys[0], 'prepared', false) as never);
  await expect(PreviewPage({
    params: Promise.resolve({}), searchParams: Promise.resolve({ textTransaction: 'staged-text' }),
  })).rejects.toThrow('Text preview is unavailable');
});
