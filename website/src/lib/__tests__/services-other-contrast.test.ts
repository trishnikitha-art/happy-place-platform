import { renderToStaticMarkup } from 'react-dom/server';
import ServicesPage from '@/app/services/page';
import catalog from '@/config/strings.v1.json';

jest.mock('@/lib/registries', () => ({
  getNonArchivedServices: () => [{
    id: 'synthetic-service', slug: 'synthetic-service',
    name: 'Synthetic service', description: 'Isolated presentation fixture', icon: 'hammer',
  }],
}));
jest.mock('@/lib/assignment-store', () => ({ getServiceCardAssignment: jest.fn(async () => null) }));
jest.mock('@/lib/media', () => ({ resolvePublicMedia: jest.fn(async () => null) }));

function otherServicesPanel(markup: string): string {
  // Scope the assertion to the existing rounded panel, not the dark hero,
  // service cards, following contact link or separate call-to-action section.
  const panel = markup.match(/<div class="mt-16 [^"]*">[\s\S]*?<\/div><\/div>(?=<div class="mt-12">)/)?.[0];
  expect(panel).toBeDefined();
  return panel!;
}

describe('Services additional-projects panel semantic contrast', () => {
  let markup: string;
  let panel: string;

  beforeAll(async () => {
    markup = renderToStaticMarkup(await ServicesPage());
    panel = otherServicesPanel(markup);
  });

  it('pairs its explicit dark surface with the existing semantic light foreground', () => {
    expect(panel).toMatch(/^<div class="mt-16 rounded-2xl border border-border-soft bg-deep p-8 text-text-on-dark">/);
    expect(panel).not.toContain('bg-linen');
    expect(panel).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl|oklch|lab|lch)\(/i);
    expect(panel).not.toMatch(/style="[^"]*\b(?:color|background)(?:-color)?:/);
  });

  it('lets the heading, description, all eight services and seven separators inherit that foreground', () => {
    expect(panel).toContain('<h3 class="text-xl font-bold"');
    expect(panel).toContain('<p class="mt-3 text-base"');
    expect(panel).toContain('<div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">');
    expect(panel.match(/<span>·<\/span>/g)).toHaveLength(7);

    const descendantClasses = [...panel.replace(/^<div[^>]*>/, '').matchAll(/\bclass="([^"]*)"/g)]
      .flatMap(match => match[1].split(/\s+/));
    // Font-size utilities are not foreground overrides. Everything else,
    // including editable TextCopy spans, must inherit the panel's color.
    expect(descendantClasses.filter(value => value.startsWith('text-')))
      .toEqual(['text-xl', 'text-base', 'text-sm']);

    const serviceKeys = Array.from({ length: 8 }, (_, index) => `services.copy.${index + 2}` as keyof typeof catalog.fields);
    for (const key of ['services.other.title', 'services.other.description', ...serviceKeys] as const) {
      expect(panel).toContain(`data-text-key="${key}"`);
      const escapedValue = catalog.fields[key].value.replaceAll('&', '&amp;').replaceAll("'", '&#x27;');
      expect(panel).toContain(escapedValue);
    }
    expect([...panel.matchAll(/data-text-key="services\.copy\.\d+"/g)]).toHaveLength(8);
  });

  it('keeps surrounding section boundaries and their existing content and styles', () => {
    expect(panel).not.toContain('data-service-grid');
    expect(panel).not.toContain('services.copy.10');
    expect(panel).not.toContain('cta.title');
    expect(markup).toContain('data-service-grid="true"');
    expect(markup).toMatch(/<h3 class="[^"]*\btext-text"[^>]*>/);
    expect(markup).toContain('Synthetic service');
    expect(markup).toContain('<div class="mt-12"><a class="inline-flex items-center gap-1 text-base font-semibold text-text-on-dark hover:text-honey hover:underline" href="/contact">');
    expect(markup).toContain('data-text-key="cta.title"');
  });
});
