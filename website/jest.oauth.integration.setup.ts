/**
 * OAuth Integration Test Setup
 * 
 * This setup file configures environment variables for real Redis-backed OAuth integration tests.
 * These tests use actual Redis connectivity rather than mocks to prove the real data plane.
 * 
 * CRITICAL: This setup FAILS CLOSED if required credentials are missing.
 * No fake credentials are used - these tests require real Redis connectivity.
 */

// P0: Fail closed if Redis credentials are missing
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error(
    'OAuth integration tests require real Redis credentials. ' +
    'Missing: KV_REST_API_URL and/or KV_REST_API_TOKEN. ' +
    'These tests use actual Redis, not mocks. Configure GitHub Actions secrets.'
  );
}

// P0: Fail closed if encryption key is missing
if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    'OAuth integration tests require ENCRYPTION_KEY. ' +
    'Configure GitHub Actions secret.'
  );
}

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

console.log('[OAUTH_INTEGRATION_SETUP] Real Redis integration tests configured');
console.log('[OAUTH_INTEGRATION_SETUP] Redis URL:', process.env.KV_REST_API_URL);
console.log('[OAUTH_INTEGRATION_SETUP] Environment:', process.env.NODE_ENV);
console.log('[OAUTH_INTEGRATION_SETUP] Test namespace:', testNamespace);
console.log('[OAUTH_INTEGRATION_SETUP] WARNING: These tests use REAL Redis connectivity');
console.log('[OAUTH_INTEGRATION_SETUP] @upstash/redis is NOT mocked for integration tests');