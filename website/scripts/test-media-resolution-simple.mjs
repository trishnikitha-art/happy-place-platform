#!/usr/bin/env node

/**
 * Test Media Resolution During Static Build
 * 
 * This script tests that static media resolution works correctly.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load media manifest
const mediaPath = join(__dirname, '../src/config/media.v1.json');
const media = JSON.parse(readFileSync(mediaPath, 'utf-8'));

// Test that brand media exists
const brandHero = media.media.find(m => m.id === 'brand-hero');
const brandPortrait = media.media.find(m => m.id === 'brand-portrait');
const fencesHero = media.media.find(m => m.id === 'fences-001-hero');
const paintingMedia = media.media.find(m => m.id === 'outdoor-living-001-3');

console.log('Testing static media resolution...\n');

console.log('brand-hero:', brandHero ? 'EXISTS' : 'MISSING');
if (brandHero) {
  console.log('  Variant web:', brandHero.variants.web);
  console.log('  Storage:', brandHero.storage);
  console.log('  Lifecycle:', brandHero.lifecycleState);
}
console.log();

console.log('brand-portrait:', brandPortrait ? 'EXISTS' : 'MISSING');
if (brandPortrait) {
  console.log('  Variant web:', brandPortrait.variants.web);
  console.log('  Storage:', brandPortrait.storage);
  console.log('  Lifecycle:', brandPortrait.lifecycleState);
}
console.log();

console.log('fences-001-hero:', fencesHero ? 'EXISTS' : 'MISSING');
if (fencesHero) {
  console.log('  Variant web:', fencesHero.variants.web);
  console.log('  Storage:', fencesHero.storage);
  console.log('  Lifecycle:', fencesHero.lifecycleState);
}
console.log();

console.log('outdoor-living-001-3:', paintingMedia ? 'EXISTS' : 'MISSING');
if (paintingMedia) {
  console.log('  Variant web:', paintingMedia.variants.web);
  console.log('  Storage:', paintingMedia.storage);
  console.log('  Lifecycle:', paintingMedia.lifecycleState);
}
console.log();

const successCount = [brandHero, brandPortrait, fencesHero, paintingMedia].filter(m => m !== undefined).length;
console.log(`Summary: ${successCount}/4 media records exist in static authority`);