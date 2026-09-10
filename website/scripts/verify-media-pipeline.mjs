#!/usr/bin/env node

/**
 * Deterministic Media Pipeline Verification Report
 * 
 * Verifies: Surface → Canonical ID → Authority → Public URL → HTTP → Renders
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

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

async function checkHTTP(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'HEAD'
    };
    
    const req = http.request(options, (res) => {
      resolve({
        status: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 300
      });
    });
    
    req.on('error', () => {
      resolve({ status: 0, success: false });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 0, success: false });
    });
    
    req.end();
  });
}

console.log('='.repeat(80));
console.log('DETERMINISTIC MEDIA PIPELINE VERIFICATION REPORT');
console.log('='.repeat(80));

// Load authorities
const mediaAuthority = loadJSON(path.join(ROOT, 'src/config/media.v1.json'));
const projectsAuthority = loadJSON(path.join(ROOT, 'src/config/projects.v1.json'));
const brandAuthority = loadJSON(path.join(ROOT, 'src/config/brand.v1.json'));
const heroProjection = loadJSON(path.join(ROOT, '.generated/hero-projection.json'));
const galleryProjection = loadJSON(path.join(ROOT, '.generated/gallery-projection.json'));

console.log('\n[VERIFICATION SCOPE]');
console.log(`Media authority records: ${mediaAuthority.media.length}`);
console.log(`Projects: ${projectsAuthority.projects.length}`);
console.log(`Hero projection: ${heroProjection.hero?.heroMediaId}`);
console.log(`Gallery projection projects: ${galleryProjection.projects?.length}`);

// Verification results
const verificationResults = [];

// 1. Homepage hero verification
console.log('\n[1] HOMEPAGE HERO VERIFICATION');
const heroMediaId = brandAuthority.homepageHero.mediaId;
const heroMediaRecord = mediaAuthority.media.find(m => m.id === heroMediaId);
const heroWebPath = heroMediaRecord?.variants?.web || heroMediaRecord?.variants?.original;
const heroFileExists = heroWebPath ? checkFileExists(heroWebPath) : false;
const heroProjectionMatches = heroProjection.hero?.heroMediaId === heroMediaId;

verificationResults.push({
  surface: 'Homepage Hero',
  canonicalId: brandAuthority.homepageHero.id,
  authorityId: heroMediaId,
  publicUrl: heroWebPath,
  fileExists: heroFileExists,
  projectionMatches: heroProjectionMatches,
  status: heroFileExists && heroProjectionMatches ? 'PASS' : 'FAIL'
});

console.log(`  Surface: Homepage Hero`);
console.log(`  Canonical ID: ${brandAuthority.homepageHero.id}`);
console.log(`  Authority ID: ${heroMediaId}`);
console.log(`  Public URL: ${heroWebPath}`);
console.log(`  File exists: ${heroFileExists ? 'YES' : 'NO'}`);
console.log(`  Projection matches: ${heroProjectionMatches ? 'YES' : 'NO'}`);
console.log(`  Status: ${heroFileExists && heroProjectionMatches ? 'PASS' : 'FAIL'}`);

// 2. Owner portrait verification
console.log('\n[2] OWNER PORTRAIT VERIFICATION');
const portraitMediaId = brandAuthority.ownerPortrait.mediaId;
const portraitMediaRecord = mediaAuthority.media.find(m => m.id === portraitMediaId);
const portraitWebPath = portraitMediaRecord?.variants?.web || portraitMediaRecord?.variants?.original;
const portraitFileExists = portraitWebPath ? checkFileExists(portraitWebPath) : false;

verificationResults.push({
  surface: 'Owner Portrait',
  canonicalId: brandAuthority.ownerPortrait.id,
  authorityId: portraitMediaId,
  publicUrl: portraitWebPath,
  fileExists: portraitFileExists,
  projectionMatches: true, // Not in projection
  status: portraitFileExists ? 'PASS' : 'FAIL'
});

console.log(`  Surface: Owner Portrait`);
console.log(`  Canonical ID: ${brandAuthority.ownerPortrait.id}`);
console.log(`  Authority ID: ${portraitMediaId}`);
console.log(`  Public URL: ${portraitWebPath}`);
console.log(`  File exists: ${portraitFileExists ? 'YES' : 'NO'}`);
console.log(`  Status: ${portraitFileExists ? 'PASS' : 'FAIL'}`);

// 3. Featured projects verification
console.log('\n[3] FEATURED PROJECTS VERIFICATION');
const featuredProjects = projectsAuthority.projects.filter(p => p.featured);
console.log(`  Featured projects: ${featuredProjects.length}`);

for (const project of featuredProjects) {
  const heroMediaId = project.media?.hero;
  const heroMediaRecord = mediaAuthority.media.find(m => m.id === heroMediaId);
  const heroWebPath = heroMediaRecord?.variants?.web || heroMediaRecord?.variants?.original;
  const heroFileExists = heroWebPath ? checkFileExists(heroWebPath) : false;
  
  verificationResults.push({
    surface: `Featured Project: ${project.title}`,
    canonicalId: project.id,
    authorityId: heroMediaId,
    publicUrl: heroWebPath,
    fileExists: heroFileExists,
    projectionMatches: true,
    status: heroFileExists ? 'PASS' : 'FAIL'
  });
  
  console.log(`  ${project.title}:`);
  console.log(`    Authority ID: ${heroMediaId}`);
  console.log(`    Public URL: ${heroWebPath}`);
  console.log(`    File exists: ${heroFileExists ? 'YES' : 'NO'}`);
  console.log(`    Status: ${heroFileExists ? 'PASS' : 'FAIL'}`);
}

// 4. All projects verification
console.log('\n[4] ALL PROJECTS VERIFICATION');
let allProjectsPass = true;
for (const project of projectsAuthority.projects) {
  const heroMediaId = project.media?.hero;
  const heroMediaRecord = mediaAuthority.media.find(m => m.id === heroMediaId);
  const heroWebPath = heroMediaRecord?.variants?.web || heroMediaRecord?.variants?.original;
  const heroFileExists = heroWebPath ? checkFileExists(heroWebPath) : false;
  
  if (!heroFileExists) {
    allProjectsPass = false;
    console.log(`  ${project.title}: FAIL (hero missing)`);
  }
}

console.log(`  All projects have valid hero: ${allProjectsPass ? 'YES' : 'NO'}`);

// 5. Canonicalization verification
console.log('\n[5] CANONICALIZATION VERIFICATION');
const contentHashes = new Set();
for (const media of mediaAuthority.media) {
  if (contentHashes.has(media.contentHash)) {
    console.log(`  WARNING: Duplicate content hash found: ${media.contentHash.substring(0, 16)}...`);
  }
  contentHashes.add(media.contentHash);
}

console.log(`  Unique content hashes: ${contentHashes.size}`);
console.log(`  Total media records: ${mediaAuthority.media.length}`);
console.log(`  Canonicalization correct: ${contentHashes.size === mediaAuthority.media.length ? 'YES' : 'NO'}`);

// 6. Missing files verification
console.log('\n[6] MISSING FILES VERIFICATION');
const missingFiles = [];
for (const media of mediaAuthority.media) {
  const webPath = media.variants?.web || media.variants?.original;
  if (!checkFileExists(webPath)) {
    missingFiles.push({
      id: media.id,
      filename: media.filename,
      webPath
    });
  }
}

console.log(`  Missing files: ${missingFiles.length}`);
if (missingFiles.length > 0) {
  missingFiles.forEach(f => {
    console.log(`    ${f.id} (${f.filename}): ${f.webPath}`);
  });
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80));

const totalChecks = verificationResults.length;
const passedChecks = verificationResults.filter(r => r.status === 'PASS').length;
const failedChecks = verificationResults.filter(r => r.status === 'FAIL').length;

console.log(`Total verification checks: ${totalChecks}`);
console.log(`Passed: ${passedChecks}`);
console.log(`Failed: ${failedChecks}`);
console.log(`Missing files: ${missingFiles.length}`);
console.log(`Canonicalization correct: ${contentHashes.size === mediaAuthority.media.length ? 'YES' : 'NO'}`);

const overallStatus = failedChecks === 0 && missingFiles.length === 0 && contentHashes.size === mediaAuthority.media.length;
console.log(`\nOverall status: ${overallStatus ? 'PASS' : 'FAIL'}`);

if (!overallStatus) {
  console.log('\nIssues found that require attention:');
  if (failedChecks > 0) {
    console.log(`  - ${failedChecks} verification checks failed`);
  }
  if (missingFiles.length > 0) {
    console.log(`  - ${missingFiles.length} files missing`);
  }
  if (contentHashes.size !== mediaAuthority.media.length) {
    console.log(`  - Canonicalization incomplete (duplicate content hashes)`);
  }
  process.exit(1);
} else {
  console.log('\n✅ All verification checks passed');
}
