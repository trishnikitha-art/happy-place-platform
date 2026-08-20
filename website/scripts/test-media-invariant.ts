/**
 * Media Architecture Invariant Test
 * 
 * Tests the invariant: DriveReference X → materialization → PublishedMediaAsset → assignment → website
 * 
 * This test validates:
 * 1. DriveReference cannot directly enter public assignments
 * 2. Active assignment must resolve to PublishedMediaAsset
 * 3. PublishedMediaAsset has required fields (contentHash, dimensions, source='local', no drive field)
 */

import { getMediaByIdAsync } from '../lib/media';
import { isDriveReference, isPublishedMediaAsset } from '../types/media';
import { getAllServiceCardAssignments } from '../lib/assignment-store';

interface InvariantTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export async function runMediaInvariantTests(): Promise<InvariantTestResult[]> {
  const results: InvariantTestResult[] = [];

  console.log('[MEDIA_INVARIANT_TEST] Starting invariant tests...');

  // Test 1: DriveReference cannot be assigned directly
  try {
    // Check if any drive-prefixed IDs exist in active assignments
    const assignments = await getAllServiceCardAssignments();
    const driveAssignments = assignments.filter(a => a.mediaId.startsWith('drive-'));
    
    if (driveAssignments.length > 0) {
      results.push({
        testName: 'No DriveReference in active assignments',
        passed: false,
        details: `Found ${driveAssignments.length} drive-prefixed assignments: ${driveAssignments.map(a => `${a.serviceSlug}: ${a.mediaId}`).join(', ')}`,
      });
    } else {
      results.push({
        testName: 'No DriveReference in active assignments',
        passed: true,
        details: 'No drive-prefixed IDs found in active assignments',
      });
    }
  } catch (error) {
    results.push({
      testName: 'No DriveReference in active assignments',
      passed: false,
      details: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Test 2: Active assignments must resolve to PublishedMediaAsset
  try {
    const assignments = await getAllServiceCardAssignments();
    const { resolvePublicMedia } = await import('../lib/media');
    
    let failedAssignments = 0;
    for (const assignment of assignments) {
      const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
      if (!resolvedMedia) {
        failedAssignments++;
        console.error('[MEDIA_INVARIANT_TEST] Assignment does not resolve to PublishedMediaAsset:', {
          serviceSlug: assignment.serviceSlug,
          mediaId: assignment.mediaId,
        });
      }
    }
    
    if (failedAssignments > 0) {
      results.push({
        testName: 'Active assignments resolve to PublishedMediaAsset',
        passed: false,
        details: `${failedAssignments} out of ${assignments.length} assignments do not resolve to PublishedMediaAsset`,
      });
    } else {
      results.push({
        testName: 'Active assignments resolve to PublishedMediaAsset',
        passed: true,
        details: `All ${assignments.length} active assignments resolve to PublishedMediaAsset`,
      });
    }
  } catch (error) {
    results.push({
      testName: 'Active assignments resolve to PublishedMediaAsset',
      passed: false,
      details: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Test 3: PublishedMediaAsset contract validation
  try {
    // Sample some known media IDs to validate PublishedMediaAsset contract
    const testMediaIds = ['brand-hero', 'brand-featured', 'brand-portrait'];
    let failedMediaIds = 0;
    
    for (const mediaId of testMediaIds) {
      const media = await getMediaByIdAsync(mediaId);
      if (media) {
        // Check if it's a PublishedMediaAsset
        if (!isPublishedMediaAsset(media)) {
          failedMediaIds++;
          console.error('[MEDIA_INVARIANT_TEST] Media does not satisfy PublishedMediaAsset contract:', {
            mediaId,
            lifecycleState: media.lifecycleState,
            source: media.source,
            hasContentHash: typeof media.contentHash === 'string' && media.contentHash.length > 0,
            hasValidDimensions: media.dimensions.width > 0 && media.dimensions.height > 0,
            hasDrive: !!media.drive,
          });
        }
      }
    }
    
    if (failedMediaIds > 0) {
      results.push({
        testName: 'PublishedMediaAsset contract validation',
        passed: false,
        details: `${failedMediaIds} out of ${testMediaIds.length} test media IDs do not satisfy PublishedMediaAsset contract`,
      });
    } else {
      results.push({
        testName: 'PublishedMediaAsset contract validation',
        passed: true,
        details: `All ${testMediaIds.length} test media IDs satisfy PublishedMediaAsset contract`,
      });
    }
  } catch (error) {
    results.push({
      testName: 'PublishedMediaAsset contract validation',
      passed: false,
      details: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Test 4: resolvePublicMedia rejects Drive references
  try {
    const { resolvePublicMedia } = await import('../lib/media');
    
    // Test with a known drive-prefixed ID pattern
    const testDriveId = 'drive-test-12345';
    const resolvedMedia = await resolvePublicMedia(testDriveId);
    
    if (resolvedMedia === null) {
      results.push({
        testName: 'resolvePublicMedia rejects Drive references',
        passed: true,
        details: 'resolvePublicMedia correctly rejected drive-prefixed ID',
      });
    } else {
      results.push({
        testName: 'resolvePublicMedia rejects Drive references',
        passed: false,
        details: 'resolvePublicMedia did not reject drive-prefixed ID',
      });
    }
  } catch (error) {
    results.push({
      testName: 'resolvePublicMedia rejects Drive references',
      passed: false,
      details: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Print results
  console.log('[MEDIA_INVARIANT_TEST] Test Results:');
  results.forEach(result => {
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.testName}: ${result.details}`);
  });

  const allPassed = results.every(r => r.passed);
  console.log(`[MEDIA_INVARIANT_TEST] Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  return results;
}

// Run tests if executed directly
if (require.main === module) {
  runMediaInvariantTests()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('[MEDIA_INVARIANT_TEST] Fatal error:', error);
      process.exit(1);
    });
}
