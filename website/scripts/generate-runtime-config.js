/**
 * Constitutional Runtime Config Generator
 * 
 * Generates runtime configuration files from projection artifacts.
 * 
 * Constitutional Rule: Runtime configuration is derived from projections, never canonical media directly.
 * 
 * Reference: CONSTITUTIONAL_GALLERY_RECONCILIATION_REPORT.md
 * - Section: Replace Runtime Configuration with Projection Artifacts
 */

const fs = require('fs');
const path = require('path');
const { getGalleryConfig, getHeroConfig, getServiceConfig } = require('../src/lib/projection-adapter');

const CONFIG_PATH = path.resolve(__dirname, '../src/config');

function generateGalleryConfig() {
  const projectionConfig = getGalleryConfig();
  
  // Map projection format to legacy runtime format
  const gallery = projectionConfig.gallery.map(item => ({
    filename: item.filename,
    project_id: item.projectId,
    score: 0.7 // Legacy score field, no longer used for ranking
  }));
  
  const config = {
    gallery,
    version: projectionConfig.version,
    generatedAt: projectionConfig.generatedAt,
    generatedHash: projectionConfig.generatedHash,
    provenance: projectionConfig.provenance
  };
  
  const outputPath = path.join(CONFIG_PATH, 'gallery.v1.json');
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  console.log('Generated: gallery.v1.json');
  
  return config;
}

function generateHeroConfig() {
  const projectionConfig = getHeroConfig();
  
  // Map projection format to legacy runtime format
  const config = {
    hero: {
      image_id: projectionConfig.hero.mediaId,
      ranking_score: projectionConfig.hero.score,
      filename: projectionConfig.hero.filename,
      dimensions: {
        width: 0, // Placeholder - will be resolved from canonical graph
        height: 0
      }
    },
    version: projectionConfig.version,
    generatedAt: projectionConfig.generatedAt,
    generatedHash: projectionConfig.generatedHash,
    provenance: projectionConfig.provenance
  };
  
  const outputPath = path.join(CONFIG_PATH, 'hero.v1.json');
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  console.log('Generated: hero.v1.json');
  
  return config;
}

function generateServiceConfig() {
  const projectionConfig = getServiceConfig();
  
  // Map projection format to legacy runtime format
  const config = {
    services: projectionConfig.services,
    version: projectionConfig.version,
    generatedAt: projectionConfig.generatedAt,
    generatedHash: projectionConfig.generatedHash,
    provenance: projectionConfig.provenance
  };
  
  const outputPath = path.join(CONFIG_PATH, 'services.v1.json');
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  console.log('Generated: services.v1.json');
  
  return config;
}

function main() {
  console.log('Constitutional Runtime Config Generator');
  console.log('========================================\n');
  
  console.log('Generating runtime configuration from projection artifacts...\n');
  
  const galleryConfig = generateGalleryConfig();
  const heroConfig = generateHeroConfig();
  const serviceConfig = generateServiceConfig();
  
  console.log('\n✅ Runtime configuration generation complete');
  console.log('\nProvenance:');
  console.log('  Gallery Projection Version:', galleryConfig.version);
  console.log('  Gallery Projection Hash:', galleryConfig.generatedHash);
  console.log('  Hero Projection Version:', heroConfig.version);
  console.log('  Hero Projection Hash:', heroConfig.generatedHash);
  console.log('  Service Projection Version:', serviceConfig.version);
  console.log('  Service Projection Hash:', serviceConfig.generatedHash);
}

if (require.main === module) {
  main();
}

module.exports = { generateGalleryConfig, generateHeroConfig, generateServiceConfig };
