#!/usr/bin/env node

/**
 * Canonical Media Authority Generator
 * 
 * Groups duplicate content hashes under single canonical assets.
 * Implements: ONE real photo = ONE canonical asset.
 * 
 * Strategy:
 * 1. Group media records by content hash
 * 2. For each hash group, select canonical representative (prefer heroEligible, then featured, then first)
 * 3. Create canonical asset record with variants
 * 4. Remove duplicate records
 * 5. Update project references to point to canonical IDs
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

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

console.log('='.repeat(80));
console.log('CANONICAL MEDIA AUTHORITY GENERATOR');
console.log('='.repeat(80));

// Load current authorities
const mediaAuthority = loadJSON(path.join(ROOT, 'src/config/media.v1.json'));
const projectsAuthority = loadJSON(path.join(ROOT, 'src/config/projects.v1.json'));

console.log(`\nLoaded ${mediaAuthority.media.length} media records`);
console.log(`Loaded ${projectsAuthority.projects.length} projects`);

// Group by content hash
const hashGroups = {};
for (const media of mediaAuthority.media) {
  const hash = media.contentHash;
  if (!hashGroups[hash]) {
    hashGroups[hash] = [];
  }
  hashGroups[hash].push(media);
}

console.log(`\nGrouped into ${Object.keys(hashGroups).length} unique content hashes`);

// Identify canonical representatives
const canonicalMap = new Map(); // old ID -> canonical ID
const canonicalAssets = [];
const duplicateIds = new Set();

for (const [hash, group] of Object.entries(hashGroups)) {
  if (group.length === 1) {
    // Single record - it's already canonical
    canonicalMap.set(group[0].id, group[0].id);
    canonicalAssets.push(group[0]);
  } else {
    // Multiple records with same content - select canonical representative
    console.log(`\nDuplicate content hash group (${group.length} records):`);
    group.forEach(m => console.log(`  - ${m.id} (${m.filename})`));
    
    // Select canonical: prefer heroEligible, then featured, then first
    const canonical = group.find(m => m.heroEligible) || 
                     group.find(m => m.featured) || 
                     group[0];
    
    console.log(`  → Canonical: ${canonical.id} (${canonical.filename})`);
    
    canonicalMap.set(canonical.id, canonical.id);
    canonicalAssets.push(canonical);
    
    // Mark others as duplicates
    for (const duplicate of group) {
      if (duplicate.id !== canonical.id) {
        canonicalMap.set(duplicate.id, canonical.id);
        duplicateIds.add(duplicate.id);
        console.log(`  → Duplicate: ${duplicate.id} → ${canonical.id}`);
      }
    }
  }
}

console.log(`\nIdentified ${duplicateIds.size} duplicate IDs`);
console.log(`Canonical assets: ${canonicalAssets.length}`);

// Update project references
console.log('\nUpdating project references...');
const updatedProjects = [];

for (const project of projectsAuthority.projects) {
  const updatedProject = { ...project };
  
  if (updatedProject.media) {
    // Update hero reference
    if (updatedProject.media.hero) {
      const canonicalId = canonicalMap.get(updatedProject.media.hero);
      if (canonicalId && canonicalId !== updatedProject.media.hero) {
        console.log(`  ${project.id}.hero: ${updatedProject.media.hero} → ${canonicalId}`);
        updatedProject.media.hero = canonicalId;
      }
    }
    
    // Update before reference
    if (updatedProject.media.before) {
      const canonicalId = canonicalMap.get(updatedProject.media.before);
      if (canonicalId && canonicalId !== updatedProject.media.before) {
        console.log(`  ${project.id}.before: ${updatedProject.media.before} → ${canonicalId}`);
        updatedProject.media.before = canonicalId;
      }
    }
    

    
    // Update gallery references
    if (updatedProject.media.gallery) {
      const updatedGallery = updatedProject.media.gallery.map(id => {
        const canonicalId = canonicalMap.get(id);
        if (canonicalId && canonicalId !== id) {
          console.log(`  ${project.id}.gallery: ${id} → ${canonicalId}`);
          return canonicalId;
        }
        return id;
      });
      // Remove duplicates from gallery
      updatedProject.media.gallery = [...new Set(updatedGallery)];
    }
  }
  
  updatedProjects.push(updatedProject);
}

// Save updated authorities
console.log('\nSaving updated authorities...');

const updatedMediaAuthority = {
  ...mediaAuthority,
  media: canonicalAssets,
  generatedAt: new Date().toISOString()
};

const updatedProjectsAuthority = {
  ...projectsAuthority,
  projects: updatedProjects,
  generatedAt: new Date().toISOString()
};

// Backup current files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(
  path.join(ROOT, 'src/config/media.v1.json'),
  path.join(ROOT, 'src/config/media.v1.json.backup.' + timestamp)
);
fs.copyFileSync(
  path.join(ROOT, 'src/config/projects.v1.json'),
  path.join(ROOT, 'src/config/projects.v1.json.backup.' + timestamp)
);

saveJSON(path.join(ROOT, 'src/config/media.v1.json'), updatedMediaAuthority);
saveJSON(path.join(ROOT, 'src/config/projects.v1.json'), updatedProjectsAuthority);

console.log(`\n✓ Media authority: ${mediaAuthority.media.length} → ${canonicalAssets.length} records`);
console.log(`✓ Projects authority: ${projectsAuthority.projects.length} projects updated`);
console.log(`✓ Duplicates removed: ${duplicateIds.size}`);
console.log(`✓ Backups created with timestamp: ${timestamp}`);

console.log('\n' + '='.repeat(80));
console.log('CANONICALIZATION COMPLETE');
console.log('='.repeat(80));
console.log('\nNext steps:');
console.log('1. Review the changes in media.v1.json and projects.v1.json');
console.log('2. Regenerate projections: node scripts/regenerate-gallery-projection.mjs');
console.log('3. Run build to verify: npm run build');
console.log('4. Test locally: npm run dev');
console.log('5. Commit if verified');
