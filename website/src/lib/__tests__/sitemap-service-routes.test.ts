/**
 * Regression test for P1 fix: Service route sitemap generation
 *
 * This test verifies that:
 * 1. Sitemap includes entries for all active, non-archived services
 * 2. Sitemap excludes archived services
 * 3. Each service has exactly one canonical sitemap entry
 * 4. Service entries carry changeFrequency 'monthly' and priority 0.7
 * 5. Service entries carry NO lastModified (the Service type has no
 *    updatedAt field, so a timestamp must not be fabricated)
 * 6. Sitemap uses the same registry as public service listing
 *
 * This suite lives under src/lib/__tests__/ so the Jest testMatch in
 * jest.config.ts discovers it. It invokes the real sitemap() default
 * export from the App Router route, not a reimplemented mapping.
 */

import sitemap from '../../app/sitemap';
import { getNonArchivedServices } from '@/lib/registries';

describe('Sitemap Service Routes', () => {
  const siteUrl = 'https://happyplacecarpentry.com';

  // Service entries are the per-service routes only: the bare
  // `${siteUrl}/services` index entry is a static route, not a service.
  const serviceEntriesOf = (entries: ReturnType<typeof sitemap>) =>
    entries.filter(
      (entry) =>
        entry.url.startsWith(`${siteUrl}/services/`) &&
        entry.url !== `${siteUrl}/services`,
    );

  it('includes every non-archived service exactly once', () => {
    const services = getNonArchivedServices();
    const serviceEntries = serviceEntriesOf(sitemap());

    expect(serviceEntries.length).toBe(services.length);

    services.forEach((service) => {
      const matches = serviceEntries.filter(
        (entry) => entry.url === `${siteUrl}/services/${service.slug}`,
      );
      expect(matches.length).toBe(1);
    });

    // The entry URL set is exactly the registry URL set: an archived
    // (or otherwise non-public) service appearing in the sitemap, or a
    // registry service missing from it, breaks this equality.
    expect(new Set(serviceEntries.map((entry) => entry.url))).toEqual(
      new Set(services.map((service) => `${siteUrl}/services/${service.slug}`)),
    );
  });

  it('excludes archived services via the registry result', () => {
    const services = getNonArchivedServices();

    // The registry result that the sitemap is built from must contain
    // no archived, hidden, or non-published service.
    services.forEach((service) => {
      expect(service.archived).not.toBe(true);
      expect(service.hidden).not.toBe(true);
      expect(
        service.publicationState === undefined ||
          service.publicationState === 'published',
      ).toBe(true);
    });
  });

  it('sets monthly changeFrequency and 0.7 priority on service entries', () => {
    const serviceEntries = serviceEntriesOf(sitemap());

    expect(serviceEntries.length).toBeGreaterThan(0);
    serviceEntries.forEach((entry) => {
      expect(entry.changeFrequency).toBe('monthly');
      expect(entry.priority).toBe(0.7);
    });
  });

  it('omits lastModified on service entries', () => {
    const serviceEntries = serviceEntriesOf(sitemap());

    expect(serviceEntries.length).toBeGreaterThan(0);
    serviceEntries.forEach((entry) => {
      expect('lastModified' in entry).toBe(false);
      expect(entry).not.toHaveProperty('lastModified');
    });
  });
});
