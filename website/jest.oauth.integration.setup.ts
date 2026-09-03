/**
 * OAuth Integration Test Setup
 * 
 * This setup file configures environment variables for REAL Redis-backed OAuth integration tests.
 * These tests use ACTUAL Redis connectivity to prove the real data plane.
 * 
 * CRITICAL: This setup FAILS CLOSED if required credentials are missing.
 * No fake credentials are used - these tests require real Redis connectivity.
 * 
 * P0 FIX: Removed unconditional Redis mock. If real KV credentials are present,
 * the tests use REAL @upstash/redis. If credentials are missing, tests fail closed.
 */

// P0: Fail closed if Redis credentials are missing
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  console.error('[OAUTH_INTEGRATION_SETUP] REAL_REDIS_CREDENTIALS_MISSING');
  console.error('[OAUTH_INTEGRATION_SETUP] Integration tests require KV_REST_API_URL and KV_REST_API_TOKEN');
  console.error('[OAUTH_INTEGRATION_SETUP] These tests CANNOT run with fake credentials');
  console.error('[OAUTH_INTEGRATION_SETUP] CI must provide real Upstash KV credentials');
  throw new Error('Integration tests require real Redis credentials (KV_REST_API_URL and KV_REST_API_TOKEN)');
}

console.log('[OAUTH_INTEGRATION_SETUP] REAL_REDIS_CREDENTIALS_PRESENT');
console.log('[OAUTH_INTEGRATION_SETUP] Using REAL @upstash/redis for integration tests');

// P0: Fail closed if encryption key is missing
// Uses current production encryption contract (ENCRYPTION_KEY = key version 0)
if (!process.env.ENCRYPTION_KEY) {
  console.error('[OAUTH_INTEGRATION_SETUP] ENCRYPTION_KEY_MISSING');
  console.error('[OAUTH_INTEGRATION_SETUP] Integration tests require ENCRYPTION_KEY');
  throw new Error('Integration tests require ENCRYPTION_KEY');
}

// Optional: ENCRYPTION_KEY_V1 only required for key rotation tests
// If not present, key rotation tests will be skipped
if (!process.env.ENCRYPTION_KEY_V1) {
  console.warn('[OAUTH_INTEGRATION_SETUP] ENCRYPTION_KEY_V1_MISSING');
  console.warn('[OAUTH_INTEGRATION_SETUP] Key rotation tests will be skipped');
  console.warn('[OAUTH_INTEGRATION_SETUP] Current production uses ENCRYPTION_KEY (key version 0)');
} else {
  console.log('[OAUTH_INTEGRATION_SETUP] ENCRYPTION_KEY_V1_PRESENT');
  console.log('[OAUTH_INTEGRATION_SETUP] Key rotation tests will execute');
}

console.log('[OAUTH_INTEGRATION_SETUP] ENCRYPTION_KEYS_PRESENT');

// NO MOCK: @upstash/redis is NOT mocked for integration tests
// These tests use REAL Redis connectivity to prove:
// - Real Lua script execution
// - Real atomic operations
// - Real TTL behavior
// - Real concurrency handling
// - Real failure semantics

// Set environment variables for real Redis testing
process.env.NODE_ENV = 'test';

// Set unique test namespace to avoid conflicts with production data
// This ensures integration tests never touch production application records
const testNamespace = `hpp:test:${Date.now()}:`;
process.env.TEST_NAMESPACE = testNamespace;

// Mock browser cookies properly for integration tests
// These are safe to mock since we're testing Redis behavior, not browser behavior
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'mock-cookie-value' })),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

console.log('[OAUTH_INTEGRATION_SETUP] REAL_REDIS_INTEGRATION_TESTS_CONFIGURED');
console.log('[OAUTH_INTEGRATION_SETUP] Redis URL:', process.env.KV_REST_API_URL);
console.log('[OAUTH_INTEGRATION_SETUP] Environment:', process.env.NODE_ENV);
console.log('[OAUTH_INTEGRATION_SETUP] Test namespace:', testNamespace);
console.log('[OAUTH_INTEGRATION_SETUP] @upstash/redis: REAL (NOT MOCKED)');
console.log('[OAUTH_INTEGRATION_SETUP] These tests provide PROVEN REAL REDIS runtime evidence');