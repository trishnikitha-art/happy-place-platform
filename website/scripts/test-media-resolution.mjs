#!/usr/bin/env node

/**
 * Test Media Resolution During Static Build
 * 
 * This script tests that resolvePublicMedia works correctly during static build
 * by simulating the build environment and verifying media resolution.
 */

import { resolvePublicMedia } from '../src/lib/media.ts';

// Simulate static build mode
process.env.NEXT_PHASE = 'build';

async function testMediaResolution() {
  console.log('Testing media resolution during static build...\n');

  // Test brand hero
  console.log('Testing brand-hero...');
  const heroMedia = await resolvePublicMedia('brand-hero');
  console.log('brand-hero resolution:', heroMedia ? 'SUCCESS' : 'FAILED');
  if (heroMedia) {
    console.log('  Media ID:', heroMedia.id);
    console.log('  Variant web:', heroMedia.variants.web);
    console.log('  Storage:', heroMedia.storage);
  }
  console.log();

  // Test brand portrait
  console.log('Testing brand-portrait...');
  const portraitMedia = await resolvePublicMedia('brand-portrait');
  console.log('brand-portrait resolution:', portraitMedia ? 'SUCCESS' : 'FAILED');
  if (portraitMedia) {
    console.log('  Media ID:', portraitMedia.id);
    console.log('  Variant web:', portraitMedia.variants.web);
    console.log('  Storage:', portraitMedia.storage);
  }
  console.log();

  // Test service card media
  console.log('Testing fences-001-hero...');
  const fencesMedia = await resolvePublicMedia('fences-001-hero');
  console.log('fences-001-hero resolution:', fencesMedia ? 'SUCCESS' : 'FAILED');
  if (fencesMedia) {
    console.log('  Media ID:', fencesMedia.id);
    console.log('  Variant web:', fencesMedia.variants.web);
    console.log('  Storage:', fencesMedia.storage);
  }
  console.log();

  // Test painting media
  console.log('Testing outdoor-living-001-3...');
  const paintingMedia = await resolvePublicMedia('outdoor-living-001-3');
  console.log('outdoor-living-001-3 resolution:', paintingMedia ? 'SUCCESS' : 'FAILED');
  if (paintingMedia) {
    console.log('  Media ID:', paintingMedia.id);
    console.log('  Variant web:', paintingMedia.variants.web);
    console.log('  Storage:', paintingMedia.storage);
  }
  console.log();

  // Summary
  const successCount = [heroMedia, portraitMedia, fencesMedia, paintingMedia].filter(m => m !== null).length;
  console.log(`Summary: ${successCount}/4 media resolutions successful`);
}

testMediaResolution().catch(console.error);