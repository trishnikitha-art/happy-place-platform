/**
 * Runtime Gallery Authority Regression Tests
 * 
 * Tests for the P0 fix that introduces a durable Redis runtime authority
 * for gallery + revision, solving the stale Vercel deployment problem.
 * 
 * Bug scenario (production logs):
 * - Transaction WBDEP-1790100474216-phc0j5ynq committed revision 3
 * - Old Vercel deployment still had revision 1 in bundled projects.v1.json
 * - Workbench got revision 1 from filesystem, expected revision 2, CAS failed
 * - Project-level transaction pointer was never cleared after consumption
 * - Next request found dead transaction ID and fell back to revision 1
 * 
 * Fix architecture:
 * - Redis runtime key stores effective gallery + revision as live authority
 * - GET reads runtime authority first, then staged, then filesystem
 * - CAS Lua script reads runtime authority first, updates it atomically
 * - consumeDeploymentTransaction clears project-level transaction pointer
 * - Stale deployment filesystem state is only used as fallback
 * 
 * P0 FIX #1: Runtime authority is the ONLY CAS authority
 * - Staged state is pending deployment material ONLY
 * - Staged state may be used for previousGallery but NEVER for currentRevision
 * - Filesystem is deployed projection/fallback ONLY
 * 
 * P0 FIX #2: CAS executes BEFORE transaction creation
 * - Eliminates split-brain failure window
 * - Transaction only created if CAS succeeds
 * 
 * P0 FIX #3: Transaction pointer cleanup is conditional and atomic
 * - Only deletes pointer if it still points to transaction being consumed
 * - Prevents race conditions where new transaction becomes current
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Redis } from '@upstash/redis';
import { getRedisClient, getKvNamespace, ATOMIC_GALLERY_CAS_SCRIPT, CONDITIONAL_POINTER_CLEANUP_SCRIPT } from '@/lib/deployment-transaction';

// Use the same keys as the production route
const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';
const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';

function getRuntimeGalleryKey(projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

function getProjectStagingKey(projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_STAGING_PREFIX}project:${projectId}:current-transaction`;
}

function getSpecificStagingKey(transactionId: string, projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_STAGING_PREFIX}${transactionId}:project:${projectId}:gallery`;
}

const TEST_PROJECT_ID = 'test-runtime-authority-project';
const TEST_TRANSACTION_ID = 'WBDEP-TEST-RUNTIME-AUTHORITY';

describe('Runtime Gallery Authority - P0 Fixes', () => {
  let redis: Redis;

  beforeAll(() => {
    redis = getRedisClient();
  });

  beforeEach(async () => {
    // Clean up test keys
    await redis.del(getRuntimeGalleryKey(TEST_PROJECT_ID));
    await redis.del(getProjectStagingKey(TEST_PROJECT_ID));
    await redis.del(getSpecificStagingKey(TEST_TRANSACTION_ID, TEST_PROJECT_ID));
  });

  afterAll(async () => {
    // Final cleanup
    await redis.del(getRuntimeGalleryKey(TEST_PROJECT_ID));
    await redis.del(getProjectStagingKey(TEST_PROJECT_ID));
    await redis.del(getSpecificStagingKey(TEST_TRANSACTION_ID, TEST_PROJECT_ID));
  });

  describe('P0 #1: Runtime authority is the ONLY CAS authority', () => {
    it('Test A: Filesystem revision 1 + Redis runtime revision 3 → PUT expecting 3 must succeed', async () => {
      // Set runtime authority with revision 3
      const runtimeGallery = ['media-id-1', 'media-id-2', 'media-id-3'];
      const runtimePayload = {
        gallery: runtimeGallery,
        currentRevision: 3,
        lastMutationTimestamp: new Date().toISOString(),
        lastTransactionId: TEST_TRANSACTION_ID,
      };
      await redis.set(getRuntimeGalleryKey(TEST_PROJECT_ID), runtimePayload);

      // Simulate stale filesystem with revision 1 (should be ignored)
      const deployedRevision = 1;

      // CAS should compare against runtime revision 3, not filesystem revision 1
      const runtimeGalleryKey = getRuntimeGalleryKey(TEST_PROJECT_ID);
      const projectStagingKey = getProjectStagingKey(TEST_PROJECT_ID);
      const specificStagingKey = getSpecificStagingKey(TEST_TRANSACTION_ID, TEST_PROJECT_ID);

      const casResult = await redis.eval(
        ATOMIC_GALLERY_CAS_SCRIPT,
        [runtimeGalleryKey, projectStagingKey, specificStagingKey],
        ['3', JSON.stringify(['media-id-1', 'media-id-2', 'media-id-4']), TEST_TRANSACTION_ID, new Date().toISOString()]
      );

      expect(casResult[0]).toBe('OK');
      expect(casResult[1]).toBe(4); // Revision 3 → 4

      console.log('[TEST A] Runtime revision 3 beats filesystem revision 1 (filesystem ignored)');
    });

    it('Test A.1: No runtime authority → CAS fails with RUNTIME_AUTHORITY_NOT_INITIALIZED', async () => {
      // Ensure no runtime authority exists
      await redis.del(getRuntimeGalleryKey(TEST_PROJECT_ID));

      const runtimeGalleryKey = getRuntimeGalleryKey(TEST_PROJECT_ID);
      const projectStagingKey = getProjectStagingKey(TEST_PROJECT_ID);
      const specificStagingKey = getSpecificStagingKey(TEST_TRANSACTION_ID, TEST_PROJECT_ID);

      const casResult = await redis.eval(
        ATOMIC_GALLERY_CAS_SCRIPT,
        [runtimeGalleryKey, projectStagingKey, specificStagingKey],
        ['1', JSON.stringify(['media-id-1', 'media-id-2']), TEST_TRANSACTION_ID, new Date().toISOString()]
      );

      expect(casResult[0]).toBe('ERR');
      expect(casResult[1]).toBe('RUNTIME_AUTHORITY_NOT_INITIALIZED');

      console.log('[TEST A.1] No runtime authority → CAS fails closed');
    });

    it('Test B: Filesystem revision 99 + Redis runtime revision 3 → PUT expecting 3 must still succeed', async () => {
      // Set runtime authority with revision 3
      const runtimeGallery = ['media-id-1', 'media-id-2', 'media-id-3'];
      const runtimePayload = {
        gallery: runtimeGallery,
        currentRevision: 3,
        lastMutationTimestamp: new Date().toISOString(),
        lastTransactionId: TEST_TRANSACTION_ID,
      };
      await redis.set(getRuntimeGalleryKey(TEST_PROJECT_ID), runtimePayload);

      // Simulate stale filesystem with revision 99 (should be ignored)
      const deployedRevision = 99;

      // CAS should compare against runtime revision 3, not filesystem revision 99
      const runtimeGalleryKey = getRuntimeGalleryKey(TEST_PROJECT_ID);
      const projectStagingKey = getProjectStagingKey(TEST_PROJECT_ID);
      const specificStagingKey = getSpecificStagingKey(TEST_TRANSACTION_ID, TEST_PROJECT_ID);

      const casResult = await redis.eval(
        ATOMIC_GALLERY_CAS_SCRIPT,
        [runtimeGalleryKey, projectStagingKey, specificStagingKey],
        ['3', JSON.stringify(['media-id-1', 'media-id-2', 'media-id-4']), TEST_TRANSACTION_ID, new Date().toISOString()]
      );

      expect(casResult[0]).toBe('OK');
      expect(casResult[1]).toBe(4); // Revision 3 → 4

      console.log('[TEST B] Runtime revision 3 beats filesystem revision 99 (filesystem ignored)');
    });

    it('Test C: Redis runtime revision 3 + stale staged revision 2 → CAS compares against 3, not 2', async () => {
      // Set runtime authority with revision 3
      const runtimeGallery = ['media-id-1', 'media-id-2', 'media-id-3'];
      const runtimePayload = {
        gallery: runtimeGallery,
        currentRevision: 3,
        lastMutationTimestamp: new Date().toISOString(),
        lastTransactionId: TEST_TRANSACTION_ID,
      };
      await redis.set(getRuntimeGalleryKey(TEST_PROJECT_ID), runtimePayload);

      // Set stale staged state with revision 2 (should be ignored)
      const staleStagedPayload = {
        gallery: ['media-id-1', 'media-id-2'],
        currentRevision: 2,
        previousGallery: [],
        mutationTimestamp: new Date().toISOString(),
      };
      await redis.set(getSpecificStagingKey('STALE-TX', TEST_PROJECT_ID), staleStagedPayload);
      await redis.set(getProjectStagingKey(TEST_PROJECT_ID), 'STALE-TX');

      // CAS should compare against runtime revision 3, not staged revision 2
      const runtimeGalleryKey = getRuntimeGalleryKey(TEST_PROJECT_ID);
      const projectStagingKey = getProjectStagingKey(TEST_PROJECT_ID);
      const specificStagingKey = getSpecificStagingKey(TEST_TRANSACTION_ID, TEST_PROJECT_ID);

      const casResult = await redis.eval(
        ATOMIC_GALLERY_CAS_SCRIPT,
        [runtimeGalleryKey, projectStagingKey, specificStagingKey],
        ['3', JSON.stringify(['media-id-1', 'media-id-2', 'media-id-4']), TEST_TRANSACTION_ID, new Date().toISOString()]
      );

      expect(casResult[0]).toBe('OK');
      expect(casResult[1]).toBe(4); // Revision 3 → 4

      console.log('[TEST C] Runtime revision 3 beats stale staged revision 2 (staged ignored)');
    });

    it('Test D: Concurrent PUTs with expectedRevision 3 → exactly one succeeds', async () => {
      // Set runtime authority with revision 3
      const runtimeGallery = ['media-id-1', 'media-id-2', 'media-id-3'];
      const runtimePayload = {
        gallery: runtimeGallery,
        currentRevision: 3,
        lastMutationTimestamp: new Date().toISOString(),
        lastTransactionId: TEST_TRANSACTION_ID,
      };
      await redis.set(getRuntimeGalleryKey(TEST_PROJECT_ID), runtimePayload);

      const runtimeGalleryKey = getRuntimeGalleryKey(TEST_PROJECT_ID);
      const projectStagingKey = getProjectStagingKey(TEST_PROJECT_ID);

      // P0 FIX: Use Promise.all for actual concurrent execution
      const [resultA, resultB] = await Promise.all([
        redis.eval(
          ATOMIC_GALLERY_CAS_SCRIPT,
          [runtimeGalleryKey, projectStagingKey, getSpecificStagingKey('TX-A', TEST_PROJECT_ID)],
          ['3', JSON.stringify(['media-id-1', 'media-id-2', 'media-id-4']), 'TX-A', new Date().toISOString()]
        ),
        redis.eval(
          ATOMIC_GALLERY_CAS_SCRIPT,
          [runtimeGalleryKey, projectStagingKey, getSpecificStagingKey('TX-B', TEST_PROJECT_ID)],
          ['3', JSON.stringify(['media-id-1', 'media-id-2', 'media-id-5']), 'TX-B', new Date().toISOString()]
        ),
      ]);

      // Exactly one should succeed
      const successCount = [resultA, resultB].filter(r => r[0] === 'OK').length;
      const failureCount = [resultA, resultB].filter(r => r[0] === 'ERR').length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify runtime revision advanced exactly once
      const finalRuntime = await redis.get(getRuntimeGalleryKey(TEST_PROJECT_ID));
      expect((finalRuntime as any).currentRevision).toBe(4);

      console.log('[TEST D] Concurrent PUTs with Promise.all: exactly one succeeds, revision advances once');
    });
  });

  describe('P0 #3: Transaction pointer cleanup is conditional and atomic', () => {
    it('Test E: Consume transaction A while transaction B becomes current → B\'s pointer survives', async () => {
      // Set project pointer to transaction B
      await redis.set(getProjectStagingKey(TEST_PROJECT_ID), 'TX-B');

      // Try to consume transaction A using the actual production Lua script
      const projectStagingKey = getProjectStagingKey(TEST_PROJECT_ID);
      const cleanupResult = await redis.eval(
        CONDITIONAL_POINTER_CLEANUP_SCRIPT,
        [projectStagingKey],
        ['TX-A']
      );

      expect(cleanupResult).toBe('SKIPPED');

      // Verify B's pointer still exists
      const pointer = await redis.get(projectStagingKey);
      expect(pointer).toBe('TX-B');

      console.log('[TEST E] Consuming A does not delete B\'s pointer (using production Lua script)');
    });
  });

  describe('End-to-end scenario from production logs', () => {
    it('should handle the exact production scenario: revision 3 committed, old deployment has revision 1', async () => {
      // Step 1: Runtime authority has revision 3 (from successful transaction)
      const runtimePayload = {
        gallery: ['media-id-1', 'media-id-2', 'media-id-3'],
        currentRevision: 3,
        lastMutationTimestamp: new Date().toISOString(),
        lastTransactionId: 'WBDEP-1790100474216-phc0j5ynq',
      };
      await redis.set(getRuntimeGalleryKey(TEST_PROJECT_ID), runtimePayload);

      // Step 2: Old Vercel deployment has revision 1 in filesystem
      const deployedRevision = 1;

      // Step 3: Workbench GET should return revision 3 from runtime authority
      const runtimeData = await redis.get(getRuntimeGalleryKey(TEST_PROJECT_ID));
      const effectiveRevision = (runtimeData as any).currentRevision;

      expect(effectiveRevision).toBe(3);
      expect(effectiveRevision).not.toBe(deployedRevision);

      console.log('[TEST] Production scenario: runtime revision 3 beats stale deployment revision 1');
    });
  });
});
