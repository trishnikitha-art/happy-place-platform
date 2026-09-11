/**
 * Static Media Test
 *
 * Tests if static media files exist and can be accessed.
 * This verifies the physical file layer.
 *
 * Usage:
 *   node src/scripts/test-static-media.mjs
 */

const fs = await import('fs');
const path = await import('path');

const TEST_MEDIA = [
  {
    id: 'fences-001-hero',
    path: '/images/projects/fences/FENCE BUILD-1080.webp',
  },
  {
    id: 'homepage-hero',
    path: '/images/hero-background-enhanced.jpg',
  },
  {
    id: 'brand-portrait',
    path: '/images/projects/portrait/portrait-480.webp',
  },
];

async function testStaticMedia() {
  console.log('[TEST] Starting static media test...\n');

  const publicDir = path.join(process.cwd(), 'public');

  for (const media of TEST_MEDIA) {
    console.log(`[TEST] Testing media ID: ${media.id}`);
    console.log(`[TEST] Expected path: ${media.path}`);
    
    const fullPath = path.join(publicDir, media.path);
    
    try {
      const exists = fs.existsSync(fullPath);
      
      if (exists) {
        const stats = fs.statSync(fullPath);
        console.log(`[TEST] ✅ File exists`);
        console.log(`[TEST] Size: ${stats.size} bytes`);
      } else {
        console.log(`[TEST] ❌ File does not exist`);
      }
    } catch (error) {
      console.error(`[TEST] ❌ Error checking file:`, error.message);
    }
    
    console.log('');
  }

  console.log('[TEST] Test complete');
}

testStaticMedia().catch(error => {
  console.error('[TEST] Unhandled error:', error);
  process.exit(1);
});
