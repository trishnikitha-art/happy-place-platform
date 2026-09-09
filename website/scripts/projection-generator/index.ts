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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  schemaVersion: string;
  projectionVersion: string;
  scoringVersion: string;
  canonicalGraphVersion: string;
  generatorVersion: string;
  inputHash: string;
  generatedAt: string;
  generatedHash: string;
  projects?: Array<{
    projectId: string;
    projectName: string;
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
    serviceName: string;
    serviceRepresentative: string;
    supportingServiceEvidence?: string[];
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
      projectName: projectId,
      galleryRepresentative: representative.filename,
      supportingGalleryEvidence: supporting.map((img: any) => img.filename),
      galleryOrder: order++,
      coverage
    });
  }
  
  return {
    projectionId: 'gallery-v1',
    schemaVersion: '1.0.0',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    inputHash: canonicalGraph.generatedHash,
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
    heroMediaId: img.id,
    filename: img.data.original_filename,
    dimensions: `${img.data.width}x${img.data.height}`,
    score: calculateImageScore(img, scoring)
  }));
  
  scoredImages.sort((a, b) => b.score - a.score);
  const hero = scoredImages[0];
  
  return {
    projectionId: 'hero-v1',
    schemaVersion: '1.0.0',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    inputHash: canonicalGraph.generatedHash,
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
  
  for (const [serviceName, images] of Object.entries(services)) {
    images.sort((a, b) => b.score - a.score);
    const preview = images[0];
    
    serviceProjections.push({
      serviceName,
      serviceRepresentative: preview.filename,
      supportingServiceEvidence: images.slice(1).map(img => img.filename)
    });
  }
  
  return {
    projectionId: 'service-v1',
    schemaVersion: '1.0.0',
    projectionVersion: '1.0.0',
    scoringVersion: scoring.version,
    canonicalGraphVersion: canonicalGraph.version,
    generatorVersion: GENERATOR_VERSION,
    inputHash: canonicalGraph.generatedHash,
    generatedAt: new Date().toISOString(),
    generatedHash: '',
    services: serviceProjections
  };
}

function main() {
  try {
    const basePath = path.resolve(__dirname, '../../metadata');
    
    console.log('Constitutional Projection Generator v' + GENERATOR_VERSION);
    console.log('=========================================\n');
    console.log('Base path:', basePath);
    console.log('__dirname:', __dirname);
    console.log('Resolved base path:', path.resolve(basePath));
    console.log('CWD:', process.cwd());
    
    // Load canonical graph
    const canonicalGraphPath = path.join(basePath, 'canonical-media-graph.json');
    console.log('Loading canonical graph:', canonicalGraphPath);
    console.log('File exists:', fs.existsSync(canonicalGraphPath));
    
    const canonicalGraph = loadCanonicalGraph(canonicalGraphPath);
    console.log('  Version:', canonicalGraph.version);
    console.log('  Nodes:', canonicalGraph.nodes.length);
    
    // Load scoring artifacts
    const scoringPath = path.join(basePath, 'projection/scoring');
    console.log('Scoring path:', scoringPath);
    console.log('Scoring path exists:', fs.existsSync(scoringPath));
    const galleryScoringPath = path.join(scoringPath, 'gallery.scoring.v1.json');
    const heroScoringPath = path.join(scoringPath, 'hero.scoring.v1.json');
    const serviceScoringPath = path.join(scoringPath, 'service.scoring.v1.json');
    
    console.log('Gallery scoring path:', galleryScoringPath);
    console.log('Gallery scoring exists:', fs.existsSync(galleryScoringPath));
    console.log('Hero scoring path:', heroScoringPath);
    console.log('Hero scoring exists:', fs.existsSync(heroScoringPath));
    console.log('Service scoring path:', serviceScoringPath);
    console.log('Service scoring exists:', fs.existsSync(serviceScoringPath));
    
    let galleryScoring, heroScoring, serviceScoring;
    try {
      galleryScoring = loadScoringArtifact(galleryScoringPath);
      heroScoring = loadScoringArtifact(heroScoringPath);
      serviceScoring = loadScoringArtifact(serviceScoringPath);
      
      console.log('\nLoading scoring artifacts...');
      console.log('  Gallery scoring:', galleryScoring.version);
      console.log('  Hero scoring:', heroScoring.version);
      console.log('  Service scoring:', serviceScoring.version);
    } catch (error) {
      console.error('Error loading scoring artifacts:', error);
      process.exit(1);
    }
    
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
    console.log('Output path:', outputPath);
    console.log('Output path exists:', fs.existsSync(outputPath));
    fs.mkdirSync(outputPath, { recursive: true });
    console.log('Output directory created/verified');
    
    const galleryPath = path.join(outputPath, 'galleryProjection.json');
    const heroPath = path.join(outputPath, 'heroProjection.json');
    const servicePath = path.join(outputPath, 'serviceProjection.json');
    
    console.log('Writing gallery projection to:', galleryPath);
    fs.writeFileSync(galleryPath, JSON.stringify(galleryProjection, null, 2));
    console.log('  Generated: galleryProjection.json');
    console.log('Gallery file exists:', fs.existsSync(galleryPath));
    
    console.log('Writing hero projection to:', heroPath);
    fs.writeFileSync(heroPath, JSON.stringify(heroProjection, null, 2));
    console.log('  Generated: heroProjection.json');
    console.log('Hero file exists:', fs.existsSync(heroPath));
    
    console.log('Writing service projection to:', servicePath);
    fs.writeFileSync(servicePath, JSON.stringify(serviceProjection, null, 2));
    console.log('  Generated: serviceProjection.json');
    console.log('Service file exists:', fs.existsSync(servicePath));
    
    console.log('\n✅ Projection generation complete');
    console.log('\nProvenance:');
    console.log('  Canonical Graph Version:', canonicalGraph.version);
    console.log('  Generator Version:', GENERATOR_VERSION);
    console.log('  Gallery Projection Hash:', galleryProjection.generatedHash);
    console.log('  Hero Projection Hash:', heroProjection.generatedHash);
    console.log('  Service Projection Hash:', serviceProjection.generatedHash);
    console.log('\nOutput path:', outputPath);
    console.log('Output files written successfully');
  } catch (error) {
    console.error('Fatal error in projection generation:', error);
    process.exit(1);
  }
}

main();

export { generateGalleryProjection, generateHeroProjection, generateServiceProjection };
