#!/usr/bin/env node

/**
 * Regenerate Gallery Projection from Canonical Authority
 * 
 * This script generates a build-safe gallery projection from:
 * - Canonical projects (projects.v1.json)
 * - Canonical media (media.v1.json)
 * 
 * The projection is used for static generation and is authoritative for
 * gallery rendering during build time.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load canonical authorities
const projectsPath = join(__dirname, '../src/config/projects.v1.json');
const mediaPath = join(__dirname, '../src/config/media.v1.json');
const outputPath = join(__dirname, '../.generated/gallery-projection.json');

const projects = JSON.parse(readFileSync(projectsPath, 'utf-8'));
const media = JSON.parse(readFileSync(mediaPath, 'utf-8'));

// Create media lookup map
const mediaMap = new Map(media.media.map(m => [m.id, m]));

// Generate gallery projection
const galleryProjection = {
  projectionId: "gallery-v1",
  schemaVersion: "1.0.0",
  projectionVersion: "1.0.0",
  scoringVersion: "1.0.0",
  canonicalGraphVersion: "1.0.0",
  generatorVersion: "1.0.0",
  inputHash: createHash('sha256').update(JSON.stringify({ projects, media })).digest('hex'),
  generatedAt: new Date().toISOString(),
  generatedHash: createHash('sha256').update(JSON.stringify({ projects, media })).digest('hex'),
  projects: []
};

// Process each project
for (const project of projects.projects) {
  // Skip archived projects
  if (project.archived) continue;

  // Get hero media
  const heroMedia = project.media.hero ? mediaMap.get(project.media.hero) : null;
  
  // Get gallery media
  const galleryMediaIds = project.media.gallery || [];
  const galleryMedia = galleryMediaIds
    .map(id => mediaMap.get(id))
    .filter(m => m !== null);

  // Build gallery evidence
  const supportingGalleryEvidence = [];
  
  // Add hero if available
  if (heroMedia) {
    supportingGalleryEvidence.push(heroMedia.id);
  }
  
  // Add gallery media
  for (const m of galleryMedia) {
    supportingGalleryEvidence.push(m.id);
  }

  // Determine coverage
  let coverage = "EMPTY";
  if (heroMedia && galleryMedia.length > 0) {
    coverage = "COMPLETE";
  } else if (heroMedia) {
    coverage = "HERO_ONLY";
  } else if (galleryMedia.length > 0) {
    coverage = "GALLERY_ONLY";
  }

  // Determine gallery representative
  let galleryRepresentative = null;
  if (heroMedia) {
    galleryRepresentative = heroMedia.id;
  } else if (galleryMedia.length > 0) {
    galleryRepresentative = galleryMedia[0].id;
  }

  // Add to projection if has any media
  if (heroMedia || galleryMedia.length > 0) {
    galleryProjection.projects.push({
      projectId: project.id,
      projectName: project.title,
      galleryRepresentative,
      supportingGalleryEvidence,
      galleryOrder: project.featured ? 0 : galleryProjection.projects.length,
      coverage: coverage === 'EMPTY' ? 'UNKNOWN' : coverage
    });
  }
}

// Sort by featured status first, then by order
galleryProjection.projects.sort((a, b) => {
  if (a.galleryOrder !== b.galleryOrder) {
    return a.galleryOrder - b.galleryOrder;
  }
  return a.projectId.localeCompare(b.projectId);
});

// Write projection
writeFileSync(outputPath, JSON.stringify(galleryProjection, null, 2));

console.log('Gallery projection regenerated successfully');
console.log(`Total projects in projection: ${galleryProjection.projects.length}`);
console.log(`Output: ${outputPath}`);