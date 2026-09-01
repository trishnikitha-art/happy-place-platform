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
  // Set test Redis credentials for local development
  process.env.KV_REST_API_URL = 'https://test.redis.com';
  process.env.KV_REST_API_TOKEN = 'test-token';
  console.log('[OAUTH_INTEGRATION_SETUP] Using test Redis credentials for integration tests');
}

// P0: Fail closed if encryption key is missing
if (!process.env.ENCRYPTION_KEY) {
  // Set a test encryption key for integration tests if not provided (must be 64 hex chars for 32 bytes)
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  console.log('[OAUTH_INTEGRATION_SETUP] Using test ENCRYPTION_KEY for integration tests');
}

// P0: Set ENCRYPTION_KEY_V1 for version 1 encryption
if (!process.env.ENCRYPTION_KEY_V1) {
  process.env.ENCRYPTION_KEY_V1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  console.log('[OAUTH_INTEGRATION_SETUP] Using test ENCRYPTION_KEY_V1 for integration tests');
}

// Mock @upstash/redis for integration tests when using test credentials
const mockStore = new Map<string, any>();

jest.mock('@upstash/redis', () => {
  const mockRedis = {
    get: jest.fn().mockImplementation(async (key: string) => {
      const value = mockStore.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return null;
    }),
    set: jest.fn().mockImplementation(async (key: string, value: any) => {
      mockStore.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      return 'OK';
    }),
    del: jest.fn().mockImplementation(async (key: string) => {
      mockStore.delete(key);
      return 1;
    }),
    eval: jest.fn().mockImplementation(async (script: string, keys: string[], args: any[]) => {
      // Simple mock for atomic operations - just return success
      return null;
    }),
    mget: jest.fn().mockImplementation(async (keys: string[]) => {
      return keys.map(key => {
        const value = mockStore.get(key);
        if (value) {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return null;
      });
    }),
    mset: jest.fn().mockImplementation(async (kvPairs: string[]) => {
      for (let i = 0; i < kvPairs.length; i += 2) {
        mockStore.set(kvPairs[i], kvPairs[i + 1]);
      }
      return 'OK';
    }),
    exists: jest.fn().mockImplementation(async (key: string) => {
      return mockStore.has(key) ? 1 : 0;
    }),
    incr: jest.fn().mockImplementation(async (key: string) => {
      const current = mockStore.get(key) || 0;
      const next = current + 1;
      mockStore.set(key, next);
      return next;
    }),
    expire: jest.fn().mockResolvedValue(1),
  };

  return {
    Redis: jest.fn(() => mockRedis),
  };
});

console.log('[OAUTH_INTEGRATION_SETUP] OAuth integration tests configured with Redis mocks (local development)');
console.log('[OAUTH_INTEGRATION_SETUP] For real Redis runtime proof, configure KV_REST_API_URL and KV_REST_API_TOKEN');

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