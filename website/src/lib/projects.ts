/**
 * Project Authority - Business Database Adapter
 * 
 * Architecture: Google Drive → Photo Pipeline → Project Authority → Website Presentation
 * 
 * This adapter provides a single interface for the UI to access project data.
 * All project data hangs from projects.v1.json.
 */

import { Project, ProjectsManifest, ProjectService, ProjectStatus } from "@/types/projects";
import { loadAuthority, clearAuthorityCache, queryProjects, findById, findBySlug, filterFeatured, filterHomepageEligible, filterHeroEligible } from "./authority-loader";

// Load the canonical projects manifest using shared AuthorityLoader
export function loadProjectsManifest(): ProjectsManifest {
  return loadAuthority<ProjectsManifest>({
    path: "@/config/projects.v1.json",
    fallback: {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      projects: []
    },
    name: "Projects"
  });
}

/**
 * Get all projects
 */
export function getAllProjects(): Project[] {
  const manifest = loadProjectsManifest();
  return manifest.projects;
}

/**
 * Get project by ID
 */
export function getProjectById(id: string): Project | null {
  const projects = getAllProjects();
  return findById(projects, id);
}

/**
 * Get project by slug (for dynamic routing)
 */
export function getProjectBySlug(slug: string): Project | null {
  const projects = getAllProjects();
  return findBySlug(projects, slug);
}

/**
 * Get projects by service
 */
export function getProjectsByService(service: ProjectService): Project[] {
  return queryProjects(getAllProjects(), { service });
}

/**
 * Get projects by service slug (string version for dynamic lookups)
 */
export function getProjectsByServiceSlug(serviceSlug: string): Project[] {
  return queryProjects(getAllProjects(), { service: serviceSlug });
}

/**
 * Get projects by location
 */
export function getProjectsByCity(city: string): Project[] {
  return queryProjects(getAllProjects(), { city });
}

/**
 * Get projects by county
 */
export function getProjectsByCounty(county: string): Project[] {
  return queryProjects(getAllProjects(), { county });
}

/**
 * Get projects by tag
 */
export function getProjectsByTag(tag: string): Project[] {
  return queryProjects(getAllProjects(), { tag });
}

/**
 * Get featured projects
 */
export function getFeaturedProjects(): Project[] {
  const projects = getAllProjects();
  return filterFeatured(projects);
}

/**
 * Get hero-eligible projects
 */
export function getHeroEligibleProjects(): Project[] {
  const projects = getAllProjects();
  return filterHeroEligible(projects);
}

/**
 * Get homepage-eligible projects
 */
export function getHomepageEligibleProjects(): Project[] {
  const projects = getAllProjects();
  return filterHomepageEligible(projects);
}

/**
 * Get latest projects (sorted by completion date, most recent first)
 */
export function getLatestProjects(limit?: number): Project[] {
  return queryProjects(getAllProjects(), { status: 'completed', limit });
}

/**
 * Get projects by review ID
 */
export function getProjectsByReview(reviewId: string): Project[] {
  return queryProjects(getAllProjects(), { reviewId });
}

/**
 * Get related projects (same service, location, or tags)
 */
export function getRelatedProjects(projectId: string, limit: number = 3): Project[] {
  const targetProject = getProjectById(projectId);
  if (!targetProject) return [];
  
  const allProjects = getAllProjects();
  const related = allProjects.filter(p => {
    if (p.id === projectId) return false;
    
    // Same service
    if (p.service === targetProject.service) return true;
    
    // Same city
    if (p.location.city === targetProject.location.city) return true;
    
    // Shared tags
    const sharedTags = p.tags.filter(tag => 
      targetProject.tags.includes(tag)
    );
    if (sharedTags.length >= 2) return true;
    
    return false;
  });
  
  return related.slice(0, limit);
}

/**
 * Get project statistics
 */
export function getProjectStats() {
  const projects = getAllProjects();
  const total = projects.length;
  const completed = projects.filter(p => p.status === "completed").length;
  const inProgress = projects.filter(p => p.status === "in-progress").length;
  
  // Count by service
  const byService: Record<ProjectService, number> = {
    decks: projects.filter(p => p.service === "decks").length,
    fences: projects.filter(p => p.service === "fences").length,
    kitchens: projects.filter(p => p.service === "kitchens").length,
    bathrooms: projects.filter(p => p.service === "bathrooms").length,
    painting: projects.filter(p => p.service === "painting").length,
    "finish-carpentry": projects.filter(p => p.service === "finish-carpentry").length,
    restoration: projects.filter(p => p.service === "restoration").length,
    "outdoor-living": projects.filter(p => p.service === "outdoor-living").length,
    repairs: projects.filter(p => p.service === "repairs").length,
    "built-ins": projects.filter(p => p.service === "built-ins").length,
    pergolas: projects.filter(p => p.service === "pergolas").length,
    adus: projects.filter(p => p.service === "adus").length,
    "pole-barns": projects.filter(p => p.service === "pole-barns").length,
    other: projects.filter(p => p.service === "other").length,
  };
  
  // Count by location
  const byCity: Record<string, number> = {};
  projects.forEach(p => {
    const city = p.location.city;
    byCity[city] = (byCity[city] || 0) + 1;
  });
  
  return {
    total,
    completed,
    inProgress,
    byService,
    byCity,
  };
}

/**
 * Validate project structure
 */
export function validateProject(project: unknown): project is Project {
  if (!project || typeof project !== 'object') return false;
  
  const p = project as Partial<Project>;
  
  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.service === 'string' &&
    typeof p.status === 'string' &&
    typeof p.location === 'object' &&
    typeof p.location.city === 'string' &&
    typeof p.location.county === 'string' &&
    typeof p.location.state === 'string' &&
    typeof p.media === 'object' &&
    typeof p.media.hero === 'string' &&
    Array.isArray(p.media.gallery) &&
    Array.isArray(p.tags) &&
    Array.isArray(p.reviews)
  );
}

/**
 * Clear cache (useful for testing or hot reload)
 */
export function clearProjectsCache(): void {
  clearAuthorityCache("@/config/projects.v1.json");
}
