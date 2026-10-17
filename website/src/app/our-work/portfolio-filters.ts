import type { Project } from '@/types/projects';

export interface PortfolioFilters { service: string; city: string }
export const allPortfolioFilters: PortfolioFilters = { service: 'all', city: 'all' };

/** Filters are a view of the approved project order, never a new ordering authority. */
export function filterPortfolio(projects: readonly Project[], filters: PortfolioFilters): Project[] {
  return projects.filter(project => (filters.service === 'all' || project.service === filters.service)
    && (filters.city === 'all' || project.location.city === filters.city));
}

export function readPortfolioFilters(search: string, projects: readonly Project[]): PortfolioFilters {
  const query = new URLSearchParams(search);
  const service = query.get('service');
  const city = query.get('city');
  return {
    service: service && projects.some(project => project.service === service) ? service : 'all',
    city: city && projects.some(project => project.location.city === city) ? city : 'all',
  };
}
