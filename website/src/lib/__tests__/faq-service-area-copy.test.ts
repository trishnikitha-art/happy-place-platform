import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import catalog from '@/config/strings.v1.json';
import { TextCopy, TextPreviewProvider } from '@/components/text-copy';
import { getCompany } from '@/lib/company';
import { getFaqById, formatServiceCounties, resolveServiceAreaCopy } from '@/lib/faq';
import { decodeTextCatalog, validateText } from '@/lib/text-contract';

const SERVICE_AREA_KEY = 'faq.f2.answer' as const;
const countiesToken = '{{serviceCounties}}';

it('resolves the service-area token from the canonical company counties only for FAQ f2', () => {
  const copy = decodeTextCatalog(catalog);
  const canonicalValue = copy.fields[SERVICE_AREA_KEY].value;
  const expected = canonicalValue.replace(countiesToken, formatServiceCounties(getCompany().proof.serviceCounties));

  expect(getFaqById('f2')?.answer).toBe(expected);
  expect(resolveServiceAreaCopy(copy.fields['faq.f1.answer'].value)).toBe(copy.fields['faq.f1.answer'].value);
});

it('allows the exact service-counties token only on FAQ f2', () => {
  expect(() => validateText(SERVICE_AREA_KEY, `We work across ${countiesToken}.`)).not.toThrow();
  expect(() => validateText('faq.f1.answer', `We work across ${countiesToken}.`)).toThrow();
  expect(() => validateText(SERVICE_AREA_KEY, 'We work across {{serviceTown}}.')).toThrow();
  expect(() => validateText(SERVICE_AREA_KEY, 'We work across {{serviceCounties}.')).toThrow();
  expect(() => validateText(SERVICE_AREA_KEY, `We work across ${countiesToken}}.`)).toThrow();
  expect(() => validateText(SERVICE_AREA_KEY, `We work across ${countiesToken} and ${countiesToken}.`)).toThrow();
});

it('keeps plain owner copy intact and resolves a staged preview through the same FAQ adapter', () => {
  const copy = decodeTextCatalog(catalog);
  const field = copy.fields[SERVICE_AREA_KEY];
  const original = field.value;
  const ownerOverride = 'Call us to confirm service in your neighborhood.';
  const previewValue = `We work throughout ${countiesToken}.`;
  const resolvedPreview = resolveServiceAreaCopy(previewValue);

  try {
    field.value = ownerOverride;
    validateText(SERVICE_AREA_KEY, ownerOverride);
    expect(getFaqById('f2')?.answer).toBe(ownerOverride);
    expect(renderToStaticMarkup(React.createElement(TextCopy, { textKey: SERVICE_AREA_KEY }))).toContain(ownerOverride);

    const preview = React.createElement(
      TextPreviewProvider,
      { draft: { key: SERVICE_AREA_KEY, value: previewValue } },
      React.createElement(TextCopy, { textKey: SERVICE_AREA_KEY }),
    );
    expect(renderToStaticMarkup(preview)).toContain(resolvedPreview);
  } finally {
    field.value = original;
  }
});
