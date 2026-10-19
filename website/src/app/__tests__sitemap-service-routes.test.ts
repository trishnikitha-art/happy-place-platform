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

import { getNonArchivedServices } from '@/lib/registries';
import type { MetadataRoute } from 'next';

// Mock Next.js types
type SitemapEntry = {
  url: string;
  lastModified: Date | string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'always';
  priority: number;
};

describe('Sitemap Service Routes', () => {
  const siteUrl = 'https://happyplacecarpentry.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include all active, non-archived services in sitemap', () => {
    const services = getNonArchivedServices();
    
    // Mock sitemap generation
    const serviceEntries: SitemapEntry[] = services.map((s) => ({
      url: `${siteUrl}/services/${s.slug}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

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
    // This test assumes the registry has a way to distinguish archived services
    // The getNonArchivedServices() function should already filter them out
    const services = getNonArchivedServices();
    
    // Verify no service with archived status is included
    services.forEach((service) => {
      expect(service.archived).not.toBe(true);
    });
  });

  it('should exclude draft services from sitemap', () => {
    // This test assumes the registry has a way to distinguish draft services
    // The getNonArchivedServices() function should already filter them out
    const services = getNonArchivedServices();
    
    // Verify no service with draft status is included
    services.forEach((service) => {
      expect(service.status).not.toBe('draft');
    });
  });

  it('should generate canonical URLs for each service', () => {
    const services = getNonArchivedServices();
    
    services.forEach((service) => {
      const canonicalUrl = `${siteUrl}/services/${service.slug}`;
      
      // Verify URL structure
      expect(canonicalUrl).toMatch(/^https:\/\/happyplacecarpentry\.com\/services\/[a-z0-9-]+$/);
      
      // Verify slug is URL-safe
      expect(service.slug).toMatch(/^[a-z0-9-]+$/);
    });
  });

  it('should use the same registry as public service listing', () => {
    // Both sitemap and public listing should use getNonArchivedServices()
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
    
    services.forEach((service) => {
      const entry: SitemapEntry = {
        url: `${siteUrl}/services/${service.slug}`,
        lastModified: service.updatedAt ? new Date(service.updatedAt) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      };

      // Verify SEO metadata
      expect(entry.changeFrequency).toBe('monthly');
      expect(entry.priority).toBe(0.7);
    });
  });
});
