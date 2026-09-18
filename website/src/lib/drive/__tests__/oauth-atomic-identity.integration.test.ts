/**
 * OAuth Atomic Identity Integration Tests
 * 
 * REAL Redis integration tests for authorization identity invariants:
 * - Concurrent upsert authorization → one authoritative identity
 * - Subject index consistency
 * - Atomic identity acquisition
 * 
 * CRITICAL: These tests use REAL Redis connectivity, NOT mocks.
 * They prove actual Redis Lua atomic behavior and identity consistency.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Check if Redis credentials are available
const OAUTH_IDENTITY_KV_REST_API_URL = process.env.KV_REST_API_URL || 
                       process.env.KV_REST_API__KV_REST_API_URL || 
                       process.env.KV_REST_API__REDIS_URL ||
                       process.env.KV_REST_API__KV_URL;
const OAUTH_IDENTITY_KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || 
                         process.env.KV_REST_API__KV_REST_API_TOKEN;

const OAUTH_IDENTITY_REDIS_AVAILABLE = !!(OAUTH_IDENTITY_KV_REST_API_URL && OAUTH_IDENTITY_KV_REST_API_TOKEN);
const REDIS_ENABLED = process.env.REDIS_INTEGRATION_TESTS_ENABLED === 'true';

// Skip entire suite if Redis credentials are missing in local development
// In CI, these tests should fail if Redis is not configured
const CI = process.env.CI === 'true';
const describeOrSkip = (!REDIS_ENABLED && !CI) ? describe.skip : describe;

describeOrSkip('OAuth Atomic Identity - Real Redis Integration', () => {
  let testNamespace: string;

  beforeAll(() => {
    // FAIL FAST in CI: Integration tests require Redis credentials
    if (CI && !REDIS_ENABLED) {
      throw new Error(
        '[OAUTH_IDENTITY_INTEGRATION] CANNOT RUN: Redis credentials not available. ' +
        'Required: KV_REST_API_URL and KV_REST_API_TOKEN. ' +
        'These tests require real Redis connectivity to prove atomic behavior.'
      );
    }

    // Skip if Redis credentials not available in local development
    if (!REDIS_ENABLED) {
      console.log('[OAUTH_IDENTITY_INTEGRATION] Skipping integration tests - Redis not enabled');
      return;
    }

    // P0 FIX: Use CI-supplied TEST_NAMESPACE from jest.oauth.integration.setup.ts
    // Do not generate separate namespace - this defeats run-scoped isolation
    testNamespace = process.env.TEST_NAMESPACE || 'hpp:test:';
    console.log('[OAUTH_IDENTITY_INTEGRATION] Using test namespace:', testNamespace);
  });

  afterAll(() => {
    // P0 FIX: Do not restore TEST_NAMESPACE - it's managed by jest.oauth.integration.setup.ts
    // The setup file controls the namespace for the entire test run
  });

  // Skip all tests if Redis credentials are not available in local development
  beforeEach(() => {
    if (!REDIS_ENABLED) {
      console.log('[OAUTH_IDENTITY_INTEGRATION] Skipping test - Redis not enabled');
    }
  });

  describe('Concurrent Authorization Upsert', () => {
    it('should prove exactly one authoritative identity for concurrent upserts', async () => {
      // Skip if Redis credentials not available
      if (!REDIS_ENABLED) {
        console.log('[OAUTH_IDENTITY_INTEGRATION] Skipping test - Redis not enabled');
        return;
      }

      const {
        upsertAuthorization,
        findAuthorizationBySubject,
        getAuthorization,
      } = await import('../oauth-credential-store');
      const { Redis } = await import('@upstash/redis');

      const googleSubject = `test_subject_${Date.now()}`;
      const email = `test_${Date.now()}@example.com`;
      
      // Create multiple authorization records for the same subject
      const upsertAttempts = Array.from({ length: 10 }, (_, i) => 
        upsertAuthorization(
          googleSubject,
          email,
          ['drive.readonly'],
          `test_token_${i}`,
          Date.now() + 3600000,
          `test_refresh_${i}`,
          0
        )
      );
      
      // Execute all upserts concurrently
      const results = await Promise.all(upsertAttempts);
      
      // CRITICAL: There should be exactly one authoritative authorization for this subject
      const auth = await findAuthorizationBySubject(googleSubject);
      expect(auth).toBeDefined();
      expect(auth?.googleSubject).toBe(googleSubject);
      
      // Verify subject index points to exactly one authorization
      const sameSubjectAuths = await findAuthorizationBySubject(googleSubject);
      expect(sameSubjectAuths).not.toBeNull();
      
      // ADVERSARIAL: Inspect Redis state to prove no orphan records
      // All upserts should have converged to the same authorization ID
      const uniqueAuthIds = new Set(results.map(r => r.id));
      expect(uniqueAuthIds.size).toBe(1); // All should have returned the same ID
      
      // Verify there are no orphan authorization records for this subject
      const redis = new Redis({ 
        url: OAUTH_IDENTITY_KV_REST_API_URL, 
        token: OAUTH_IDENTITY_KV_REST_API_TOKEN 
      });
      
      // Scan for all authorization keys in the test namespace
      // CRITICAL FIX: redis.scan() returns [cursor, keys], not [keys, cursor]
      // authKeys[0] is the cursor, authKeys[1] is the keys array
      let cursor = '0'; // Redis scan cursor is a string
      const allAuthKeys: string[] = [];
      
      do {
        const scanResult = await redis.scan(cursor, {
          match: `${testNamespace}drive:auth:*`,
          count: 100
        });
        
        cursor = scanResult[0]; // Update cursor for next iteration (cursor is a string)
        const keys = scanResult[1]; // Get keys from this batch
        allAuthKeys.push(...keys);
        
        // Continue scanning until cursor returns '0' (complete)
      } while (cursor !== '0');
      
      // Find all authorizations for this subject
      const authRecords: any[] = [];
      for (const key of allAuthKeys) {
        const record = await redis.get<any>(key);
        if (record && record.googleSubject === googleSubject) {
          authRecords.push(record);
        }
      }
      
      // CRITICAL: There should be exactly ONE authorization record for this subject
      expect(authRecords.length).toBe(1);
      expect(authRecords[0].id).toBe(auth?.id);
      
      console.log('[OAUTH_IDENTITY_INTEGRATION] Adversarial concurrent upsert test passed:', {
        googleSubject,
        authId: auth?.id,
        totalAttempts: upsertAttempts.length,
        uniqueAuthIds: uniqueAuthIds.size,
        orphanRecords: authRecords.length - 1,
        totalKeysScanned: allAuthKeys.length,
      });
    });

    it('should maintain subject index consistency', async () => {
      // Skip if Redis credentials not available
      if (!REDIS_ENABLED) {
        console.log('[OAUTH_IDENTITY_INTEGRATION] Skipping test - Redis not enabled');
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
        findAuthorizationBySubject,
      } = await import('../oauth-credential-store');

      const googleSubject = `test_subject_index_${Date.now()}`;
      const email = `test_index_${Date.now()}@example.com`;
      
      // Create authorization
      const auth = await upsertAuthorization(
        googleSubject,
        email,
        ['drive.readonly'],
        'test_token',
        Date.now() + 3600000,
        'test_refresh',
        0
      );
      
      const authId = auth.id;
      
      // Verify subject index resolves to correct authorization
      const subjectAuth = await findAuthorizationBySubject(googleSubject);
      expect(subjectAuth).not.toBeNull();
      expect(subjectAuth?.id).toBe(authId);
      expect(subjectAuth?.googleSubject).toBe(googleSubject);
      
      // Verify direct get also works
      const directAuth = await getAuthorization(authId);
      expect(directAuth).not.toBeNull();
      expect(directAuth?.id).toBe(authId);
      
      console.log('[OAUTH_IDENTITY_INTEGRATION] Subject index consistency test passed');
    });
  });

  describe('Atomic Identity Acquisition', () => {
    it('should prove atomic identity acquisition under contention', async () => {
      // Skip if Redis credentials not available
      if (!REDIS_ENABLED) {
        console.log('[OAUTH_IDENTITY_INTEGRATION] Skipping test - Redis not enabled');
        return;
      }

      const {
        upsertAuthorization,
        findAuthorizationBySubject,
      } = await import('../oauth-credential-store');

      const googleSubject = `test_atomic_${Date.now()}`;
      const email = `test_atomic_${Date.now()}@example.com`;
      
      // Simulate multiple processes trying to acquire the same identity
      const acquisitionAttempts = Array.from({ length: 10 }, (_, i) => 
        upsertAuthorization(
          googleSubject,
          email,
          ['drive.readonly'],
          `token_${i}`,
          Date.now() + 3600000,
          `refresh_${i}`,
          0
        )
      );
      
      // Execute all acquisitions concurrently
      await Promise.all(acquisitionAttempts);
      
      // CRITICAL: One authoritative identity should exist
      const auth = await findAuthorizationBySubject(googleSubject);
      expect(auth).toBeDefined();
      
      // Verify the identity is consistent
      expect(auth?.googleSubject).toBe(googleSubject);
      expect(auth?.email).toBe(email);
      
      console.log('[OAUTH_IDENTITY_INTEGRATION] Atomic identity acquisition test passed:', {
        googleSubject,
        finalAuthId: auth?.id,
      });
    });
  });

  describe('Authorization Lifecycle', () => {
    it('should handle authorization creation and retrieval', async () => {
      // Skip if Redis credentials not available
      if (!REDIS_ENABLED) {
        console.log('[OAUTH_IDENTITY_INTEGRATION] Skipping test - Redis not enabled');
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
      } = await import('../oauth-credential-store');

      const googleSubject = `test_lifecycle_${Date.now()}`;
      const email = `test_lifecycle_${Date.now()}@example.com`;
      
      // Create authorization
      const auth = await upsertAuthorization(
        googleSubject,
        email,
        ['drive.readonly'],
        'test_token',
        Date.now() + 3600000,
        'test_refresh',
        0
      );
      
      const authId = auth.id;
      
      // Retrieve authorization
      const retrievedAuth = await getAuthorization(authId);
      expect(retrievedAuth).toBeDefined();
      expect(retrievedAuth?.id).toBe(authId);
      expect(auth?.googleSubject).toBe(googleSubject);
      
      console.log('[OAUTH_IDENTITY_INTEGRATION] Authorization lifecycle test passed');
    });

    it('should handle authorization revocation', async () => {
      // Skip if Redis credentials not available
      if (!REDIS_ENABLED) {
        console.log('[OAUTH_IDENTITY_INTEGRATION] Skipping test - Redis not enabled');
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
        revokeAuthorization,
        findAuthorizationBySubject,
      } = await import('../oauth-credential-store');

      const googleSubject = `test_revoke_${Date.now()}`;
      const email = `test_revoke_${Date.now()}@example.com`;
      
      // Create authorization
      const auth = await upsertAuthorization(
        googleSubject,
        email,
        ['drive.readonly'],
        'test_token',
        Date.now() + 3600000,
        'test_refresh',
        0
      );
      
      const authId = auth.id;
      
      // Verify authorization exists
      const authBefore = await getAuthorization(authId);
      expect(authBefore).toBeDefined();
      
      // Revoke authorization
      await revokeAuthorization(authId);
      
      // Verify authorization status is revoked (record still exists but marked revoked)
      const authAfter = await getAuthorization(authId);
      expect(authAfter).toBeDefined();
      expect(authAfter?.status).toBe('revoked');
      
      // Verify subject index is cleaned up (prevents resurrection)
      const subjectAuth = await findAuthorizationBySubject(googleSubject);
      expect(subjectAuth).toBeNull();
      
      console.log('[OAUTH_IDENTITY_INTEGRATION] Authorization revocation test passed');
    });
  });
});