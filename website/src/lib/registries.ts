/**
 * Registry Authority - Data-Driven Configuration
 * 
 * Services, cities, materials, and gallery presets are data-driven.
 * Adding a new service like "ADUs" or "Pole Barns" becomes a data change rather than a code change.
 */

import type { Service, ServicesRegistry, City, CitiesRegistry, Material, MaterialsRegistry, GalleryPreset, GalleryPresetsRegistry } from "@/types/registries";
import { loadAuthority, clearAuthorityCache, sortByOrder, findById, findBySlug, filterFeatured, filterHomepageEligible } from "./authority-loader";

// Load registries using shared AuthorityLoader
export function loadServicesRegistry(): ServicesRegistry {
  return loadAuthority<ServicesRegistry>({
    path: "@/config/services.v1.json",
    fallback: { version: "1.0.0", generatedAt: new Date().toISOString(), services: [] },
    name: "Services"
  });
}

export function loadCitiesRegistry(): CitiesRegistry {
  return loadAuthority<CitiesRegistry>({
    path: "@/config/cities.v1.json",
    fallback: { version: "1.0.0", generatedAt: new Date().toISOString(), cities: [] },
    name: "Cities"
  });
}

export function loadMaterialsRegistry(): MaterialsRegistry {
  return loadAuthority<MaterialsRegistry>({
    path: "@/config/materials.v1.json",
    fallback: { version: "1.0.0", generatedAt: new Date().toISOString(), materials: [] },
    name: "Materials"
  });
}

export function loadGalleryPresetsRegistry(): GalleryPresetsRegistry {
  return loadAuthority<GalleryPresetsRegistry>({
    path: "@/config/gallery-presets.v1.json",
    fallback: { version: "1.0.0", generatedAt: new Date().toISOString(), presets: [] },
    name: "Gallery Presets"
  });
}

/**
 * Get all services
 */
export function getAllServices(): Service[] {
  const registry = loadServicesRegistry();
  return sortByOrder(registry.services);
}

/**
 * Get service by ID
 */
export function getServiceById(id: string): Service | null {
  const services = getAllServices();
  return findById(services, id);
}

/**
 * Get service by slug
 */
export function getServiceBySlug(slug: string): Service | null {
  const services = getAllServices();
  return findBySlug(services, slug);
}

/**
 * Get featured services
 */
export function getFeaturedServices(): Service[] {
  const services = getAllServices();
  return filterFeatured(services);
}

/**
 * Get homepage-eligible services
 */
export function getHomepageEligibleServices(): Service[] {
  const services = getAllServices();
  return filterHomepageEligible(services);
}

/**
 * Get all cities
 */
export function getAllCities(): City[] {
  const registry = loadCitiesRegistry();
  return sortByOrder(registry.cities);
}

/**
 * Get city by ID
 */
export function getCityById(id: string): City | null {
  const cities = getAllCities();
  return findById(cities, id);
}

/**
 * Get cities by county
 */
export function getCitiesByCounty(county: string): City[] {
  const cities = getAllCities();
  return cities.filter((city: City) => city.county === county);
}

/**
 * Get featured cities
 */
export function getFeaturedCities(): City[] {
  const cities = getAllCities();
  return filterFeatured(cities);
}

/**
 * Get homepage-eligible cities
 */
export function getHomepageEligibleCities(): City[] {
  const cities = getAllCities();
  return filterHomepageEligible(cities);
}

/**
 * Get all materials
 */
export function getAllMaterials(): Material[] {
  const registry = loadMaterialsRegistry();
  return sortByOrder(registry.materials);
}

/**
 * Get material by ID
 */
export function getMaterialById(id: string): Material | null {
  const materials = getAllMaterials();
  return findById(materials, id);
}

/**
 * Get featured materials
 */
export function getFeaturedMaterials(): Material[] {
  const materials = getAllMaterials();
  return filterFeatured(materials);
}

/**
 * Get all gallery presets
 */
export function getAllGalleryPresets(): GalleryPreset[] {
  const registry = loadGalleryPresetsRegistry();
  return sortByOrder(registry.presets);
}

/**
 * Get gallery preset by ID
 */
export function getGalleryPresetById(id: string): GalleryPreset | null {
  const presets = getAllGalleryPresets();
  return findById(presets, id);
}

/**
 * Get featured gallery presets
 */
export function getFeaturedGalleryPresets(): GalleryPreset[] {
  const presets = getAllGalleryPresets();
  return filterFeatured(presets);
}

/**
 * Clear cache (useful for testing or hot reload)
 */
export function clearRegistriesCache(): void {
  clearAuthorityCache("@/config/services.v1.json");
  clearAuthorityCache("@/config/cities.v1.json");
  clearAuthorityCache("@/config/materials.v1.json");
  clearAuthorityCache("@/config/gallery-presets.v1.json");
}
