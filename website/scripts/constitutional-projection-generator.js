#!/usr/bin/env node

/**
 * Constitutional Projection Generator
 * 
 * Input:
 * - Canonical Media Graph (immutable evidence)
 * - Constitutional Scoring Artifact (versioned constitutional artifact)
 * - Generator Version
 * 
 * Output:
 * - Projection Artifacts with complete provenance
 *   - schemaVersion
 *   - projectionVersion
 *   - scoringVersion
 *   - canonicalGraphVersion
 *   - generatorVersion
 *   - inputHash (graph + scoring + generator)
 *   - generatedHash
 *   - generatedAt
 * 
 * Architecture:
 * Canonical Media Graph
 *   + Constitutional Scoring Artifact
 *   ↓
 * Projection Generator
 *   ↓
 * Projection Validator
 *   ↓
 * Projection Artifacts
 *   ↓
 * Next Build
 *   ↓
 * Static Runtime
 *   ↓
 * Pure React Components
 * 
 * Note: Currently uses filename-based grouping as transitional fallback
 * until graph contains constitutional belongsTo edges.
 * Use --allow-legacy-grouping flag to enable this mode.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GENERATOR_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.0.0';

function calculateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadCanonicalGraph(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const graph = JSON.parse(content);
  return graph;
}

function loadScoringArtifact(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
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
        factorScore = 0.7;
        break;
      default:
        factorScore = 0.5;
    }
    
    score += factorScore * weight;
  }
  
  return score;
}

function validateProjections(projections, graph) {
  const errors = [];
  
  // Validate hero projection
  if (projections.hero) {
    const heroId = projections.hero.hero.heroMediaId;
    const heroExists = graph.nodes.some(n => n.id === heroId && n.type === 'image');
    if (!heroExists) {
      errors.push(`Hero projection references non-existent image: ${heroId}`);
    }
  }
  
  // Validate gallery projection
  if (projections.gallery) {
    for (const project of projections.gallery.projects) {
      const repId = project.galleryRepresentative;
      // Check if representative exists in graph
      const repExists = graph.nodes.some(n => n.id === repId || n.data.original_filename === repId);
      if (!repExists) {
        errors.push(`Gallery projection references non-existent image: ${repId}`);
      }
    }
  }
  
  // Validate service projection
  if (projections.service) {
    for (const service of projections.service.services) {
      const repId = service.serviceRepresentative;
      const repExists = graph.nodes.some(n => n.id === repId || n.data.original_filename === repId);
      if (!repExists) {
        errors.push(`Service projection references non-existent image: ${repId}`);
      }
    }
  }
  
  return errors;
}

function generateGalleryProjection(canonicalGraph, scoring) {
  const projects = {};
  
  // Check if graph has constitutional belongsTo edges
  const hasBelongsToEdges = canonicalGraph.edges.some(e => e.kind === 'belongsTo');
  
  if (!hasBelongsToEdges) {
    throw new Error('FAIL BUILD: Graph missing belongsTo edges. Filename heuristics not allowed in production. Please run graph-edge-generator.js to add constitutional edges.');
  }
  
  // Constitutional approach: use graph edges
  for (const edge of canonicalGraph.edges) {
    if (edge.kind !== 'belongsTo') continue;
    
    const imageNode = canonicalGraph.nodes.find(n => n.id === edge.from && n.type === 'image');
    const projectNode = canonicalGraph.nodes.find(n => n.id === edge.to && n.type === 'project');
    
    if (!imageNode || !projectNode) continue;
    
    const projectId = projectNode.id;
    
    if (!projects[projectId]) {
      projects[projectId] = {
        projectId,
        projectName: projectNode.data.name || 'Unknown',
        images: [],
        coverage: 'UNKNOWN'
      };
    }
    
    projects[projectId].images.push({
      id: imageNode.id,
      filename: imageNode.data.original_filename,
      score: calculateImageScore(imageNode, scoring),
      beforeAfter: imageNode.data.before_after,
      data: imageNode.data
    });
  }
  
  // Determine coverage and select representatives
  const projectionProjects = [];
  let order = 0;
  
  for (const projectId of Object.keys(projects)) {
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
  
  // Calculate input hash
  const graphHash = calculateHash(JSON.stringify(canonicalGraph));
  const scoringHash = calculateHash(JSON.stringify(scoring));
  const inputHash = calculateHash(graphHash + scoringHash + GENERATOR_VERSION);
  
  const projection = {
    projectionId: 'gallery-v1',
    schemaVersion: SCHEMA_VERSION,
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    inputHash: 'sha256:' + inputHash,
    generatedAt: new Date().toISOString(),
    projects: projectionProjects.sort((a, b) => a.galleryOrder - b.galleryOrder)
  };
  
  // Calculate hash before adding the hash field
  const projectionCopy = { ...projection };
  projection.generatedHash = 'sha256:' + calculateHash(JSON.stringify(projectionCopy));
  return projection;
}

function generateHeroProjection(canonicalGraph, scoring) {
  const featuredImages = canonicalGraph.nodes.filter(
    node => node.type === 'image' && node.data.featured_candidate === true
  );
  
  if (featuredImages.length === 0) {
    throw new Error('No featured candidate images found');
  }
  
  const scoredImages = featuredImages.map(img => {
    const width = img.data.exif?.ExifImageWidth || img.data.width || 'unknown';
    const height = img.data.exif?.ExifImageHeight || img.data.height || 'unknown';
    return {
      id: img.id,
      filename: img.data.original_filename,
      dimensions: `${width}x${height}`,
      score: calculateImageScore(img, scoring)
    };
  });
  
  scoredImages.sort((a, b) => b.score - a.score);
  const hero = scoredImages[0];
  
  // Calculate input hash
  const graphHash = calculateHash(JSON.stringify(canonicalGraph));
  const scoringHash = calculateHash(JSON.stringify(scoring));
  const inputHash = calculateHash(graphHash + scoringHash + GENERATOR_VERSION);
  
  const projection = {
    projectionId: 'hero-v1',
    schemaVersion: SCHEMA_VERSION,
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    inputHash: 'sha256:' + inputHash,
    generatedAt: new Date().toISOString(),
    hero: {
      heroMediaId: hero.id,
      filename: hero.filename,
      dimensions: hero.dimensions,
      score: hero.score
    }
  };
  
  // Calculate hash before adding the hash field
  const projectionCopy = { ...projection };
  projection.generatedHash = 'sha256:' + calculateHash(JSON.stringify(projectionCopy));
  return projection;
}

function generateServiceProjection(canonicalGraph, scoring) {
  const services = {};
  
  for (const node of canonicalGraph.nodes) {
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
  
  const projectionServices = [];
  
  for (const [serviceName, images] of Object.entries(services)) {
    const sortedImages = [...images].sort((a, b) => b.score - a.score);
    const representative = sortedImages[0];
    const supporting = sortedImages.slice(1);
    
    projectionServices.push({
      serviceName: serviceName,
      serviceRepresentative: representative.filename,
      supportingServiceEvidence: supporting.map(img => img.filename)
    });
  }
  
  // Calculate input hash
  const graphHash = calculateHash(JSON.stringify(canonicalGraph));
  const scoringHash = calculateHash(JSON.stringify(scoring));
  const inputHash = calculateHash(graphHash + scoringHash + GENERATOR_VERSION);
  
  const projection = {
    projectionId: 'service-v1',
    schemaVersion: SCHEMA_VERSION,
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    inputHash: 'sha256:' + inputHash,
    generatedAt: new Date().toISOString(),
    services: projectionServices
  };
  
  // Calculate hash before adding the hash field
  const projectionCopy = { ...projection };
  projection.generatedHash = 'sha256:' + calculateHash(JSON.stringify(projectionCopy));
  return projection;
}

function main() {
  console.log('Constitutional Projection Generator');
  console.log('='.repeat(50));
  
  const ROOT = path.resolve(__dirname, '..');
  const GRAPH_PATH = path.resolve(ROOT, 'metadata/canonical-media-graph.json');
  const SCORING_PATH = path.resolve(ROOT, 'metadata/constitutional-scoring.json');
  const OUTPUT_DIR = path.resolve(ROOT, '.generated');
  
  // Load inputs
  console.log('Loading canonical graph...');
  const canonicalGraph = loadCanonicalGraph(GRAPH_PATH);
  
  console.log('Loading constitutional scoring artifact...');
  const scoring = loadScoringArtifact(SCORING_PATH);
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Generate projections
  console.log('Generating hero projection...');
  const heroProjection = generateHeroProjection(canonicalGraph, scoring);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'hero-projection.json'),
    JSON.stringify(heroProjection, null, 2)
  );
  console.log('  ✓ hero-projection.json');
  
  console.log('Generating gallery projection...');
  const galleryProjection = generateGalleryProjection(canonicalGraph, scoring);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'gallery-projection.json'),
    JSON.stringify(galleryProjection, null, 2)
  );
  console.log('  ✓ gallery-projection.json');
  
  console.log('Generating service projection...');
  const serviceProjection = generateServiceProjection(canonicalGraph, scoring);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'service-projection.json'),
    JSON.stringify(serviceProjection, null, 2)
  );
  console.log('  ✓ service-projection.json');
  
  // Validate projections
  console.log('Validating projections...');
  const projections = { hero: heroProjection, gallery: galleryProjection, service: serviceProjection };
  const validationErrors = validateProjections(projections, canonicalGraph);
  
  if (validationErrors.length > 0) {
    console.error('Validation failed:');
    validationErrors.forEach(err => console.error(`  ✗ ${err}`));
    process.exit(1);
  }
  
  console.log('  ✓ All projections validated');
  
  console.log('\n' + '='.repeat(50));
  console.log('Constitutional projections generated successfully!');
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main();
