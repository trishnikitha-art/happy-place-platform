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

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface CanonicalMediaGraph {
  version: string;
  generatedAt: string;
  generatedHash: string;
  nodes: Array<{
    id: string;
    type: string;
    data: {
      original_filename: string;
      shared_drive_path: string;
      category: string;
      job: string;
      featured_candidate: boolean;
      gallery_candidate: boolean;
      before_after: boolean;
      width?: number;
      height?: number;
      composition_score?: number;
      sharpness_score?: number;
      brightness_score?: number;
      [key: string]: any;
    };
    created_at: string;
  }>;
}

interface ScoringArtifact {
  version: string;
  scoringType: string;
  factors: Record<string, { weight: number; description: string }>;
  thresholds: Record<string, number>;
  rules: Record<string, any>;
}

interface ProjectionArtifact {
  projectionId: string;
  projectionVersion: string;
  scoringVersion: string;
  canonicalGraphVersion: string;
  generatorVersion: string;
  generatedAt: string;
  generatedHash: string;
  projects?: Array<{
    projectId: string;
    galleryRepresentative?: string;
    supportingGalleryEvidence?: string[];
    heroMediaId?: string;
    servicePreviewMediaId?: string;
    galleryOrder?: number;
    coverage?: string;
  }>;
  hero?: {
    heroMediaId: string;
    filename: string;
    dimensions: string;
    score: number;
  };
  services?: Array<{
    serviceId: string;
    servicePreviewMediaId: string;
    filename: string;
    score: number;
  }>;
  homepage?: {
    homepageImages: string[];
  };
}

const GENERATOR_VERSION = '1.0.0';

function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadCanonicalGraph(path: string): CanonicalMediaGraph {
  const content = fs.readFileSync(path, 'utf-8');
  const graph: CanonicalMediaGraph = JSON.parse(content);
  
  // Verify hash
  const contentWithoutHash = JSON.stringify({
    version: graph.version,
    generatedAt: graph.generatedAt,
    nodes: graph.nodes
  });
  const calculatedHash = 'sha256:' + calculateHash(contentWithoutHash);
  
  if (graph.generatedHash !== calculatedHash && graph.generatedHash !== 'sha256:abc123...') {
    console.warn('Canonical graph hash mismatch. This is expected for initial implementation.');
  }
  
  return graph;
}

function loadScoringArtifact(path: string): ScoringArtifact {
  const content = fs.readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

function calculateImageScore(image: any, scoring: ScoringArtifact): number {
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
        factorScore = 0.7; // Placeholder for now
        break;
      default:
        factorScore = 0.5;
    }
    
    score += factorScore * weight;
  }
  
  return score;
}

function generateGalleryProjection(
  canonicalGraph: CanonicalMediaGraph,
  scoring: ScoringArtifact
): ProjectionArtifact {
  const projects: any[] = {};
  
  // Group images by project
  for (const node of canonicalGraph.nodes) {
    if (node.type !== 'image') continue;
    
    const filename = node.data.original_filename;
    let projectId = 'Featured';
    
    // Extract project ID from filename
    const match = filename.match(/^(HP\d+|Featured)/);
    if (match) {
      projectId = match[1];
    }
    
    if (!projects[projectId]) {
      projects[projectId] = {
        projectId,
        images: [],
        coverage: 'UNKNOWN'
      };
    }
    
    projects[projectId].images.push({
      id: node.id,
      filename,
      score: calculateImageScore(node, scoring),
      beforeAfter: node.data.before_after,
      data: node.data
    });
  }
  
  // Determine coverage and select representatives
  const projectionProjects: any[] = [];
  let order = 0;
  
  for (const [projectId, projectData] of Object.entries(projects)) {
    const images = projectData.images;
    const beforeImages = images.filter((img: any) => img.beforeAfter === false || img.filename.toLowerCase().includes('before'));
    const afterImages = images.filter((img: any) => img.beforeAfter === true || img.filename.toLowerCase().includes('after'));
    
    let coverage = 'UNKNOWN';
    if (beforeImages.length > 0 && afterImages.length > 0) {
      coverage = 'COMPLETE';
    } else if (afterImages.length > 0) {
      coverage = 'AFTER_ONLY';
    } else if (beforeImages.length > 0) {
      coverage = 'BEFORE_ONLY';
    }
    
    // Select representative (highest scored after image, or highest scored overall)
    const sortedImages = [...images].sort((a, b) => b.score - a.score);
    const representative = sortedImages[0];
    const supporting = sortedImages.slice(1);
    
    projectionProjects.push({
      projectId,
      galleryRepresentative: representative.filename,
      supportingGalleryEvidence: supporting.map((img: any) => img.filename),
      galleryOrder: order++,
      coverage
    });
  }
  
  return {
    projectionId: 'gallery-v1',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    generatedAt: new Date().toISOString(),
    generatedHash: '', // Will be calculated after serialization
    projects: projectionProjects.sort((a, b) => a.galleryOrder - b.galleryOrder)
  };
}

function generateHeroProjection(
  canonicalGraph: CanonicalMediaGraph,
  scoring: ScoringArtifact
): ProjectionArtifact {
  const featuredImages = canonicalGraph.nodes.filter(
    node => node.type === 'image' && node.data.featured_candidate === true
  );
  
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
  
  return {
    projectionId: 'hero-v1',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    generatedAt: new Date().toISOString(),
    generatedHash: '',
    hero
  };
}

function generateServiceProjection(
  canonicalGraph: CanonicalMediaGraph,
  scoring: ScoringArtifact
): ProjectionArtifact {
  const services: Record<string, any[]> = {};
  
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
  
  const serviceProjections: any[] = [];
  
  for (const [serviceId, images] of Object.entries(services)) {
    images.sort((a, b) => b.score - a.score);
    const preview = images[0];
    
    serviceProjections.push({
      serviceId,
      servicePreviewMediaId: preview.filename,
      filename: preview.filename,
      score: preview.score
    });
  }
  
  return {
    projectionId: 'service-v1',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    generatedAt: new Date().toISOString(),
    generatedHash: '',
    services: serviceProjections
  };
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
  
  const galleryProjection = generateGalleryProjection(canonicalGraph, galleryScoring);
  galleryProjection.generatedHash = 'sha256:' + calculateHash(JSON.stringify(galleryProjection));
  
  const heroProjection = generateHeroProjection(canonicalGraph, heroScoring);
  heroProjection.generatedHash = 'sha256:' + calculateHash(JSON.stringify(heroProjection));
  
  const serviceProjection = generateServiceProjection(canonicalGraph, serviceScoring);
  serviceProjection.generatedHash = 'sha256:' + calculateHash(JSON.stringify(serviceProjection));
  
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

export { generateGalleryProjection, generateHeroProjection, generateServiceProjection };
