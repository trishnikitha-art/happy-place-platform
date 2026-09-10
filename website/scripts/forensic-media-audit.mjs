#!/usr/bin/env node

/**
 * Forensic Media Pipeline Audit
 * 
 * Comprehensive end-to-end trace of the media system:
 * Source media → canonical identity → media.v1.json → authority → projections → resolvePublicMedia → components → browser
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

function checkFileExists(filePath) {
  try {
    return fs.existsSync(path.join(ROOT, 'public', filePath));
  } catch {
    return false;
  }
}

console.log('='.repeat(80));
console.log('FORENSIC MEDIA PIPELINE AUDIT');
console.log('='.repeat(80));

// 1. Load media authority
console.log('\n[1] MEDIA AUTHORITY (media.v1.json)');
const mediaAuthority = loadJSON(path.join(ROOT, 'src/config/media.v1.json'));
console.log(`Total records: ${mediaAuthority.media.length}`);
console.log('Lifecycle states:', mediaAuthority.media.reduce((acc, m) => {
  acc[m.lifecycleState] = (acc[m.lifecycleState] || 0) + 1;
  return acc;
}, {}));
console.log('Storage types:', mediaAuthority.media.reduce((acc, m) => {
  acc[m.storage] = (acc[m.storage] || 0) + 1;
  return acc;
}, {}));
console.log('Sources:', mediaAuthority.media.reduce((acc, m) => {
  acc[m.source] = (acc[m.source] || 0) + 1;
  return acc;
}, {}));

// 2. Check physical file existence
console.log('\n[2] PHYSICAL FILE EXISTENCE AUDIT');
const fileCheckResults = [];
for (const media of mediaAuthority.media) {
  const webPath = media.variants?.web || media.variants?.original;
  const exists = checkFileExists(webPath);
  fileCheckResults.push({
    id: media.id,
    filename: media.filename,
    webPath,
    exists
  });
}

const missingFiles = fileCheckResults.filter(r => !r.exists);
console.log(`Files checked: ${fileCheckResults.length}`);
console.log(`Missing files: ${missingFiles.length}`);
if (missingFiles.length > 0) {
  console.log('\nMISSING FILES:');
  missingFiles.forEach(f => {
    console.log(`  ${f.id} (${f.filename}): ${f.webPath}`);
  });
}

// 3. Brand authority audit
console.log('\n[3] BRAND AUTHORITY (brand.v1.json)');
const brandAuthority = loadJSON(path.join(ROOT, 'src/config/brand.v1.json'));
console.log('Homepage hero:', {
  id: brandAuthority.homepageHero.id,
  mediaId: brandAuthority.homepageHero.mediaId
});
console.log('Owner portrait:', {
  id: brandAuthority.ownerPortrait.id,
  mediaId: brandAuthority.ownerPortrait.mediaId
});

// 4. Check if brand media IDs resolve in media authority
console.log('\n[4] BRAND MEDIA RESOLUTION');
const heroMediaRecord = mediaAuthority.media.find(m => m.id === brandAuthority.homepageHero.mediaId);
const portraitMediaRecord = mediaAuthority.media.find(m => m.id === brandAuthority.ownerPortrait.mediaId);

console.log('Hero media record:', heroMediaRecord ? {
  id: heroMediaRecord.id,
  filename: heroMediaRecord.filename,
  storage: heroMediaRecord.storage,
  lifecycleState: heroMediaRecord.lifecycleState
} : 'NOT FOUND');

console.log('Portrait media record:', portraitMediaRecord ? {
  id: portraitMediaRecord.id,
  filename: portraitMediaRecord.filename,
  storage: portraitMediaRecord.storage,
  lifecycleState: portraitMediaRecord.lifecycleState
} : 'NOT FOUND');

// 5. Projects authority audit
console.log('\n[5] PROJECTS AUTHORITY (projects.v1.json)');
const projectsAuthority = loadJSON(path.join(ROOT, 'src/config/projects.v1.json'));
console.log(`Total projects: ${projectsAuthority.projects.length}`);
console.log(`Projects with media: ${projectsAuthority.projects.filter(p => p.media && (p.media.hero || p.media.gallery?.length)).length}`);
console.log(`Featured projects: ${projectsAuthority.projects.filter(p => p.featured).length}`);
console.log(`Archived projects: ${projectsAuthority.projects.filter(p => p.archived).length}`);

// 6. Check project media resolution
console.log('\n[6] PROJECT MEDIA RESOLUTION');
const projectMediaIssues = [];
for (const project of projectsAuthority.projects) {
  if (project.media) {
    if (project.media.hero) {
      const heroRecord = mediaAuthority.media.find(m => m.id === project.media.hero);
      if (!heroRecord) {
        projectMediaIssues.push({
          projectId: project.id,
          type: 'hero',
          mediaId: project.media.hero,
          issue: 'record not found in media authority'
        });
      }
    }
    if (project.media.gallery) {
      for (const galleryId of project.media.gallery) {
        const galleryRecord = mediaAuthority.media.find(m => m.id === galleryId);
        if (!galleryRecord) {
          projectMediaIssues.push({
            projectId: project.id,
            type: 'gallery',
            mediaId: galleryId,
            issue: 'record not found in media authority'
          });
        }
      }
    }
  }
}

console.log(`Project media issues: ${projectMediaIssues.length}`);
if (projectMediaIssues.length > 0) {
  console.log('\nPROJECT MEDIA ISSUES:');
  projectMediaIssues.forEach(issue => {
    console.log(`  ${issue.projectId} (${issue.type}): ${issue.mediaId} - ${issue.issue}`);
  });
}

// 7. Check for variant explosion
console.log('\n[7] VARIANT EXPLOSION ANALYSIS');
const mediaByContentHash = {};
for (const media of mediaAuthority.media) {
  const hash = media.contentHash;
  if (!mediaByContentHash[hash]) {
    mediaByContentHash[hash] = [];
  }
  mediaByContentHash[hash].push(media);
}

const duplicateHashGroups = Object.values(mediaByContentHash).filter(group => group.length > 1);
console.log(`Unique content hashes: ${Object.keys(mediaByContentHash).length}`);
console.log(`Duplicate content hash groups: ${duplicateHashGroups.length}`);

if (duplicateHashGroups.length > 0) {
  console.log('\nDUPLICATE CONTENT HASH GROUPS:');
  duplicateHashGroups.forEach(group => {
    console.log(`  Hash: ${group[0].contentHash.substring(0, 16)}...`);
    group.forEach(m => {
      console.log(`    - ${m.id} (${m.filename})`);
    });
  });
}

// 8. Analyze variant patterns
console.log('\n[8] VARIANT PATTERN ANALYSIS');
const filenamePatterns = {};
for (const media of mediaAuthority.media) {
  const baseName = media.filename.replace(/\.\w+$/, ''); // remove extension
  if (!filenamePatterns[baseName]) {
    filenamePatterns[baseName] = [];
  }
  filenamePatterns[baseName].push(media);
}

const explodedFiles = Object.values(filenamePatterns).filter(group => group.length > 1);
console.log(`Unique base filenames: ${Object.keys(filenamePatterns).length}`);
console.log(`Exploded filename groups: ${explodedFiles.length}`);

if (explodedFiles.length > 0) {
  console.log('\nEXPLODED FILENAME GROUPS:');
  explodedFiles.forEach(group => {
    console.log(`  Base: ${group[0].filename.replace(/\.\w+$/, '')}`);
    group.forEach(m => {
      console.log(`    - ${m.id} (${m.filename})`);
    });
  });
}

// 9. Projection audit
console.log('\n[9] PROJECTION AUDIT');
const heroProjection = loadJSON(path.join(ROOT, '.generated/hero-projection.json'));
const galleryProjection = loadJSON(path.join(ROOT, '.generated/gallery-projection.json'));
const serviceProjection = loadJSON(path.join(ROOT, '.generated/service-projection.json'));

console.log('Hero projection:', {
  heroMediaId: heroProjection.hero?.heroMediaId,
  filename: heroProjection.hero?.filename
});

console.log('Gallery projection:', {
  projectCount: galleryProjection.projects?.length || 0
});

console.log('Service projection:', {
  serviceCount: serviceProjection.services?.length || 0
});

// 10. Check projection ID mapping
console.log('\n[10] PROJECTION ID MAPPING ISSUES');
const projectionIssues = [];

// Check hero projection
if (heroProjection.hero?.heroMediaId) {
  const heroRecord = mediaAuthority.media.find(m => m.id === heroProjection.hero.heroMediaId);
  if (!heroRecord) {
    projectionIssues.push({
      type: 'hero',
      projectionId: heroProjection.hero.heroMediaId,
      issue: 'projection ID not found in media authority'
    });
  }
}

// Check gallery projection
if (galleryProjection.projects) {
  for (const project of galleryProjection.projects) {
    const repRecord = mediaAuthority.media.find(m => m.id === project.galleryRepresentative || m.data?.original_filename === project.galleryRepresentative);
    if (!repRecord) {
      projectionIssues.push({
        type: 'gallery',
        projectId: project.projectId,
        projectionId: project.galleryRepresentative,
        issue: 'projection ID not found in media authority'
      });
    }
  }
}

console.log(`Projection issues: ${projectionIssues.length}`);
if (projectionIssues.length > 0) {
  console.log('\nPROJECTION ISSUES:');
  projectionIssues.forEach(issue => {
    console.log(`  ${issue.type}: ${issue.projectionId} - ${issue.issue}`);
  });
}

// 11. Generate summary report
console.log('\n' + '='.repeat(80));
console.log('FORENSIC AUDIT SUMMARY');
console.log('='.repeat(80));
console.log(`Media authority records: ${mediaAuthority.media.length}`);
console.log(`Missing physical files: ${missingFiles.length}`);
console.log(`Project media resolution issues: ${projectMediaIssues.length}`);
console.log(`Duplicate content hash groups: ${duplicateHashGroups.length}`);
console.log(`Exploded filename groups: ${explodedFiles.length}`);
console.log(`Projection mapping issues: ${projectionIssues.length}`);

const totalIssues = missingFiles.length + projectMediaIssues.length + duplicateHashGroups.length + explodedFiles.length + projectionIssues.length;
console.log(`\nTOTAL ISSUES: ${totalIssues}`);

if (totalIssues === 0) {
  console.log('\n✅ No issues found in static media authority');
} else {
  console.log('\n⚠️  Issues found that require attention');
}
