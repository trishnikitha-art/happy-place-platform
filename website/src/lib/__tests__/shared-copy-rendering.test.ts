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
import { MotionProvider } from '@/components/motion-provider';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

function render(Component: typeof ReviewPage | typeof NewsletterSignup | typeof SiteFooter | typeof ContactPage, key?: TextKey, value = 'Updated homeowner copy') {
  return renderToStaticMarkup(createElement(MotionProvider, { children: createElement(TextPreviewProvider, {
    draft: key ? { key, value } : null,
    children: createElement(Component),
  }) }));
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

  it('edits newsletter labels and placeholders while retaining the native input as the publishing verification anchor', () => {
    const baseline = render(NewsletterSignup);
    const changed = render(NewsletterSignup, 'newsletter.emailPlaceholder', 'Your email');
    expect(changed).toBe(baseline.replace('>Email address</span>', '>Your email</span>').replace('placeholder="Email address"', 'placeholder="Your email"'));
    expect(changed).toMatch(/<input[^>]*type="email"[^>]*data-text-key="newsletter.emailPlaceholder"[^>]*data-text-attribute="placeholder"[^>]*required=""/);
    const anchors = Array.from(changed.matchAll(/<[^>]+data-text-key="newsletter.emailPlaceholder"[^>]*>/g), match => match[0]);
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toMatch(/^<input\b[^>]*placeholder="Your email"[^>]*data-text-attribute="placeholder"/);
    expect(anchors[1]).toBe('<span data-text-key="newsletter.emailPlaceholder">');
    expect(EDITABLE_SHARED_FIELDS['newsletter.emailPlaceholder'].attribute).toBe('placeholder');
    expect(changed).not.toContain('data-text-key="newsletter.submitting"');
  });

  it('associates persistent newsletter labels with named autofill controls before hydration', () => {
    const html = render(NewsletterSignup);
    for (const [name, type, autoComplete, key, label] of [
      ['email', 'email', 'email', 'newsletter.emailPlaceholder', catalog.fields['newsletter.emailPlaceholder'].value],
      ['firstName', 'text', 'given-name', 'newsletter.namePlaceholder', catalog.fields['newsletter.namePlaceholder'].value],
    ]) {
      const input = html.match(new RegExp(`<input id="([^"]+)" name="${name}" type="${type}" autoComplete="${autoComplete}"`, 'i'));
      expect(input).not.toBeNull();
      expect(html).toMatch(new RegExp(`<label for="${input![1]}"[^>]*><span data-text-key="${key}">${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</span></label>`));
    }
  });
});
