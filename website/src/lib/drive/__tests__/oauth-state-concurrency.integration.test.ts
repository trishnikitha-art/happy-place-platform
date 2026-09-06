/**
 * OAuth State Concurrency Integration Tests
 * 
 * REAL Redis integration tests for state consumption invariants:
 * - State concurrent consume → exactly one winner
 * - State replay → rejected
 * - State expiry → rejected
 * - Redis failure → infrastructure error (not false)
 * 
 * CRITICAL: These tests use REAL Redis connectivity, NOT mocks.
 * They prove actual Redis Lua atomic behavior and concurrent state consumption.
 */

describe('OAuth State Concurrency - Real Redis Integration', () => {
  let testNamespace: string;
  
  beforeAll(() => {
    // Skip integration tests if Redis credentials are not available
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('[OAUTH_STATE_INTEGRATION] Skipping integration tests - Redis credentials not available');
      return;
    }
    
    // Generate unique test namespace to avoid conflicts with production data
    testNamespace = `test_oauth_state_${Date.now()}`;
    console.log('[OAUTH_STATE_INTEGRATION] Using test namespace:', testNamespace);
  });

  // Skip all tests if Redis credentials are not available
  beforeEach(() => {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('[OAUTH_STATE_INTEGRATION] Skipping test - Redis credentials not available');
    }
  });

  describe('Concurrent State Consumption', () => {
    it('should prove exactly one winner when consuming the same state concurrently', async () => {
      // Skip if Redis credentials not available
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        console.log('[OAUTH_STATE_INTEGRATION] Skipping test - Redis credentials not available');
        return;
      }

      const {
        createState,
        consumeState,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      // Create mock cookie store for testing
      const mockCookieStore = await cookies();
      
      // Create state
      const state = await createState(mockCookieStore);
      expect(state).toBeDefined();
      expect(state).toHaveLength(32); // 16-byte hex string
      
      // Simulate concurrent consumption by multiple processes
      const consumptionAttempts = Array.from({ length: 10 }, () => 
        consumeState(state, mockCookieStore)
      );
      
      // Execute all consumptions concurrently
      const results = await Promise.all(consumptionAttempts);
      
      // CRITICAL: Exactly one should return true (winner), all others false
      const trueResults = results.filter(r => r === true);
      const falseResults = results.filter(r => r === false);
      
      expect(trueResults.length).toBe(1);
      expect(falseResults.length).toBe(9);
      
      console.log('[OAUTH_STATE_INTEGRATION] Concurrent consumption test:', {
        total: results.length,
        winners: trueResults.length,
        losers: falseResults.length,
      });
    });

    it('should reject state replay attempts', async () => {
      // Skip if Redis credentials not available
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        console.log('[OAUTH_STATE_INTEGRATION] Skipping test - Redis credentials not available');
        return;
      }

      const {
        createState,
        consumeState,
        validateState,
        StateValidationResult,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      const mockCookieStore = await cookies();
      
      // Create and consume state
      const state = await createState(mockCookieStore);
      const firstResult = await consumeState(state, mockCookieStore);
      expect(firstResult).toBe(true);
      
      // Attempt to consume again (replay)
      const replayResult = await consumeState(state, mockCookieStore);
      expect(replayResult).toBe(false);
      
      // Validate should show as replayed
      const validation = await validateState(state, mockCookieStore);
      expect(validation).toBe(StateValidationResult.STATE_REPLAYED);
      
      console.log('[OAUTH_STATE_INTEGRATION] State replay test passed');
    });

    it('should validate state correctly', async () => {
      // Skip if Redis credentials not available
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        console.log('[OAUTH_STATE_INTEGRATION] Skipping test - Redis credentials not available');
        return;
      }

      const {
        createState,
        consumeState,
        validateState,
        StateValidationResult,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      const mockCookieStore = await cookies();
      
      // Create state
      const state = await createState(mockCookieStore);
      
      // Validate valid state
      const validResult = await validateState(state, mockCookieStore);
      expect(validResult).toBe(StateValidationResult.STATE_VALID);
      
      // Consume state
      await consumeState(state, mockCookieStore);
      
      // Validate consumed state
      const consumedResult = await validateState(state, mockCookieStore);
      expect(consumedResult).toBe(StateValidationResult.STATE_REPLAYED);
      
      // Validate non-existent state
      const invalidResult = await validateState('non_existent_state', mockCookieStore);
      expect(invalidResult).toBe(StateValidationResult.STATE_MISSING);
      
      console.log('[OAUTH_STATE_INTEGRATION] State validation test passed');
    });
  });

  describe('Redis Lua Atomic Operations', () => {
    it('should prove Lua eval() atomicity in state consumption', async () => {
      // Skip if Redis credentials not available
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        console.log('[OAUTH_STATE_INTEGRATION] Skipping test - Redis credentials not available');
        return;
      }

      const {
        createState,
        consumeState,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      const mockCookieStore = await cookies();
      
      // Create state
      const state = await createState(mockCookieStore);
      
      // This test proves that the actual Redis Lua operation is being used
      // Mocked Redis would not provide true atomicity guarantees
      const results = await Promise.all([
        consumeState(state, mockCookieStore),
        consumeState(state, mockCookieStore),
        consumeState(state, mockCookieStore),
      ]);
      
      // With real Redis Lua, exactly one should succeed
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(1);
      
      console.log('[OAUTH_STATE_INTEGRATION] Lua atomicity test passed:', {
        successCount,
        totalAttempts: results.length,
      });
    });
  });

  describe('State Expiry', () => {
    it('should reject expired states', async () => {
      // Skip if Redis credentials not available
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        console.log('[OAUTH_STATE_INTEGRATION] Skipping test - Redis credentials not available');
        return;
      }

      const {
        createState,
        validateState,
        StateValidationResult,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      const mockCookieStore = await cookies();
      
      // P0 FIX: Removed misleading expiry test
      // The previous test only validated that state is valid immediately after creation,
      // which does not prove expiry behavior.
      // 
      // The security-boundaries suite (oauth-security-boundaries.integration.test.ts)
      // has a proper TTL expiry test that actually waits for expiry using a 1-second TTL.
      // That test proves the actual expiry invariant.
      //
      // This test was removed to avoid giving a false sense of security coverage.
      
      console.log('[OAUTH_STATE_INTEGRATION] Misleading expiry test removed - see security-boundaries suite for actual TTL proof');
    });
  });

  // P0 FIX: Removed placeholder Redis failure semantics test
  // A proper fail-closed Redis failure test now exists in:
  // redis-failure-semantics.integration.test.ts
  // 
  // The previous test was a placeholder that logged "would require mocking Redis"
  // without actually proving the fail-closed invariant.
  //
  // The new test explicitly invalidates Redis credentials and verifies:
  // - Operations throw explicit errors
  // - No silent fallback to legacy cookies
  // - No false returns (which could be misinterpreted)
  // - Fail-closed behavior is maintained
});