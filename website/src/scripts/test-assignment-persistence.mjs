/**
 * Test Assignment Persistence
 *
 * REQUIRES: KV credentials (KV_REST_API_URL, KV_REST_API_TOKEN)
 * REQUIRES: Production or development environment with Redis access
 *
 * Verifies that Visual Slot assignments:
 * 1. Can be stored
 * 2. Survive readback
 * 3. Persist across "page reloads" (subsequent reads)
 * 4. Resolve to valid PublishedMediaAsset
 *
 * Usage:
 *   KV_REST_API_URL=... KV_REST_API_TOKEN=... node src/scripts/test-assignment-persistence.mjs
 */

// Use dynamic imports to avoid TypeScript compilation issues
const { storeServiceCardAssignment, getServiceCardAssignment } = await import('../lib/assignment-store.js');
const { resolvePublicMedia } = await import('../lib/media.js');

// Use an existing known-good canonical asset
const TEST_MEDIA_ID = 'brand-portrait'; // This is a valid static asset
const TEST_SLOT_KEY = 'brand-portrait-homepage';

async function testAssignmentPersistence() {
  console.log('[TEST] Starting assignment persistence test...\n');

  const requestId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Step 1: Read current assignment (if any)
  console.log('[TEST] Step 1: Reading current assignment...');
  const currentAssignment = await getServiceCardAssignment(TEST_SLOT_KEY, requestId);
  const expectedRevision = currentAssignment?.revision || 0;
  console.log('[TEST] Current assignment:', {
    exists: !!currentAssignment,
    mediaId: currentAssignment?.mediaId,
    revision: expectedRevision,
  });

  // Step 2: Store new assignment
  console.log('\n[TEST] Step 2: Storing new assignment...');
  const newAssignment = {
    serviceSlug: TEST_SLOT_KEY,
    mediaId: TEST_MEDIA_ID,
    source: 'workbench',
    updatedAt: new Date().toISOString(),
    actor: 'test',
  };

  try {
    await storeServiceCardAssignment(newAssignment, expectedRevision, requestId);
    console.log('[TEST] Assignment stored successfully');
  } catch (error) {
    console.error('[TEST] Failed to store assignment:', error.message);
    process.exit(1);
  }

  // Step 3: Read back immediately (first readback)
  console.log('\n[TEST] Step 3: Reading back assignment (first readback)...');
  const readback1 = await getServiceCardAssignment(TEST_SLOT_KEY, requestId);
  console.log('[TEST] First readback:', {
    mediaId: readback1?.mediaId,
    matchesExpected: readback1?.mediaId === TEST_MEDIA_ID,
    revision: readback1?.revision,
  });

  if (!readback1 || readback1.mediaId !== TEST_MEDIA_ID) {
    console.error('[TEST] FAILED: First readback does not match stored assignment');
    process.exit(1);
  }

  // Step 4: Simulate page reload (second readback after delay)
  console.log('\n[TEST] Step 4: Simulating page reload (second readback)...');
  await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to simulate time passing
  const readback2 = await getServiceCardAssignment(TEST_SLOT_KEY, requestId);
  console.log('[TEST] Second readback:', {
    mediaId: readback2?.mediaId,
    matchesExpected: readback2?.mediaId === TEST_MEDIA_ID,
    matchesFirstReadback: readback2?.mediaId === readback1?.mediaId,
    revision: readback2?.revision,
  });

  if (!readback2 || readback2.mediaId !== TEST_MEDIA_ID) {
    console.error('[TEST] FAILED: Second readback does not match stored assignment');
    process.exit(1);
  }

  // Step 5: Verify media resolves through public gate
  console.log('\n[TEST] Step 5: Verifying media resolves through public gate...');
  const resolvedMedia = await resolvePublicMedia(TEST_MEDIA_ID);
  console.log('[TEST] Resolved media:', {
    exists: !!resolvedMedia,
    id: resolvedMedia?.id,
    lifecycleState: resolvedMedia?.lifecycleState,
    source: resolvedMedia?.source,
    storage: resolvedMedia?.storage,
  });

  if (!resolvedMedia) {
    console.error('[TEST] FAILED: Media does not resolve through public gate');
    process.exit(1);
  }

  // Step 6: Restore original assignment (cleanup)
  console.log('\n[TEST] Step 6: Restoring original assignment (cleanup)...');
  if (currentAssignment && currentAssignment.mediaId) {
    try {
      await storeServiceCardAssignment(currentAssignment, readback2.revision, requestId);
      console.log('[TEST] Original assignment restored');
    } catch (error) {
      console.warn('[TEST] Failed to restore original assignment:', error.message);
    }
  } else {
    console.log('[TEST] No original assignment to restore (slot was empty)');
  }

  console.log('\n[TEST] ✅ SUCCESS: All persistence checks passed');
  console.log('[TEST] Assignment stored, persisted across reloads, and media resolves through public gate');
}

testAssignmentPersistence().catch(error => {
  console.error('[TEST] Unhandled error:', error);
  process.exit(1);
});
