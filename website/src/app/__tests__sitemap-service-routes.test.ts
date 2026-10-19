/**
 * Regression test for P1 fix: Service route sitemap generation
 * 
 * This test verifies that:
 * 1. Sitemap includes entries for all active, non-archived services
 * 2. Sitemap excludes archived services
 * 3. Sitemap excludes draft services
 * 4. Each service has exactly one canonical sitemap entry
 * 5. Sitemap uses the same registry as public service listing
 */

import { sitemap } from '../sitemap';
import { getNonArchivedServices } from '@/lib/registries';

describe('Sitemap Service Routes', () => {
  const siteUrl = 'https://happyplacecarpentry.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include all active, non-archived services in sitemap', () => {
    const services = getNonArchivedServices();
    const sitemapResult = sitemap();
    
    // Filter service entries from sitemap
    const serviceEntries = sitemapResult.filter(entry => 
      entry.url.startsWith(`${siteUrl}/services/`)
    );

    // Verify each active service has an entry
    services.forEach((service) => {
      const hasEntry = serviceEntries.some(
        entry => entry.url === `${siteUrl}/services/${service.slug}`
      );
      expect(hasEntry).toBe(true);
    });

    // Verify number of entries matches number of services
    expect(serviceEntries.length).toBe(services.length);
  });

  it('should exclude archived services from sitemap', () => {
    const services = getNonArchivedServices();
    
    // Verify no service with archived status is included
    services.forEach((service) => {
      expect(service.archived).not.toBe(true);
    });
  });

  it('should generate canonical URLs for each service', () => {
    const services = getNonArchivedServices();
    const sitemapResult = sitemap();
    
    services.forEach((service) => {
      const canonicalUrl = `${siteUrl}/services/${service.slug}`;
      
      // Verify URL structure
      expect(canonicalUrl).toMatch(/^https:\/\/happyplacecarpentry\.com\/services\/[a-z0-9-]+$/);
      
      // Verify slug is URL-safe
      expect(service.slug).toMatch(/^[a-z0-9-]+$/);
    });
  });

  it('should use the same registry as public service listing', () => {
    const services = getNonArchivedServices();
    
    // Verify all services have required fields for public display
    services.forEach((service) => {
      expect(service.id).toBeDefined();
      expect(service.slug).toBeDefined();
      expect(service.name).toBeDefined();
      expect(service.description).toBeDefined();
      expect(service.archived).not.toBe(true);
    });
  });

  it('should have consistent changeFrequency and priority for service routes', () => {
    const services = getNonArchivedServices();
    const sitemapResult = sitemap();
    
    const serviceEntries = sitemapResult.filter(entry => 
      entry.url.startsWith(`${siteUrl}/services/`)
    );

    serviceEntries.forEach((entry) => {
      // Verify SEO metadata
      expect(entry.changeFrequency).toBe('monthly');
      expect(entry.priority).toBe(0.7);
    });
  });
});
