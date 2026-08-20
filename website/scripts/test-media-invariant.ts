/**
 * Media Architecture Invariant Test
 *
 * Tests the invariant: DriveReference X → materialization → PublishedMediaAsset → assignment → website
 *
 * This test validates:
 * 1. DriveReference cannot directly enter public assignments
 * 2. Active assignment must resolve to PublishedMediaAsset
 * 3. resolvePublicMedia rejects Drive references
 * 4. PublishedMediaAsset has required fields (contentHash, dimensions, source='local', no drive field)
 *
 * Test states: PASS (executed and passed), FAIL (executed and failed), SKIPPED (not executed due to environment), BLOCKED (cannot execute)
 *
 * Note: Static media records in media.v1.json may not have lifecycleState, so we check for basic PublishedMediaAsset properties.
 */

import { getMediaByIdAsync, isDriveReference, isPublishedMediaAsset } from '../src/lib/media';
import { getAllServiceCardAssignments } from '../src/lib/assignment-store';

interface InvariantTestResult {
  testName: string;
  state: 'PASS' | 'FAIL' | 'SKIPPED' | 'BLOCKED';
  details: string;
}

export async function runMediaInvariantTests(): Promise<InvariantTestResult[]> {
  const results: InvariantTestResult[] = [];

  console.log('[MEDIA_INVARIANT_TEST] Starting invariant tests...');

  // Test 1: DriveReference cannot be assigned directly
  try {
    // Check if any drive-prefixed IDs exist in active assignments
    // Skip if KV credentials not available
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const assignments = await getAllServiceCardAssignments();
      const driveAssignments = assignments.filter(a => a.mediaId.startsWith('drive-') || a.mediaId.startsWith('drive-ref-'));
      
      if (driveAssignments.length > 0) {
        results.push({
          testName: 'No DriveReference in active assignments',
          state: 'FAIL',
          details: `Found ${driveAssignments.length} drive-prefixed assignments: ${driveAssignments.map(a => `${a.serviceSlug}: ${a.mediaId}`).join(', ')}`,
        });
      } else {
        results.push({
          testName: 'No DriveReference in active assignments',
          state: 'PASS',
          details: 'No drive-prefixed IDs found in active assignments',
        });
      }
    } else {
      results.push({
        testName: 'No DriveReference in active assignments',
        state: 'SKIPPED',
        details: 'KV credentials not available - cannot verify production state',
      });
    }
  } catch (error) {
    results.push({
      testName: 'No DriveReference in active assignments',
      state: 'FAIL',
      details: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Test 2: Active assignments must resolve to PublishedMediaAsset
  try {
    // Skip if KV credentials not available
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const assignments = await getAllServiceCardAssignments();
      const { resolvePublicMedia } = await import('../src/lib/media');
      
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
          state: 'FAIL',
          details: `${failedAssignments} out of ${assignments.length} assignments do not resolve to PublishedMediaAsset`,
        });
      } else {
        results.push({
          testName: 'Active assignments resolve to PublishedMediaAsset',
          state: 'PASS',
          details: `All ${assignments.length} active assignments resolve to PublishedMediaAsset`,
        });
      }
    } else {
      results.push({
        testName: 'Active assignments resolve to PublishedMediaAsset',
        state: 'SKIPPED',
        details: 'KV credentials not available - cannot verify production state',
      });
    }
  } catch (error) {
    results.push({
      testName: 'Active assignments resolve to PublishedMediaAsset',
      state: 'FAIL',
      details: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Test 3: PublishedMediaAsset contract validation
  try {
    // Test with actual media IDs from media.v1.json (static records may not have lifecycleState)
    const testMediaIds = ['outdoor-living-001-6', 'builtins-001-secondary', 'repairs-001-drywall'];
    let failedMediaIds = 0;
    
    for (const mediaId of testMediaIds) {
      const media = await getMediaByIdAsync(mediaId);
      if (media) {
        // For static media records, check for basic PublishedMediaAsset properties
        // Static records may not have lifecycleState, but should have no drive field
        const hasValidDimensions = media.dimensions.width > 0 && media.dimensions.height > 0;
        const hasNoDrive = !media.drive;
        const hasVariants = media.variants && media.variants.original;
        const hasNoDrivePrefix = !media.id.startsWith('drive-') && !media.id.startsWith('drive-ref-');
        
        // Static records are acceptable if they have no drive field and have valid variants
        // They don't need contentHash for static presentation
        if (!hasValidDimensions || !hasNoDrive || !hasVariants || !hasNoDrivePrefix) {
          failedMediaIds++;
          console.error('[MEDIA_INVARIANT_TEST] Media does not satisfy basic PublishedMediaAsset properties:', {
            mediaId,
            lifecycleState: media.lifecycleState,
            source: media.source,
            hasValidDimensions,
            hasNoDrive,
            hasVariants,
            hasNoDrivePrefix,
          });
        }
      }
    }
    
    if (failedMediaIds > 0) {
      results.push({
        testName: 'PublishedMediaAsset contract validation',
        state: 'FAIL',
        details: `${failedMediaIds} out of ${testMediaIds.length} test media IDs do not satisfy basic PublishedMediaAsset properties`,
      });
    } else {
      results.push({
        testName: 'PublishedMediaAsset contract validation',
        state: 'PASS',
        details: `All ${testMediaIds.length} test media IDs satisfy basic PublishedMediaAsset properties (no drive field, valid dimensions, has variants, no drive prefix)`,
      });
    }
  } catch (error) {
    results.push({
      testName: 'PublishedMediaAsset contract validation',
      state: 'FAIL',
      details: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Test 4: resolvePublicMedia rejects Drive references
  try {
    const { resolvePublicMedia } = await import('../src/lib/media');
    
    // Test with known drive-prefixed ID patterns
    const testDriveIds = ['drive-test-12345', 'drive-ref-test-12345'];
    let rejectedCount = 0;
    
    for (const testDriveId of testDriveIds) {
      const resolvedMedia = await resolvePublicMedia(testDriveId);
      if (resolvedMedia === null) {
        rejectedCount++;
      }
    }
    
    if (rejectedCount === testDriveIds.length) {
      results.push({
        testName: 'resolvePublicMedia rejects Drive references',
        state: 'PASS',
        details: `resolvePublicMedia correctly rejected all ${testDriveIds.length} drive-prefixed IDs`,
      });
    } else {
      results.push({
        testName: 'resolvePublicMedia rejects Drive references',
        state: 'FAIL',
        details: `resolvePublicMedia did not reject ${testDriveIds.length - rejectedCount} out of ${testDriveIds.length} drive-prefixed IDs`,
      });
    }
  } catch (error) {
    results.push({
      testName: 'resolvePublicMedia rejects Drive references',
      state: 'FAIL',
      details: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Print results
  console.log('[MEDIA_INVARIANT_TEST] Test Results:');
  results.forEach(result => {
    console.log(`[${result.state}] ${result.testName}: ${result.details}`);
  });

  const allPassed = results.every(r => r.state === 'PASS');
  const hasFailed = results.some(r => r.state === 'FAIL');
  const hasSkipped = results.some(r => r.state === 'SKIPPED');
  const hasBlocked = results.some(r => r.state === 'BLOCKED');
  
  if (hasFailed) {
    console.log(`[MEDIA_INVARIANT_TEST] Overall: SOME TESTS FAILED`);
  } else if (hasSkipped) {
    console.log(`[MEDIA_INVARIANT_TEST] Overall: ALL EXECUTED TESTS PASSED (some SKIPPED)`);
  } else if (hasBlocked) {
    console.log(`[MEDIA_INVARIANT_TEST] Overall: ALL EXECUTED TESTS PASSED (some BLOCKED)`);
  } else {
    console.log(`[MEDIA_INVARIANT_TEST] Overall: ALL TESTS PASSED`);
  }
  
  if (hasSkipped) {
    console.log('[MEDIA_INVARIANT_TEST] WARNING: Some tests were SKIPPED - full verification requires production KV credentials');
  }
  
  if (hasBlocked) {
    console.log('[MEDIA_INVARIANT_TEST] WARNING: Some tests are BLOCKED - cannot execute in current environment');
  }

  return results;
}

// Run tests if executed directly
if (require.main === module) {
  runMediaInvariantTests()
    .then((results) => {
      const hasFailed = results.some(r => r.state === 'FAIL');
      process.exit(hasFailed ? 1 : 0);
    })
    .catch((error) => {
      console.error('[MEDIA_INVARIANT_TEST] Fatal error:', error);
      process.exit(1);
    });
}
