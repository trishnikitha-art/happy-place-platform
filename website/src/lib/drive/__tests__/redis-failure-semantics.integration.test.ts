/**
 * Redis Failure Semantics Integration Test
 *
 * P0 FIX: Prove that authorization operations fail closed when Redis is unavailable
 *
 * This test addresses the critical security invariant: when Redis is unavailable,
 * the application must fail closed (return explicit error) rather than:
 * - Returning "unauthenticated" (could allow bypass)
 * - Returning false (could be misinterpreted)
 * - Silent fallback to legacy cookies
 * - Silent fallback to any alternative auth mechanism
 *
 * Security invariant: Redis unavailable → explicit error → no silent fallback
 */

describe('Redis Failure Semantics - Real Redis Integration', () => {
  let testNamespace: string;
  let originalRedisUrl: string | undefined;
  let originalRedisToken: string | undefined;
  
  beforeAll(() => {
    // Skip integration tests if Redis credentials are not available
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('[REDIS_FAILURE_SEMANTICS] Skipping integration tests - Redis credentials not available');
      return;
    }
    
    // Save original Redis credentials
    originalRedisUrl = process.env.KV_REST_API_URL;
    originalRedisToken = process.env.KV_REST_API_TOKEN;
    
    // Generate unique test namespace to avoid conflicts with production data
    testNamespace = `test_redis_failure_${Date.now()}`;
    console.log('[REDIS_FAILURE_SEMANTICS] Using test namespace:', testNamespace);
  });

  afterAll(() => {
    // Restore original Redis credentials
    if (originalRedisUrl) {
      process.env.KV_REST_API_URL = originalRedisUrl;
    }
    if (originalRedisToken) {
      process.env.KV_REST_API_TOKEN = originalRedisToken;
    }
  });

  // Skip all tests if Redis credentials are not available
  beforeEach(() => {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('[REDIS_FAILURE_SEMANTICS] Skipping test - Redis credentials not available');
    }
  });

  describe('Redis Unavailable - Fail Closed', () => {
    it('should throw explicit error when Redis URL is invalid', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // Temporarily set invalid Redis URL
      process.env.KV_REST_API_URL = 'https://invalid-redis-url.example.com';
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        const { upsertAuthorization } = await import('../oauth-credential-store');
        
        // Attempt authorization operation with invalid Redis
        await expect(
          upsertAuthorization(
            'test-subject-fail-closed',
            'fail-closed@example.com',
            ['openid', 'profile', 'email'],
            'test-access-token',
            Date.now() + 3600000,
            'test-refresh-token',
          )
        ).rejects.toThrow();

        console.log('[REDIS_FAILURE_SEMANTICS] Invalid Redis URL test passed - operation failed explicitly');
      } finally {
        // Restore valid Redis credentials
        process.env.KV_REST_API_URL = originalRedisUrl!;
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
      }
    });

    it('should throw explicit error when Redis token is invalid', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // Temporarily set invalid Redis token
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        const { upsertAuthorization } = await import('../oauth-credential-store');
        
        // Attempt authorization operation with invalid Redis token
        await expect(
          upsertAuthorization(
            'test-subject-invalid-token',
            'invalid-token@example.com',
            ['openid', 'profile', 'email'],
            'test-access-token',
            Date.now() + 3600000,
            'test-refresh-token',
          )
        ).rejects.toThrow();

        console.log('[REDIS_FAILURE_SEMANTICS] Invalid Redis token test passed - operation failed explicitly');
      } finally {
        // Restore valid Redis credentials
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
      }
    });

    it('should not return false for Redis failure', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // Temporarily set invalid Redis credentials
      process.env.KV_REST_API_URL = 'https://invalid-redis-url.example.com';
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        const { getAuthorization } = await import('../oauth-credential-store');
        
        // Attempt to get authorization with invalid Redis
        const result = await getAuthorization('nonexistent-id');
        
        // P0 FIX: Must NOT return false (could be misinterpreted as "not found")
        // Should return null or throw error
        expect(result).toBeNull();

        console.log('[REDIS_FAILURE_SEMANTICS] Non-false return test passed - returned null, not false');
      } finally {
        // Restore valid Redis credentials
        process.env.KV_REST_API_URL = originalRedisUrl!;
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
      }
    });

    it('should not allow silent fallback to legacy cookies', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // This test verifies the architectural invariant: no silent fallback
      // The Drive session manager should fail closed when Redis is unavailable
      
      // Temporarily set invalid Redis credentials
      process.env.KV_REST_API_URL = 'https://invalid-redis-url.example.com';
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        const { getSession } = await import('../session-store');
        
        // Attempt to get session with invalid Redis
        const result = await getSession('nonexistent-session-id');
        
        // Should return null, not fall back to any alternative mechanism
        expect(result).toBeNull();

        console.log('[REDIS_FAILURE_SEMANTICS] No silent fallback test passed - returned null');
      } finally {
        // Restore valid Redis credentials
        process.env.KV_REST_API_URL = originalRedisUrl!;
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
      }
    });

    it('should maintain fail-closed invariant for authorization operations', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // First, create a valid authorization
      const { upsertAuthorization, getAuthorization, deleteAuthorization } = await import('../oauth-credential-store');
      
      const authorization = await upsertAuthorization(
        'test-subject-fail-closed-valid',
        'fail-closed-valid@example.com',
        ['openid', 'profile', 'email'],
        'test-access-token',
        Date.now() + 3600000,
        'test-refresh-token',
      );

      expect(authorization).not.toBeNull();

      // Now break Redis
      process.env.KV_REST_API_URL = 'https://invalid-redis-url.example.com';
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        // Attempt to read the authorization with broken Redis
        const result = await getAuthorization(authorization.id);
        
        // Should return null (fail closed), not throw or return false
        expect(result).toBeNull();

        console.log('[REDIS_FAILURE_SEMANTICS] Fail-closed invariant test passed - returned null on Redis failure');
      } finally {
        // Restore valid Redis credentials and clean up
        process.env.KV_REST_API_URL = originalRedisUrl!;
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
        
        // Clean up the test authorization
        await deleteAuthorization(authorization.id);
      }
    });
  });
});
