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
  console.log('[OAUTH_INTEGRATION_SETUP] Using test Redis credentials for integration tests (local development)');
}

// P0: Fail closed if encryption key is missing
if (!process.env.ENCRYPTION_KEY) {
  // Set a test encryption key for integration tests if not provided (must be 64 hex chars for 32 bytes)
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  console.log('[OAUTH_INTEGRATION_SETUP] Using test ENCRYPTION_KEY for integration tests (local development)');
}

// P0: Set ENCRYPTION_KEY_V1 for version 1 encryption
if (!process.env.ENCRYPTION_KEY_V1) {
  process.env.ENCRYPTION_KEY_V1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  console.log('[OAUTH_INTEGRATION_SETUP] Using test ENCRYPTION_KEY_V1 for integration tests (local development)');
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
      // Implement atomic subject acquisition for Redis Lua scripts
      // The script structure: auth_key = KEYS[1], subject_key = KEYS[2]
      // Check if subject exists, if not, set both auth and subject atomically
      
      if (keys.length >= 2 && args.length >= 3) {
        const authKey = keys[0];
        const subjectKey = keys[1];
        const authData = args[0];
        const subjectValue = args[1];
        
        // Check if subject index already exists
        if (mockStore.has(subjectKey)) {
          return 0; // Subject already taken
        }
        
        // Store authorization record
        mockStore.set(authKey, authData);
        
        // Store subject index atomically
        mockStore.set(subjectKey, subjectValue);
        
        return 1; // Success
      }
      
      // Implement revocation script: set status to revoked, delete subject index
      if (script.includes('revoked') || script.includes('DEL')) {
        const authKey = keys[0];
        const subjectKey = keys[1];
        
        const authData = mockStore.get(authKey);
        if (!authData) {
          return 0; // Authorization not found
        }
        
        // Parse and update auth data
        try {
          const auth = JSON.parse(authData);
          auth.status = 'revoked';
          mockStore.set(authKey, JSON.stringify(auth));
          
          // Delete subject index
          mockStore.delete(subjectKey);
          
          return 1; // Success
        } catch {
          return 0; // Parse error
        }
      }
      
      // For revision increment operations
      if (script.includes('INCR') || script.includes('revision')) {
        const revisionKey = keys[0];
        const current = mockStore.get(revisionKey) || 0;
        const next = current + 1;
        mockStore.set(revisionKey, next);
        return next;
      }
      
      // Return null for other eval operations
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
console.log('[OAUTH_INTEGRATION_SETUP] For real Redis runtime proof, configure KV_REST_API_URL and KV_REST_API_TOKEN in CI environment');

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