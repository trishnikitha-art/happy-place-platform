/**
 * OAuth Authority Revocation REAL Integration Tests
 * 
 * REAL Redis integration tests for revocation invariants:
 * - Multiple sessions → all revoked
 * - Revoked authorization → no usable sessions
 * - Repeated revocation → idempotent
 * - Single authoritative revocation path
 * 
 * CRITICAL: These tests use REAL Redis connectivity, NOT mocks.
 * They prove actual Redis Lua revocation behavior and session cleanup.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Redis } from '@upstash/redis';
import { 
  upsertAuthorization,
  revokeAuthorizationWithSessions,
  findAuthorizationBySubject,
  getAuthorization,
} from '../oauth-credential-store';
import { 
  createSession,
  getSession,
} from '../session-store';
import { cookies } from 'next/headers';

// Check if Redis credentials are available
const REVOCATION_KV_REST_API_URL = process.env.KV_REST_API_URL || 
                       process.env.KV_REST_API__KV_REST_API_URL || 
                       process.env.KV_REST_API__REDIS_URL ||
                       process.env.KV_REST_API__KV_URL;
const REVOCATION_KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || 
                         process.env.KV_REST_API__KV_REST_API_TOKEN;

const REVOCATION_REDIS_AVAILABLE = !!(REVOCATION_KV_REST_API_URL && REVOCATION_KV_REST_API_TOKEN);

// Skip entire suite if Redis credentials are missing in local development
// In CI, these tests should fail if Redis is not configured
const CI = process.env.CI === 'true';
const describeOrSkip = (!REVOCATION_REDIS_AVAILABLE && !CI) ? describe.skip : describe;

describeOrSkip('OAuth Authority Revocation - Real Redis Integration', () => {
  let testNamespace: string;
  let originalTestNamespace: string | undefined;
  let testSubject: string;
  let testEmail: string;
  let testScopes: string[];
  
  beforeAll(() => {
    // FAIL FAST in CI: Integration tests require Redis credentials
    if (CI && !REVOCATION_REDIS_AVAILABLE) {
      throw new Error(
        '[REVOCATION] CANNOT RUN: Redis credentials not available. ' +
        'Required: KV_REST_API_URL and KV_REST_API_TOKEN. ' +
        'These tests require real Redis connectivity to prove revocation behavior.'
      );
    }
    
    // Skip if Redis credentials not available in local development
    if (!REVOCATION_REDIS_AVAILABLE) {
      console.log('[REVOCATION] Skipping integration tests - Redis credentials not available');
      return;
    }
    
    // Save original TEST_NAMESPACE to restore after tests
    originalTestNamespace = process.env.TEST_NAMESPACE;
    
    // Generate unique test namespace to avoid conflicts with production data
    testNamespace = `test_revocation_${Date.now()}`;
    process.env.TEST_NAMESPACE = testNamespace;
    console.log('[REVOCATION] Using test namespace:', testNamespace);
    
    // Generate unique test identity
    testSubject = `test-google-subject-revocation-${Date.now()}`;
    testEmail = `revocation-${Date.now()}@example.com`;
    testScopes = ['https://www.googleapis.com/auth/drive.readonly'];
  });

  afterAll(async () => {
    // Restore original TEST_NAMESPACE
    if (originalTestNamespace !== undefined) {
      process.env.TEST_NAMESPACE = originalTestNamespace;
    } else {
      delete process.env.TEST_NAMESPACE;
    }
    
    // Cleanup test data
    try {
      if (REVOCATION_REDIS_AVAILABLE) {
        const existing = await findAuthorizationBySubject(testSubject);
        if (existing) {
          await revokeAuthorizationWithSessions(existing.id);
        }
      }
    } catch (error) {
      console.error('[REVOCATION] Cleanup error:', error);
    }
  });

  // Skip all tests if Redis credentials are not available in local development
  beforeEach(() => {
    if (!REVOCATION_REDIS_AVAILABLE) {
      console.log('[REVOCATION] Skipping test - Redis credentials not available');
    }
  });

  describe('Authorization Revocation', () => {
    it('should revoke authorization and mark as revoked', async () => {
      // Skip if Redis credentials not available
      if (!REVOCATION_REDIS_AVAILABLE) {
        console.log('[REVOCATION] Skipping test - Redis credentials not available');
        return;
      }

      // Create authorization
      const auth = await upsertAuthorization(
        testSubject,
        testEmail,
        testScopes,
        'test_access_token',
        Date.now() + 3600000,
        'test_refresh_token',
        0
      );
      
      const authId = auth.id;
      
      // Verify authorization exists and is active
      const authBefore = await getAuthorization(authId);
      expect(authBefore).toBeDefined();
      expect(authBefore?.status).toBe('active');
      
      // Revoke authorization
      await revokeAuthorizationWithSessions(authId);
      
      // Verify authorization is revoked
      const authAfter = await getAuthorization(authId);
      expect(authAfter).toBeDefined();
      expect(authAfter?.status).toBe('revoked');
      
      // Verify subject index is cleaned up
      const subjectAuth = await findAuthorizationBySubject(testSubject);
      expect(subjectAuth).toBeNull();
      
      console.log('[REVOCATION] Authorization revocation test passed');
    });

    it('should revoke all associated sessions', async () => {
      // Skip if Redis credentials not available
      if (!REVOCATION_REDIS_AVAILABLE) {
        console.log('[REVOCATION] Skipping test - Redis credentials not available');
        return;
      }

      // Create authorization
      const auth = await upsertAuthorization(
        testSubject,
        testEmail,
        testScopes,
        'test_access_token',
        Date.now() + 3600000,
        'test_refresh_token',
        0
      );
      
      const authId = auth.id;
      
      // Create multiple sessions
      const session1 = await createSession(authId, 'test-user-agent-1');
      const session2 = await createSession(authId, 'test-user-agent-2');
      const session3 = await createSession(authId, 'test-user-agent-3');
      
      // Verify sessions exist
      const session1Data = await getSession(session1.id);
      const session2Data = await getSession(session2.id);
      const session3Data = await getSession(session3.id);
      
      expect(session1Data).toBeDefined();
      expect(session2Data).toBeDefined();
      expect(session3Data).toBeDefined();
      
      // Revoke authorization
      await revokeAuthorizationWithSessions(authId);
      
      // Verify all sessions are revoked
      const session1After = await getSession(session1.id);
      const session2After = await getSession(session2.id);
      const session3After = await getSession(session3.id);
      
      expect(session1After).toBeNull();
      expect(session2After).toBeNull();
      expect(session3After).toBeNull();
      
      console.log('[REVOCATION] Session revocation test passed');
    });

    it('should be idempotent on repeated revocation', async () => {
      // Skip if Redis credentials not available
      if (!REVOCATION_REDIS_AVAILABLE) {
        console.log('[REVOCATION] Skipping test - Redis credentials not available');
        return;
      }

      // Create authorization
      const auth = await upsertAuthorization(
        testSubject,
        testEmail,
        testScopes,
        'test_access_token',
        Date.now() + 3600000,
        'test_refresh_token',
        0
      );
      
      const authId = auth.id;
      
      // Revoke authorization twice
      await revokeAuthorizationWithSessions(authId);
      await revokeAuthorizationWithSessions(authId);
      
      // Verify authorization is still revoked
      const authAfter = await getAuthorization(authId);
      expect(authAfter).toBeDefined();
      expect(authAfter?.status).toBe('revoked');
      
      console.log('[REVOCATION] Idempotent revocation test passed');
    });
  });
});
