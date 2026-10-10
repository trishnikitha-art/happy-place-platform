import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReviewPage from '@/app/review/page';
import { NewsletterSignup } from '@/components/newsletter-signup';
import { TextPreviewProvider } from '@/components/text-copy';
import { EDITABLE_SHARED_FIELDS, navigationTextKey } from '@/lib/editable-shared-fields';
import { getNavigation } from '@/lib/navigation';
import { decodeTextCatalog, type TextKey } from '@/lib/text-contract';
import catalog from '@/config/strings.v1.json';
import navigation from '@/config/navigation.v1.json';
import { SiteFooter } from '@/components/site-footer';
import ContactPage from '@/app/contact/page';
import { getCompany } from '@/lib/company';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

function render(Component: typeof ReviewPage | typeof NewsletterSignup | typeof SiteFooter | typeof ContactPage, key?: TextKey, value = 'Updated homeowner copy') {
  return renderToStaticMarkup(createElement(TextPreviewProvider, {
    draft: key ? { key, value } : null,
    children: createElement(Component),
  }));
}

describe('Shared public copy preserves content contracts and design', () => {
  it('resolves every shared field through the same validated text authority', () => {
    const text = decodeTextCatalog(catalog);
    expect(Object.keys(EDITABLE_SHARED_FIELDS)).toHaveLength(54);
    for (const key of Object.keys(EDITABLE_SHARED_FIELDS) as TextKey[]) {
      expect(text.fields[key]).toEqual({ value: expect.any(String), revision: expect.any(Number) });
    }
  });

  it.each(['company.serviceArea', 'company.businessHours'] as const)('edits %s in the existing footer field while retaining all styles and contact links', key => {
    for (const Component of [SiteFooter, ContactPage]) {
      const baseline = render(Component);
      const changed = render(Component, key, 'Updated operating information');
      expect(changed).toBe(baseline.replace(catalog.fields[key].value, 'Updated operating information'));
    }
    const company = getCompany();
    expect(company[key === 'company.serviceArea' ? 'serviceArea' : 'businessHours']).toBe(catalog.fields[key].value);
  });

  it('keeps all navigation destinations, ordering and secondary flags while deriving copy from text authority', () => {
    const actual = getNavigation();
    expect(actual.map(({ href, secondary }) => ({ href, secondary })))
      .toEqual(navigation.navigation.map((item) => ({ href: item.href, secondary: 'secondary' in item ? item.secondary : undefined })));
    const text = decodeTextCatalog(catalog);
    for (const item of actual) expect(item.label).toBe(text.fields[navigationTextKey(item.href)!].value);
    expect(navigationTextKey('/unknown-path')).toBeUndefined();
  });

  it('keeps review option submitted values and native text-only option markup when editing a label', () => {
    const baseline = render(ReviewPage);
    const changed = render(ReviewPage, 'review.serviceOption.deck', 'Covered deck');
    const optionValues = (html: string) => Array.from(html.matchAll(/<option[^>]* value="([^"]*)"/g), (m) => m[1]);
    expect(optionValues(changed)).toEqual(['', 'deck', 'pergola', 'fence', 'painting', 'bathroom', 'kitchen', 'carpentry', 'other']);
    expect(changed).toBe(baseline.replace('>Deck</option>', '>Covered deck</option>'));
    expect(changed).not.toMatch(/<option[^>]*><span/);
  });

  it('edits a review label without changing heading semantics, font classes or any form control', () => {
    const baseline = render(ReviewPage);
    const changed = render(ReviewPage, 'review.title');
    expect(changed).toBe(baseline.replace('Tell us about your project', 'Updated homeowner copy'));
    expect(changed).toContain('<h1 class="font-display text-4xl font-bold text-text-on-dark md:text-5xl">');
    expect(changed).toContain('id="name" required=""');
    expect(changed).toContain('id="service" required=""');
    expect(changed).toContain('id="body" required="" rows="6"');
    expect(changed).not.toContain('data-text-key="review.success.title"');
  });

  it('edits newsletter placeholders in the original native input while retaining submission requirements and typography', () => {
    const baseline = render(NewsletterSignup);
    const changed = render(NewsletterSignup, 'newsletter.emailPlaceholder', 'Your email');
    expect(changed).toBe(baseline.replace('placeholder="Email address"', 'placeholder="Your email"'));
    expect(changed).toMatch(/<input type="email"[^>]*data-text-key="newsletter.emailPlaceholder"[^>]*data-text-attribute="placeholder"[^>]*required=""/);
    expect(EDITABLE_SHARED_FIELDS['newsletter.emailPlaceholder'].attribute).toBe('placeholder');
    expect(changed).not.toContain('data-text-key="newsletter.submitting"');
  });
});
