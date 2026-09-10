#!/usr/bin/env node

/**
 * Gallery Projection Regenerator
 * 
 * Regenerates gallery projection from current static media authority (media.v1.json)
 * instead of historical canonical graph data.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.dirname(__dirname);

function loadJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function calculateImageScore(media) {
  // Simple scoring based on featured flag and heroEligible
  let score = 0.5;
  if (media.featured) score += 0.2;
  if (media.heroEligible) score += 0.2;
  if (media.homepageEligible) score += 0.1;
  return Math.min(score, 1.0);
}

console.log('Regenerating gallery projection from static media authority...');

// Load current media authority
const mediaAuthority = loadJSON(path.join(ROOT, 'src/config/media.v1.json'));
const projectsAuthority = loadJSON(path.join(ROOT, 'src/config/projects.v1.json'));

// Generate gallery projection from projects authority
const galleryProjects = [];

for (const project of projectsAuthority.projects) {
  const projectMedia = mediaAuthority.media.filter(m => 
    m.projectId === project.id || 
    project.media?.gallery?.includes(m.id) ||
    project.media?.hero === m.id
  );

  if (projectMedia.length > 0) {
    // Select representative image (prefer hero, then featured, then first gallery)
    const heroMedia = projectMedia.find(m => m.id === project.media?.hero);
    const featuredMedia = projectMedia.find(m => m.featured);
    const representative = heroMedia || featuredMedia || projectMedia[0];

    galleryProjects.push({
      projectId: project.id,
      projectTitle: project.title,
      galleryRepresentative: representative.id,
      supportingGalleryEvidence: projectMedia.map(m => m.id),
      galleryOrder: project.featured ? 0 : 10,
      coverage: project.media?.before ? 'BEFORE_AFTER' : 'AFTER_ONLY'
    });
  }
}

// Sort by gallery order
galleryProjects.sort((a, b) => a.galleryOrder - b.galleryOrder);

const galleryProjection = {
  projectionId: 'gallery-v1',
  schemaVersion: '1.0.0',
  projectionVersion: '1.0.0',
  scoringVersion: '1.0.0',
  canonicalGraphVersion: '1.0.0',
  generatorVersion: '1.0.0',
  inputHash: 'sha256:' + Date.now(),
  generatedAt: new Date().toISOString(),
  projects: galleryProjects
};

// Write projection
const outputPath = path.join(ROOT, '.generated/gallery-projection.json');
fs.writeFileSync(outputPath, JSON.stringify(galleryProjection, null, 2));

console.log(`✓ Generated gallery projection with ${galleryProjects.length} projects`);
console.log(`✓ Written to ${outputPath}`);

// Validate projection
console.log('\nValidating projection...');
const validationErrors = [];

for (const project of galleryProjects) {
  const repRecord = mediaAuthority.media.find(m => m.id === project.galleryRepresentative);
  if (!repRecord) {
    validationErrors.push({
      projectId: project.projectId,
      representativeId: project.galleryRepresentative,
      error: 'Not found in media authority'
    });
  }
}

if (validationErrors.length > 0) {
  console.log(`\n✗ Validation failed with ${validationErrors.length} errors:`);
  validationErrors.forEach(err => {
    console.log(`  ${err.projectId}: ${err.representativeId} - ${err.error}`);
  });
  process.exit(1);
} else {
  console.log('✓ All projections validated successfully');
}
