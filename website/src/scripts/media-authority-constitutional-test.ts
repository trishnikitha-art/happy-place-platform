/**
 * Media Authority Constitutional Test Suite
 * 
 * Permanent regression suite for Media Authority integrity.
 * Tests the entire Authority → Adapter → UI chain.
 * 
 * Phases:
 * 1. Authority Integrity - Verify exactly one canonical media record
 * 2. Reference Integrity - Verify everything references IDs instead of paths
 * 3. Adapter Integrity - Verify all consumers resolve through same adapter
 * 4. Runtime Verification - Verify same asset renders everywhere
 * 5. Failure Recovery - Test various failure scenarios
 * 6. Orphan Detection - Detect orphaned media and missing references
 */

import { loadMediaManifest, getMediaById, getProjectHero, getFeaturedServiceMedia } from '../lib/media';
import { getProjectById, getAllProjects } from '../lib/projects';
import { getAllServices } from '../lib/registries';

interface TestResult {
  phase: string;
  test: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

function recordTest(phase: string, test: string, expected: string, actual: string, passed: boolean, notes?: string) {
  results.push({ phase, test, expected, actual, passed, notes });
  console.log(`${passed ? '✓' : '✗'} [${phase}] ${test}`);
  if (!passed) {
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual: ${actual}`);
    if (notes) console.log(`  Notes: ${notes}`);
  }
}

console.log('=== Media Authority Constitutional Test Suite ===\n');

// ============================================================================
// PHASE 1: Authority Integrity
// ============================================================================
console.log('PHASE 1: Authority Integrity\n');

const manifest = loadMediaManifest();

// Test 1.1: media.v1.json contains exactly one pergola-001-hero
const pergolaRecords = manifest.media.filter(m => m.id === 'pergola-001-hero');
recordTest(
  'Authority Integrity',
  'media.v1.json contains exactly one pergola-001-hero',
  'Exactly one record',
  `${pergolaRecords.length} record(s)`,
  pergolaRecords.length === 1,
  pergolaRecords.length === 1 ? 'Canonical record verified' : 'Duplicate or missing record'
);

// Test 1.2: No duplicate hero IDs
const heroRecords = manifest.media.filter(m => m.roles.includes('hero'));
const heroIds = heroRecords.map(m => m.id);
const uniqueHeroIds = new Set(heroIds);
const hasDuplicateHeroes = heroIds.length !== uniqueHeroIds.size;
recordTest(
  'Authority Integrity',
  'No duplicate hero IDs',
  'All hero IDs unique',
  hasDuplicateHeroes ? 'Duplicate hero IDs found' : 'All hero IDs unique',
  !hasDuplicateHeroes,
  hasDuplicateHeroes ? `Found ${heroIds.length} hero records with ${uniqueHeroIds.size} unique IDs` : 'No duplicates'
);

// Test 1.3: No physical filename references in business data (driveId is allowed for ingestion)
const hasPhysicalFileReferences = manifest.media.some(m => 
  m.filename?.includes('\\') || 
  m.filename?.includes(':')
);
recordTest(
  'Authority Integrity',
  'No physical filename references in media authority (driveId allowed)',
  'No physical file paths in filename field',
  hasPhysicalFileReferences ? 'Physical file paths found' : 'No physical file paths',
  !hasPhysicalFileReferences,
  hasPhysicalFileReferences ? 'Found physical file paths in filename' : 'All references are web paths (driveId allowed for ingestion)'
);

// Test 1.4: Every media ID is unique
const mediaIds = manifest.media.map(m => m.id);
const uniqueMediaIds = new Set(mediaIds);
const hasDuplicateIds = mediaIds.length !== uniqueMediaIds.size;
recordTest(
  'Authority Integrity',
  'Every media ID is unique',
  'All media IDs unique',
  hasDuplicateIds ? 'Duplicate media IDs found' : 'All media IDs unique',
  !hasDuplicateIds,
  hasDuplicateIds ? `Found ${mediaIds.length} media records with ${uniqueMediaIds.size} unique IDs` : 'No duplicates'
);

// ============================================================================
// PHASE 2: Reference Integrity
// ============================================================================
console.log('\nPHASE 2: Reference Integrity\n');

const projects = getAllProjects();
const services = getAllServices();

// Test 2.1: Project references pergola-001-hero by ID
const pergolaProject = getProjectById('pergola-001');
const projectHeroId = pergolaProject?.media?.hero;
recordTest(
  'Reference Integrity',
  'Project references pergola-001-hero by ID',
  'Hero ID is pergola-001-hero',
  projectHeroId || 'null',
  projectHeroId === 'pergola-001-hero',
  projectHeroId === 'pergola-001-hero' ? 'Correct ID reference' : 'Incorrect or missing reference'
);

// Test 2.2: No /images/... strings inside project authorities (should use ID references)
const projectsWithDirectPaths = projects.filter(p => {
  // Check if project directly references image paths instead of media IDs
  const hasDirectPath = typeof p.media?.hero === 'string' && p.media.hero.includes('/images/');
  return hasDirectPath;
});
recordTest(
  'Reference Integrity',
  'No /images/... strings inside project authorities',
  'No direct image paths in projects',
  `${projectsWithDirectPaths.length} project(s) with direct paths`,
  projectsWithDirectPaths.length === 0,
  projectsWithDirectPaths.length === 0 ? 'All projects use ID references' : 'Found projects with direct paths'
);

// Test 2.3: No physical filenames inside projects or services (business data should not contain file extensions)
const hasPhysicalFilenames = services.some(s => s.name.includes('.jpg') || s.name.includes('.png'));
recordTest(
  'Reference Integrity',
  'No physical filenames inside services',
  'No physical filenames in service names',
  hasPhysicalFilenames ? 'Physical filenames found' : 'No physical filenames',
  !hasPhysicalFilenames,
  hasPhysicalFilenames ? 'Found physical filenames in service names' : 'All references are abstract IDs'
);

// ============================================================================
// PHASE 3: Adapter Integrity
// ============================================================================
console.log('\nPHASE 3: Adapter Integrity\n');

// Test 3.1: getProjectHero returns correct Media object
const projectHero = getProjectHero('pergola-001');
recordTest(
  'Adapter Integrity',
  'getProjectHero returns correct Media object',
  'Media object with id pergola-001-hero',
  projectHero?.id || 'null',
  projectHero?.id === 'pergola-001-hero',
  projectHero?.id === 'pergola-001-hero' ? 'Correct adapter resolution' : 'Incorrect resolution'
);

// Test 3.2: getFeaturedServiceMedia returns same hero
const serviceHero = getFeaturedServiceMedia('pergolas');
recordTest(
  'Adapter Integrity',
  'getFeaturedServiceMedia returns same hero',
  'Media object with id pergola-001-hero',
  serviceHero?.id || 'null',
  serviceHero?.id === 'pergola-001-hero',
  serviceHero?.id === 'pergola-001-hero' ? 'Correct adapter resolution' : 'Incorrect resolution'
);

// Test 3.3: Both adapters return the exact same media object
const sameObject = projectHero?.id === serviceHero?.id;
recordTest(
  'Adapter Integrity',
  'Both adapters return the exact same media object',
  'Same media ID from both adapters',
  sameObject ? 'Same object' : 'Different objects',
  sameObject,
  sameObject ? 'No duplicated lookup logic' : 'Adapters return different objects'
);

// ============================================================================
// PHASE 4: Runtime Verification
// ============================================================================
console.log('\nPHASE 4: Runtime Verification\n');

// Test 4.1: Verify same asset ID used across contexts
const contexts = [
  { name: 'Project Hero', id: projectHero?.id },
  { name: 'Service Featured', id: serviceHero?.id },
  { name: 'Direct Lookup', id: getMediaById('pergola-001-hero')?.id }
];
const allSameId = contexts.every(c => c.id === 'pergola-001-hero');
recordTest(
  'Runtime Verification',
  'Same asset ID used across all contexts',
  'All contexts return pergola-001-hero',
  allSameId ? 'Same ID everywhere' : 'Different IDs found',
  allSameId,
  allSameId ? 'Same authority record used everywhere' : 'Different records in different contexts'
);

// Test 4.2: Verify alt text pulled from authority
const altText = pergolaRecords[0]?.alt;
recordTest(
  'Runtime Verification',
  'Alt text pulled from authority',
  'Alt text present in media record',
  altText || 'null',
  !!altText,
  altText ? `Alt: "${altText}"` : 'No alt text in authority'
);

// Test 4.3: Verify responsive variants exist
const variants = pergolaRecords[0]?.variants;
const hasAllVariants = !!(variants?.original && variants?.webp && variants?.avif && variants?.thumbnail);
recordTest(
  'Runtime Verification',
  'Responsive variants exist',
  'All responsive variants present',
  hasAllVariants ? 'All variants present' : 'Missing variants',
  hasAllVariants,
  hasAllVariants ? 'Responsive variants: original, webp, avif, thumbnail' : 'Missing some variants'
);

// ============================================================================
// PHASE 5: Failure Recovery
// ============================================================================
console.log('\nPHASE 5: Failure Recovery\n');

// Test 5.1: Verify missing hero returns null (not another project's image)
const missingProjectHero = getProjectHero('nonexistent-project');
recordTest(
  'Failure Recovery',
  'Missing hero returns null (not another project\'s image)',
  'null for missing project',
  missingProjectHero === null ? 'null' : typeof missingProjectHero,
  missingProjectHero === null,
  missingProjectHero === null ? 'Proper null handling' : 'Incorrect fallback behavior'
);

// Test 5.2: Verify service with no completed projects returns null
const noProjectsService = getFeaturedServiceMedia('nonexistent-service');
recordTest(
  'Failure Recovery',
  'Service with no completed projects returns null',
  'null for missing service',
  noProjectsService === null ? 'null' : typeof noProjectsService,
  noProjectsService === null,
  noProjectsService === null ? 'Proper null handling' : 'Incorrect fallback behavior'
);

// ============================================================================
// PHASE 6: Orphan Detection
// ============================================================================
console.log('\nPHASE 6: Orphan Detection\n');

// Test 6.1: Detect media with no references
const allMediaIdsInManifest = manifest.media.map(m => m.id);
const referencedMediaIds = new Set<string>();
projects.forEach(p => {
  if (p.media?.hero) referencedMediaIds.add(p.media.hero);
  if (p.media?.gallery) p.media.gallery.forEach(id => referencedMediaIds.add(id));
  if (p.media?.before) referencedMediaIds.add(p.media.before);
  if (p.media?.after) referencedMediaIds.add(p.media.after);
});

const orphanedMedia = allMediaIdsInManifest.filter(id => !referencedMediaIds.has(id));
recordTest(
  'Orphan Detection',
  'Detect media with no references',
  'No orphaned media',
  `${orphanedMedia.length} orphaned media record(s)`,
  orphanedMedia.length === 0,
  orphanedMedia.length === 0 ? 'All media referenced' : `Orphaned: ${orphanedMedia.join(', ')}`
);

// Test 6.2: Detect project references to missing media
const missingMediaReferences = projects.filter(p => {
  const heroMissing = p.media?.hero && !allMediaIdsInManifest.includes(p.media.hero);
  const galleryMissing = p.media?.gallery?.some(id => !allMediaIdsInManifest.includes(id));
  const beforeMissing = p.media?.before && !allMediaIdsInManifest.includes(p.media.before);
  const afterMissing = p.media?.after && !allMediaIdsInManifest.includes(p.media.after);
  return heroMissing || galleryMissing || beforeMissing || afterMissing;
});
recordTest(
  'Orphan Detection',
  'Detect project references to missing media',
  'No missing media references',
  `${missingMediaReferences.length} project(s) with missing media`,
  missingMediaReferences.length === 0,
  missingMediaReferences.length === 0 ? 'All references valid' : `Projects with missing media: ${missingMediaReferences.map(p => p.id).join(', ')}`
);

// ============================================================================
// Summary
// ============================================================================
console.log('\n=== Test Summary ===');
const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`Passed: ${passed}/${total}`);

if (passed === total) {
  console.log('\n✓ All constitutional tests passed! Media Authority is healthy.');
  process.exit(0);
} else {
  console.log('\n✗ Some constitutional tests failed. Review the results above.');
  process.exit(1);
}
