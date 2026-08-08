#!/usr/bin/env node

/**
 * Constitutional Projection Generator
 * 
 * Input:
 * - Canonical Media Graph (immutable evidence)
 * - Scoring Artifact (versioned constitutional artifact)
 * - Generator Version
 * 
 * Output:
 * - Projection Artifacts with complete provenance
 *   - projectionVersion
 *   - scoringVersion
 *   - canonicalGraphVersion
 *   - generatorVersion
 *   - generatedHash
 *   - generatedAt
 */

const fs = require('fs');
const path = require('path');
const { calculateObjectHash } = require('../hash-authority.js');

const GENERATOR_VERSION = '1.0.0';

function loadCanonicalGraph(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const graph = JSON.parse(content);
  return graph;
}

function loadScoringArtifact(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function loadProjectsManifest(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const manifest = JSON.parse(content);
  return manifest;
}

function calculateImageScore(image, scoring) {
  let score = 0;
  
  for (const [factorName, factorConfig] of Object.entries(scoring.factors)) {
    const weight = factorConfig.weight;
    let factorScore = 0;
    
    switch (factorName) {
      case 'composition':
        factorScore = image.data.composition_score || 0.5;
        break;
      case 'sharpness':
        factorScore = image.data.sharpness_score || 0.5;
        break;
      case 'brightness':
        factorScore = image.data.brightness_score || 0.5;
        break;
      case 'resolution':
        const resolution = (image.data.width || 0) * (image.data.height || 0);
        factorScore = Math.min(resolution / (4000 * 3000), 1.0);
        break;
      case 'visibility':
      case 'serviceClarity':
      case 'completeness':
        factorScore = 0.7;
        break;
      default:
        factorScore = 0.5;
    }
    
    score += factorScore * weight;
  }
  
  return score;
}

function generateGalleryProjection(canonicalGraph, scoring, projectsManifest) {
  const projects = {};
  
  // Create a valid project ID set for referential integrity
  const validProjectIds = new Set(projectsManifest.projects.map(p => p.id));
  
  // Create a mapping from filename-based project IDs to actual project IDs
  // Only map to projects that actually exist
  const projectIdMap = {};
  for (const project of projectsManifest.projects) {
    // Map project names to IDs for common patterns
    if (project.name.includes('Painting')) {
      projectIdMap['HP0017'] = project.id;
      projectIdMap['HP002'] = project.id;
      projectIdMap['HP006'] = project.id;
      projectIdMap['HP010'] = project.id;
      projectIdMap['HP016'] = project.id;
    } else if (project.name.includes('Fencing')) {
      projectIdMap['HP0018'] = project.id;
      projectIdMap['HP0020'] = project.id;
      projectIdMap['HP012'] = project.id;
      projectIdMap['HP019'] = project.id;
    } else if (project.name.includes('Drywall')) {
      projectIdMap['HP001'] = project.id;
      projectIdMap['HP009'] = project.id;
      projectIdMap['HP016'] = project.id;
    } else if (project.name.includes('Shed')) {
      projectIdMap['HP003'] = project.id;
    } else if (project.name.includes('Siding')) {
      projectIdMap['HP004'] = project.id;
      projectIdMap['HP007'] = project.id;
    } else if (project.name.includes('Door')) {
      projectIdMap['HP005'] = project.id;
    } else if (project.name.includes('Flooring') || project.name.includes('Subfloor')) {
      projectIdMap['HP011'] = project.id;
      projectIdMap['HP014'] = project.id;
      projectIdMap['HP015'] = project.id;
    } else if (project.name.includes('Window')) {
      projectIdMap['HP013'] = project.id;
    } else if (project.name.includes('Featured')) {
      projectIdMap['Featured'] = project.id;
    }
  }
  
  // Group images by project
  // Explicit stable ordering for constitutional replay
  for (const node of canonicalGraph.nodes.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (node.type !== 'image') continue;
    
    const filename = node.data.original_filename;
    let projectId = 'Featured';
    
    const match = filename.match(/^(HP\d+|Featured)/);
    if (match) {
      projectId = match[1];
    }
    
    // Map to actual project ID
    const actualProjectId = projectIdMap[projectId];
    
    // Skip if no valid mapping exists (referential integrity)
    if (!actualProjectId || !validProjectIds.has(actualProjectId)) {
      continue;
    }
    
    if (!projects[actualProjectId]) {
      projects[actualProjectId] = {
        projectId: actualProjectId,
        images: [],
        coverage: 'UNKNOWN'
      };
    }
    
    projects[actualProjectId].images.push({
      id: node.id,
      filename,
      score: calculateImageScore(node, scoring),
      beforeAfter: node.data.before_after,
      data: node.data
    });
  }
  
  // Determine coverage and select representatives
  const projectionProjects = [];
  let order = 0;
  
  // Explicit stable ordering for constitutional replay
  for (const projectId of Object.keys(projects).sort()) {
    const projectData = projects[projectId];
    const images = projectData.images;
    const beforeImages = images.filter(img => img.beforeAfter === false || img.filename.toLowerCase().includes('before'));
    const afterImages = images.filter(img => img.beforeAfter === true || img.filename.toLowerCase().includes('after'));
    
    let coverage = 'UNKNOWN';
    if (beforeImages.length > 0 && afterImages.length > 0) {
      coverage = 'COMPLETE';
    } else if (afterImages.length > 0) {
      coverage = 'AFTER_ONLY';
    } else if (beforeImages.length > 0) {
      coverage = 'BEFORE_ONLY';
    }
    
    const sortedImages = [...images].sort((a, b) => b.score - a.score);
    const representative = sortedImages[0];
    const supporting = sortedImages.slice(1);
    
    projectionProjects.push({
      projectId,
      galleryRepresentative: representative.filename,
      supportingGalleryEvidence: supporting.map(img => img.filename),
      galleryOrder: order++,
      coverage
    });
  }
  
  const projection = {
    projectionId: 'gallery-v1',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    generatedAt: canonicalGraph.generatedAt,
    projects: projectionProjects.sort((a, b) => a.galleryOrder - b.galleryOrder).map(p => ({
      ...p,
      supportingGalleryEvidence: p.supportingGalleryEvidence.sort()
    }))
  };
  
  // Calculate hash before adding the hash field
  // Exclude generatedAt from hash calculation for determinism
  const { generatedAt, ...projectionForHash } = projection;
  projection.generatedHash = 'sha256:' + calculateObjectHash(projectionForHash);
  return projection;
}

function generateHeroProjection(canonicalGraph, scoring) {
  // Explicit stable ordering for constitutional replay
  const featuredImages = canonicalGraph.nodes
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(node => node.type === 'image' && node.data.featured_candidate === true);
  
  if (featuredImages.length === 0) {
    throw new Error('No featured candidate images found');
  }
  
  const scoredImages = featuredImages.map(img => ({
    id: img.id,
    filename: img.data.original_filename,
    dimensions: `${img.data.width}x${img.data.height}`,
    score: calculateImageScore(img, scoring)
  }));
  
  scoredImages.sort((a, b) => b.score - a.score);
  const hero = scoredImages[0];
  
  const projection = {
    projectionId: 'hero-v1',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    generatedAt: canonicalGraph.generatedAt,
    hero: {
      heroMediaId: hero.id,
      filename: hero.filename,
      dimensions: hero.dimensions,
      score: hero.score
    }
  };
  
  // Calculate hash before adding the hash field
  // Exclude generatedAt from hash calculation for determinism
  const { generatedAt, ...projectionForHash } = projection;
  projection.generatedHash = 'sha256:' + calculateObjectHash(projectionForHash);
  return projection;
}

function generateServiceProjection(canonicalGraph, scoring) {
  const services = {};
  
  // Explicit stable ordering for constitutional replay
  for (const node of canonicalGraph.nodes.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (node.type !== 'image' || !node.data.gallery_candidate) continue;
    
    const job = node.data.job || 'other';
    if (!services[job]) {
      services[job] = [];
    }
    
    services[job].push({
      id: node.id,
      filename: node.data.original_filename,
      score: calculateImageScore(node, scoring)
    });
  }
  
  const serviceProjections = [];
  
  for (const serviceId of Object.keys(services)) {
    const images = services[serviceId];
    images.sort((a, b) => b.score - a.score);
    const preview = images[0];
    
    serviceProjections.push({
      serviceId,
      servicePreviewMediaId: preview.filename,
      filename: preview.filename,
      score: preview.score
    });
  }
  
  const projection = {
    projectionId: 'service-v1',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    generatedAt: canonicalGraph.generatedAt,
    services: serviceProjections.sort((a, b) => a.serviceId.localeCompare(b.serviceId))
  };
  
  // Calculate hash before adding the hash field
  // Exclude generatedAt from hash calculation for determinism
  const { generatedAt, ...projectionForHash } = projection;
  projection.generatedHash = 'sha256:' + calculateObjectHash(projectionForHash);
  return projection;
}

function main() {
  const basePath = path.resolve(__dirname, '../../metadata');
  
  console.log('Constitutional Projection Generator v' + GENERATOR_VERSION);
  console.log('=========================================\n');
  
  // Load canonical graph
  const canonicalGraphPath = path.join(basePath, 'canonical-media-graph.json');
  console.log('Loading canonical graph:', canonicalGraphPath);
  const canonicalGraph = loadCanonicalGraph(canonicalGraphPath);
  console.log('  Version:', canonicalGraph.version);
  console.log('  Nodes:', canonicalGraph.nodes.length);
  
  // Load projects manifest for referential integrity
  const projectsManifestPath = path.join(basePath, '../src/config/projects.v1.json');
  console.log('Loading projects manifest:', projectsManifestPath);
  const projectsManifest = loadProjectsManifest(projectsManifestPath);
  console.log('  Projects:', projectsManifest.projects.length);
  
  // Load scoring artifacts
  const scoringPath = path.join(basePath, 'projection/scoring');
  const galleryScoring = loadScoringArtifact(path.join(scoringPath, 'gallery.scoring.v1.json'));
  const heroScoring = loadScoringArtifact(path.join(scoringPath, 'hero.scoring.v1.json'));
  const serviceScoring = loadScoringArtifact(path.join(scoringPath, 'service.scoring.v1.json'));
  
  console.log('\nLoading scoring artifacts...');
  console.log('  Gallery scoring:', galleryScoring.version);
  console.log('  Hero scoring:', heroScoring.version);
  console.log('  Service scoring:', serviceScoring.version);
  
  // Generate projections
  console.log('\nGenerating projections...');
  
  const galleryProjection = generateGalleryProjection(canonicalGraph, galleryScoring, projectsManifest);
  const heroProjection = generateHeroProjection(canonicalGraph, heroScoring);
  const serviceProjection = generateServiceProjection(canonicalGraph, serviceScoring);
  
  // Write projections
  const outputPath = path.join(basePath, 'projection');
  fs.mkdirSync(outputPath, { recursive: true });
  
  fs.writeFileSync(
    path.join(outputPath, 'galleryProjection.json'),
    JSON.stringify(galleryProjection, null, 2)
  );
  console.log('  Generated: galleryProjection.json');
  
  fs.writeFileSync(
    path.join(outputPath, 'heroProjection.json'),
    JSON.stringify(heroProjection, null, 2)
  );
  console.log('  Generated: heroProjection.json');
  
  fs.writeFileSync(
    path.join(outputPath, 'serviceProjection.json'),
    JSON.stringify(serviceProjection, null, 2)
  );
  console.log('  Generated: serviceProjection.json');
  
  console.log('\n✅ Projection generation complete');
  console.log('\nProvenance:');
  console.log('  Canonical Graph Version:', canonicalGraph.version);
  console.log('  Generator Version:', GENERATOR_VERSION);
  console.log('  Gallery Projection Hash:', galleryProjection.generatedHash);
  console.log('  Hero Projection Hash:', heroProjection.generatedHash);
  console.log('  Service Projection Hash:', serviceProjection.generatedHash);
}

if (require.main === module) {
  main();
}

module.exports = { generateGalleryProjection, generateHeroProjection, generateServiceProjection };
