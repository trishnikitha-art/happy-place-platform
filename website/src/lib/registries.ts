/**
 * Registry Authority - Data-Driven Configuration
 * 
 * Services, cities, materials, and gallery presets are data-driven.
 * Adding a new service like "ADUs" or "Pole Barns" becomes a data change rather than a code change.
 */

import type { Service, ServicesRegistry, City, CitiesRegistry, Material, MaterialsRegistry, GalleryPreset, GalleryPresetsRegistry } from "@/types/registries";

// Load registries
let servicesCache: ServicesRegistry | null = null;
let citiesCache: CitiesRegistry | null = null;
let materialsCache: MaterialsRegistry | null = null;
let galleryPresetsCache: GalleryPresetsRegistry | null = null;

function loadServices(): ServicesRegistry {
  if (servicesCache) return servicesCache;
  try {
    const data = require("@/config/services.v1.json");
    servicesCache = data as ServicesRegistry;
    return servicesCache;
  } catch (error) {
    console.error("Failed to load services registry:", error);
    return { version: "1.0.0", generatedAt: new Date().toISOString(), services: [] };
  }
}

export function loadServicesRegistry(): ServicesRegistry {
  return loadServices();
}

function loadCities(): CitiesRegistry {
  if (citiesCache) return citiesCache;
  try {
    const data = require("@/config/cities.v1.json");
    citiesCache = data as CitiesRegistry;
    return citiesCache;
  } catch (error) {
    console.error("Failed to load cities registry:", error);
    return { version: "1.0.0", generatedAt: new Date().toISOString(), cities: [] };
  }
}

function loadMaterials(): MaterialsRegistry {
  if (materialsCache) return materialsCache;
  try {
    const data = require("@/config/materials.v1.json");
    materialsCache = data as MaterialsRegistry;
    return materialsCache;
  } catch (error) {
    console.error("Failed to load materials registry:", error);
    return { version: "1.0.0", generatedAt: new Date().toISOString(), materials: [] };
  }
}

function loadGalleryPresets(): GalleryPresetsRegistry {
  if (galleryPresetsCache) return galleryPresetsCache;
  try {
    const data = require("@/config/gallery-presets.v1.json");
    galleryPresetsCache = data as GalleryPresetsRegistry;
    return galleryPresetsCache;
  } catch (error) {
    console.error("Failed to load gallery presets registry:", error);
    return { version: "1.0.0", generatedAt: new Date().toISOString(), presets: [] };
  }
}

/**
 * Get all services
 */
export function getAllServices(): Service[] {
  const registry = loadServices();
  return registry.services.sort((a: Service, b: Service) => a.order - b.order);
}

/**
 * Get service by ID
 */
export function getServiceById(id: string): Service | null {
  const services = getAllServices();
  return services.find((service: Service) => service.id === id) || null;
}

/**
 * Get service by slug
 */
export function getServiceBySlug(slug: string): Service | null {
  const services = getAllServices();
  return services.find((service: Service) => service.slug === slug) || null;
}

/**
 * Get featured services
 */
export function getFeaturedServices(): Service[] {
  const services = getAllServices();
  return services.filter((service: Service) => service.featured);
}

/**
 * Get homepage-eligible services
 */
export function getHomepageEligibleServices(): Service[] {
  const services = getAllServices();
  return services.filter((service: Service) => service.homepageEligible);
}

/**
 * Get all cities
 */
export function getAllCities(): City[] {
  const registry = loadCities();
  return registry.cities.sort((a: City, b: City) => a.order - b.order);
}

/**
 * Get city by ID
 */
export function getCityById(id: string): City | null {
  const cities = getAllCities();
  return cities.find((city: City) => city.id === id) || null;
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
  return cities.filter((city: City) => city.featured);
}

/**
 * Get homepage-eligible cities
 */
export function getHomepageEligibleCities(): City[] {
  const cities = getAllCities();
  return cities.filter((city: City) => city.homepageEligible);
}

/**
 * Get all materials
 */
export function getAllMaterials(): Material[] {
  const registry = loadMaterials();
  return registry.materials.sort((a: Material, b: Material) => a.order - b.order);
}

/**
 * Get material by ID
 */
export function getMaterialById(id: string): Material | null {
  const materials = getAllMaterials();
  return materials.find((material: Material) => material.id === id) || null;
}

/**
 * Get featured materials
 */
export function getFeaturedMaterials(): Material[] {
  const materials = getAllMaterials();
  return materials.filter((material: Material) => material.featured);
}

/**
 * Get all gallery presets
 */
export function getAllGalleryPresets(): GalleryPreset[] {
  const registry = loadGalleryPresets();
  return registry.presets.sort((a: GalleryPreset, b: GalleryPreset) => a.order - b.order);
}

/**
 * Get gallery preset by ID
 */
export function getGalleryPresetById(id: string): GalleryPreset | null {
  const presets = getAllGalleryPresets();
  return presets.find((preset: GalleryPreset) => preset.id === id) || null;
}

/**
 * Get featured gallery presets
 */
export function getFeaturedGalleryPresets(): GalleryPreset[] {
  const presets = getAllGalleryPresets();
  return presets.filter((preset: GalleryPreset) => preset.featured);
}

/**
 * Clear cache (useful for testing or hot reload)
 */
export function clearRegistriesCache(): void {
  servicesCache = null;
  citiesCache = null;
  materialsCache = null;
  galleryPresetsCache = null;
}
