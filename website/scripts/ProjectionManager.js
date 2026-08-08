/**
 * Constitutional Projection Manager
 * 
 * Single orchestration layer for all projection operations.
 * 
 * Constitutional Rule: Search before create.
 * - If projection exists and passes verification, reuse it
 * - Only generate if missing or verification fails
 * 
 * Reference: CONSTITUTIONAL_GALLERY_RECONCILIATION_REPORT.md
 * - Section: Projection Invariants
 * - Section: Projection Generator as Derived Artifact Authority
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { generateGalleryProjection, generateHeroProjection, generateServiceProjection } = require('./projection-generator/index.js');
const { verifyGalleryProjection, verifyHeroProjection, verifyServiceProjection } = require('./constitutional-verification.js');

const METADATA_PATH = path.resolve(__dirname, '../metadata');
const PROJECTION_PATH = path.join(METADATA_PATH, 'projection');

function projectionExists(projectionName) {
  return fs.existsSync(path.join(PROJECTION_PATH, projectionName));
}

function loadProjection(projectionName) {
  const content = fs.readFileSync(path.join(PROJECTION_PATH, projectionName), 'utf-8');
  return JSON.parse(content);
}

function loadCanonicalGraph() {
  const content = fs.readFileSync(path.join(METADATA_PATH, 'canonical-media-graph.json'), 'utf-8');
  return JSON.parse(content);
}

function loadScoringArtifact(scoringName) {
  const content = fs.readFileSync(path.join(METADATA_PATH, 'projection/scoring', scoringName), 'utf-8');
  return JSON.parse(content);
}

function loadProjectsManifest() {
  const content = fs.readFileSync(path.join(METADATA_PATH, '../src/config/projects.v1.json'), 'utf-8');
  return JSON.parse(content);
}

function saveProjection(projectionName, projection) {
  fs.writeFileSync(
    path.join(PROJECTION_PATH, projectionName),
    JSON.stringify(projection, null, 2)
  );
}

/**
 * Ensure Gallery Projection exists and is valid
 * Constitutional: Search before create
 */
function ensureGalleryProjection() {
  const projectionName = 'galleryProjection.json';
  
  // Check if projection exists
  if (projectionExists(projectionName)) {
    console.log('  Gallery projection exists, verifying...');
    
    const projection = loadProjection(projectionName);
    const canonicalGraph = loadCanonicalGraph();
    const verification = verifyGalleryProjection(projection, canonicalGraph);
    
    if (verification.valid) {
      console.log('  ✅ Gallery projection valid, reusing');
      return projection;
    } else {
      console.log('  ❌ Gallery projection invalid, regenerating');
      verification.errors.forEach(error => console.log(`     - ${error}`));
    }
  } else {
    console.log('  Gallery projection missing, generating...');
  }
  
  // Generate new projection
  const canonicalGraph = loadCanonicalGraph();
  const scoring = loadScoringArtifact('gallery.scoring.v1.json');
  const projectsManifest = loadProjectsManifest();
  const projection = generateGalleryProjection(canonicalGraph, scoring, projectsManifest);
  saveProjection(projectionName, projection);
  console.log('  ✅ Gallery projection generated');
  
  return projection;
}

/**
 * Ensure Hero Projection exists and is valid
 * Constitutional: Search before create
 */
function ensureHeroProjection() {
  const projectionName = 'heroProjection.json';
  
  // Check if projection exists
  if (projectionExists(projectionName)) {
    console.log('  Hero projection exists, verifying...');
    
    const projection = loadProjection(projectionName);
    const canonicalGraph = loadCanonicalGraph();
    const verification = verifyHeroProjection(projection, canonicalGraph);
    
    if (verification.valid) {
      console.log('  ✅ Hero projection valid, reusing');
      return projection;
    } else {
      console.log('  ❌ Hero projection invalid, regenerating');
      verification.errors.forEach(error => console.log(`     - ${error}`));
    }
  } else {
    console.log('  Hero projection missing, generating...');
  }
  
  // Generate new projection
  const canonicalGraph = loadCanonicalGraph();
  const scoring = loadScoringArtifact('hero.scoring.v1.json');
  const projection = generateHeroProjection(canonicalGraph, scoring);
  saveProjection(projectionName, projection);
  console.log('  ✅ Hero projection generated');
  
  return projection;
}

/**
 * Ensure Service Projection exists and is valid
 * Constitutional: Search before create
 */
function ensureServiceProjection() {
  const projectionName = 'serviceProjection.json';
  
  // Check if projection exists
  if (projectionExists(projectionName)) {
    console.log('  Service projection exists, verifying...');
    
    const projection = loadProjection(projectionName);
    const canonicalGraph = loadCanonicalGraph();
    const verification = verifyServiceProjection(projection, canonicalGraph);
    
    if (verification.valid) {
      console.log('  ✅ Service projection valid, reusing');
      return projection;
    } else {
      console.log('  ❌ Service projection invalid, regenerating');
      verification.errors.forEach(error => console.log(`     - ${error}`));
    }
  } else {
    console.log('  Service projection missing, generating...');
  }
  
  // Generate new projection
  const canonicalGraph = loadCanonicalGraph();
  const scoring = loadScoringArtifact('service.scoring.v1.json');
  const projection = generateServiceProjection(canonicalGraph, scoring);
  saveProjection(projectionName, projection);
  console.log('  ✅ Service projection generated');
  
  return projection;
}

/**
 * Ensure all projections exist and are valid
 * Constitutional: Search before create for all projections
 */
function ensureAllProjections() {
  console.log('Ensuring all projections...');
  console.log('============================\n');
  
  const galleryProjection = ensureGalleryProjection();
  const heroProjection = ensureHeroProjection();
  const serviceProjection = ensureServiceProjection();
  
  console.log('\n✅ All projections ensured');
  
  return {
    gallery: galleryProjection,
    hero: heroProjection,
    service: serviceProjection
  };
}

/**
 * Force regenerate all projections
 * Constitutional: Only use when explicitly requested (e.g., canonical graph changed)
 */
function forceRegenerateAllProjections() {
  console.log('Force regenerating all projections...');
  console.log('====================================\n');
  
  const canonicalGraph = loadCanonicalGraph();
  const projectsManifest = loadProjectsManifest();
  
  const galleryScoring = loadScoringArtifact('gallery.scoring.v1.json');
  const heroScoring = loadScoringArtifact('hero.scoring.v1.json');
  const serviceScoring = loadScoringArtifact('service.scoring.v1.json');
  
  const galleryProjection = generateGalleryProjection(canonicalGraph, galleryScoring, projectsManifest);
  saveProjection('galleryProjection.json', galleryProjection);
  console.log('  ✅ Gallery projection regenerated');
  
  const heroProjection = generateHeroProjection(canonicalGraph, heroScoring);
  saveProjection('heroProjection.json', heroProjection);
  console.log('  ✅ Hero projection regenerated');
  
  const serviceProjection = generateServiceProjection(canonicalGraph, serviceScoring);
  saveProjection('serviceProjection.json', serviceProjection);
  console.log('  ✅ Service projection regenerated');
  
  console.log('\n✅ All projections force regenerated');
  
  return {
    gallery: galleryProjection,
    hero: heroProjection,
    service: serviceProjection
  };
}

module.exports = {
  ensureGalleryProjection,
  ensureHeroProjection,
  ensureServiceProjection,
  ensureAllProjections,
  forceRegenerateAllProjections,
  projectionExists,
  loadProjection
};
