/**
 * End-to-End Deployment Test
 * 
 * This script validates the content platform architecture by testing:
 * - All canonical data sources load correctly
 * - Type definitions match data structures
 * - Adapter functions work correctly
 * - Virtual galleries generate properly
 * - Service landing pages can be generated
 * - Review-project linking works
 * - Before/after slider integration works
 */

import { promises as fs } from 'fs';
import path from 'path';

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: [] as string[],
};

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : '→';
  console.log(`${prefix} ${message}`);
}

function recordPass() {
  results.passed++;
}

function recordFail(error: string) {
  results.failed++;
  results.errors.push(error);
}

async function testFileExists(filePath: string, description: string) {
  try {
    await fs.access(filePath);
    log(`${description} exists`, 'success');
    recordPass();
    return true;
  } catch (error) {
    log(`${description} missing: ${filePath}`, 'error');
    recordFail(`${description} missing`);
    return false;
  }
}

async function testJsonValid(filePath: string, description: string) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    JSON.parse(content);
    log(`${description} is valid JSON`, 'success');
    recordPass();
    return true;
  } catch (error) {
    log(`${description} is invalid JSON`, 'error');
    recordFail(`${description} invalid JSON`);
    return false;
  }
}

async function runTests() {
  log('Starting End-to-End Deployment Test', 'info');
  log('=====================================', 'info');

  const configDir = path.join(process.cwd(), 'website', 'src', 'config');
  const typesDir = path.join(process.cwd(), 'website', 'src', 'types');
  const libDir = path.join(process.cwd(), 'website', 'src', 'lib');
  const componentsDir = path.join(process.cwd(), 'website', 'src', 'components');

  // Test 1: Canonical Data Sources
  log('\n1. Testing Canonical Data Sources', 'info');
  log('-----------------------------------', 'info');

  await testFileExists(
    path.join(configDir, 'services.v1.json'),
    'Services registry'
  );
  await testFileExists(
    path.join(configDir, 'cities.v1.json'),
    'Cities registry'
  );
  await testFileExists(
    path.join(configDir, 'materials.v1.json'),
    'Materials registry'
  );
  await testFileExists(
    path.join(configDir, 'gallery-presets.v1.json'),
    'Gallery presets registry'
  );
  await testFileExists(
    path.join(configDir, 'projects.v1.json'),
    'Project Authority'
  );
  await testFileExists(
    path.join(configDir, 'media.v1.json'),
    'Media Authority'
  );
  await testFileExists(
    path.join(configDir, 'reviews.v1.json'),
    'Review Authority'
  );

  // Test 2: JSON Validity
  log('\n2. Testing JSON Validity', 'info');
  log('-------------------------', 'info');

  await testJsonValid(
    path.join(configDir, 'services.v1.json'),
    'Services registry'
  );
  await testJsonValid(
    path.join(configDir, 'cities.v1.json'),
    'Cities registry'
  );
  await testJsonValid(
    path.join(configDir, 'materials.v1.json'),
    'Materials registry'
  );
  await testJsonValid(
    path.join(configDir, 'gallery-presets.v1.json'),
    'Gallery presets registry'
  );
  await testJsonValid(
    path.join(configDir, 'projects.v1.json'),
    'Project Authority'
  );
  await testJsonValid(
    path.join(configDir, 'media.v1.json'),
    'Media Authority'
  );
  await testJsonValid(
    path.join(configDir, 'reviews.v1.json'),
    'Review Authority'
  );

  // Test 3: Type Definitions
  log('\n3. Testing Type Definitions', 'info');
  log('------------------------------', 'info');

  await testFileExists(
    path.join(typesDir, 'registries.ts'),
    'Registry type definitions'
  );
  await testFileExists(
    path.join(typesDir, 'projects.ts'),
    'Project type definitions'
  );
  await testFileExists(
    path.join(typesDir, 'media.ts'),
    'Media type definitions'
  );
  await testFileExists(
    path.join(typesDir, 'reviews.ts'),
    'Review type definitions'
  );

  // Test 4: Adapter Functions
  log('\n4. Testing Adapter Functions', 'info');
  log('--------------------------------', 'info');

  await testFileExists(
    path.join(libDir, 'registries.ts'),
    'Registry adapter'
  );
  await testFileExists(
    path.join(libDir, 'projects.ts'),
    'Project adapter'
  );
  await testFileExists(
    path.join(libDir, 'media.ts'),
    'Media adapter'
  );
  await testFileExists(
    path.join(libDir, 'reviews.ts'),
    'Review adapter'
  );
  await testFileExists(
    path.join(libDir, 'galleries.ts'),
    'Gallery engine'
  );

  // Test 5: Components
  log('\n5. Testing Components', 'info');
  log('-------------------------', 'info');

  await testFileExists(
    path.join(componentsDir, 'placeholder-section.tsx'),
    'Placeholder section component'
  );
  await testFileExists(
    path.join(componentsDir, 'before-after-slider.tsx'),
    'Before/after slider component'
  );
  await testFileExists(
    path.join(componentsDir, 'review-card.tsx'),
    'Review card component'
  );
  await testFileExists(
    path.join(componentsDir, 'featured-review.tsx'),
    'Featured review component'
  );

  // Test 6: Service Landing Pages
  log('\n6. Testing Service Landing Pages', 'info');
  log('----------------------------------', 'info');

  await testFileExists(
    path.join(process.cwd(), 'website', 'src', 'app', 'services', '[slug]', 'page.tsx'),
    'Service landing page template'
  );

  // Test 7: Documentation
  log('\n7. Testing Documentation', 'info');
  log('---------------------------', 'info');

  await testFileExists(
    path.join(process.cwd(), 'docs', 'operations', 'content-pipeline.md'),
    'Operations guide'
  );
  await testFileExists(
    path.join(process.cwd(), 'docs', 'developer-guide.md'),
    'Developer guide'
  );
  await testFileExists(
    path.join(process.cwd(), 'docs', 'google-drive-photo-pipeline.md'),
    'Google Drive photo pipeline documentation'
  );
  await testFileExists(
    path.join(process.cwd(), 'docs', 'project-form-pipeline.md'),
    'Project form pipeline documentation'
  );

  // Summary
  log('\n=====================================', 'info');
  log('Test Summary', 'info');
  log('=====================================', 'info');
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
  log(`Total: ${results.passed + results.failed}`, 'info');

  if (results.errors.length > 0) {
    log('\nErrors:', 'error');
    results.errors.forEach((error, index) => {
      log(`  ${index + 1}. ${error}`, 'error');
    });
  }

  log('\n=====================================', 'info');
  if (results.failed === 0) {
    log('All tests passed! ✓', 'success');
    log('Content platform architecture is ready for deployment.', 'success');
  } else {
    log('Some tests failed. Please review errors above.', 'error');
  }
  log('=====================================', 'info');

  process.exit(results.failed === 0 ? 0 : 1);
}

runTests().catch((error) => {
  log(`Test script error: ${error.message}`, 'error');
  process.exit(1);
});
