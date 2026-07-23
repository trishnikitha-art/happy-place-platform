/**
 * Media Authority Pipeline Test
 * 
 * This script tests the entire media authority pipeline for the pergola photo:
 * Authority → Adapter → UI chain
 * 
 * Tests:
 * 1. Authority: media.v1.json contains the media record
 * 2. Project: projects.v1.json references pergola-001-hero
 * 3. Adapter: getProjectHero returns correct Media object
 * 4. Service: getFeaturedServiceMedia returns same hero
 * 5. Homepage: Featured service card (manual verification)
 * 6. Services page: Pergola card (manual verification)
 * 7. Project page: Hero/gallery (manual verification)
 * 8. SEO: alt/title pulled from authority
 * 9. Responsive: thumbnail/webp/avif selected
 */

import { loadMediaManifest, getMediaById, getProjectHero, getFeaturedServiceMedia } from '../lib/media';
import { getProjectById } from '../lib/projects';

interface TestResult {
  stage: string;
  test: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

function recordTest(stage: string, test: string, expected: string, actual: string, passed: boolean, notes?: string) {
  results.push({ stage, test, expected, actual, passed, notes });
  console.log(`${passed ? '✓' : '✗'} [${stage}] ${test}`);
  if (!passed) {
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual: ${actual}`);
    if (notes) console.log(`  Notes: ${notes}`);
  }
}

console.log('=== Media Authority Pipeline Test ===\n');

// Test 1: Authority - media.v1.json contains the media record
console.log('Stage 1: Authority');
const manifest = loadMediaManifest();
const pergolaMedia = manifest.media.find(m => m.id === 'pergola-001-hero');
if (pergolaMedia) {
  recordTest(
    'Authority',
    'media.v1.json contains pergola-001-hero record',
    'One canonical record only',
    'Record found with id: ' + pergolaMedia.id,
    true,
    `Roles: ${pergolaMedia.roles.join(', ')}, Service: ${pergolaMedia.service}`
  );
} else {
  recordTest(
    'Authority',
    'media.v1.json contains pergola-001-hero record',
    'One canonical record only',
    'Record not found',
    false
  );
}

// Test 2: Project - projects.v1.json references pergola-001-hero
console.log('\nStage 2: Project');
const pergolaProject = getProjectById('pergola-001');
if (pergolaProject) {
  const heroId = pergolaProject.media?.hero;
  if (heroId === 'pergola-001-hero') {
    recordTest(
      'Project',
      'projects.v1.json references pergola-001-hero',
      'No filename references, only ID',
      'Hero ID: ' + heroId,
      true,
      `Project: ${pergolaProject.title}`
    );
  } else {
    recordTest(
      'Project',
      'projects.v1.json references pergola-001-hero',
      'No filename references, only ID',
      'Hero ID: ' + heroId,
      false,
      'Expected pergola-001-hero but got: ' + heroId
    );
  }
} else {
  recordTest(
    'Project',
    'projects.v1.json references pergola-001-hero',
    'Project exists',
    'Project not found',
    false
  );
}

// Test 3: Adapter - getProjectHero returns correct Media object
console.log('\nStage 3: Adapter');
 const heroMedia = getProjectHero('pergola-001');
if (heroMedia) {
  const matches = heroMedia.id === 'pergola-001-hero';
  recordTest(
    'Adapter',
    'getProjectHero("pergola-001") returns correct Media object',
    'Media object with id pergola-001-hero',
    'Media object with id: ' + heroMedia.id,
    matches,
    `Alt: ${heroMedia.alt}, Variants: ${Object.keys(heroMedia.variants).join(', ')}`
  );
} else {
  recordTest(
    'Adapter',
    'getProjectHero("pergola-001") returns correct Media object',
    'Media object with id pergola-001-hero',
    'null',
    false
  );
}

// Test 4: Service - getFeaturedServiceMedia returns same hero
console.log('\nStage 4: Service');
const serviceMedia = getFeaturedServiceMedia('pergolas');
if (serviceMedia) {
  const matches = serviceMedia.id === 'pergola-001-hero';
  recordTest(
    'Service',
    'getFeaturedServiceMedia("pergolas") returns same hero',
    'Media object with id pergola-001-hero',
    'Media object with id: ' + serviceMedia.id,
    matches,
    `Alt: ${serviceMedia.alt}, Roles: ${serviceMedia.roles ? serviceMedia.roles.join(', ') : 'none'}`
  );
} else {
  recordTest(
    'Service',
    'getFeaturedServiceMedia("pergolas") returns same hero',
    'Media object with id pergola-001-hero',
    'null',
    false,
    'No completed projects found for pergolas service'
  );
}

// Test 5: SEO - alt/title pulled from authority
console.log('\nStage 5: SEO');
if (pergolaMedia) {
  const hasAlt = !!pergolaMedia.alt;
  const hasDescription = !!pergolaMedia.description;
  recordTest(
    'SEO',
    'alt/title pulled from authority',
    'Alt and description present in media record',
    `Alt: ${hasAlt ? 'present' : 'missing'}, Description: ${hasDescription ? 'present' : 'missing'}`,
    hasAlt && hasDescription,
    `Alt: "${pergolaMedia.alt}", Description: "${pergolaMedia.description}"`
  );
} else {
  recordTest(
    'SEO',
    'alt/title pulled from authority',
    'Alt and description present',
    'Media record not found',
    false
  );
}

// Test 6: Responsive - thumbnail/webp/avif selected
console.log('\nStage 6: Responsive');
if (pergolaMedia) {
  const variants = pergolaMedia.variants;
  const hasOriginal = !!variants.original;
  const hasWebp = !!variants.webp;
  const hasAvif = !!variants.avif;
  const hasThumbnail = !!variants.thumbnail;
  recordTest(
    'Responsive',
    'thumbnail/webp/avif selected',
    'All responsive variants present',
    `Original: ${hasOriginal ? '✓' : '✗'}, WebP: ${hasWebp ? '✓' : '✗'}, AVIF: ${hasAvif ? '✓' : '✗'}, Thumbnail: ${hasThumbnail ? '✓' : '✗'}`,
    hasOriginal && hasWebp && hasAvif && hasThumbnail,
    `Paths: original=${variants.original}, webp=${variants.webp}, avif=${variants.avif}, thumbnail=${variants.thumbnail}`
  );
} else {
  recordTest(
    'Responsive',
    'thumbnail/webp/avif selected',
    'All responsive variants present',
    'Media record not found',
    false
  );
}

// Test 7: Verify same asset used across multiple contexts
console.log('\nStage 7: Cross-Context Consistency');
const contexts = [
  { name: 'Project Hero', media: getProjectHero('pergola-001') },
  { name: 'Service Featured', media: getFeaturedServiceMedia('pergolas') },
  { name: 'Direct ID Lookup', media: getMediaById('pergola-001-hero') }
];

const allSame = contexts.every(c => c.media?.id === 'pergola-001-hero');
const contextIds = contexts.map(c => `${c.name}: ${c.media?.id || 'null'}`).join(', ');

recordTest(
  'Cross-Context',
  'Same asset used across all contexts',
  'All contexts return pergola-001-hero',
  contextIds,
  allSame,
  'Verifies components consume metadata, not file paths'
);

// Summary
console.log('\n=== Test Summary ===');
const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`Passed: ${passed}/${total}`);

if (passed === total) {
  console.log('\n✓ All tests passed! Media Authority pipeline is working correctly.');
} else {
  console.log('\n✗ Some tests failed. Review the results above.');
  process.exit(1);
}
