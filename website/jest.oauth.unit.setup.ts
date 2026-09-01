/**
 * OAuth Unit Test Setup
 * 
 * This setup file configures environment variables for OAuth unit tests.
 * Unit tests MAY mock Redis for testing logic in isolation from infrastructure.
 * These tests prove code logic, not Redis runtime behavior.
 */

// Set environment variables for unit testing
process.env.KV_REST_API_URL = 'https://test.redis.com';
process.env.KV_REST_API_TOKEN = 'test-token';
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Mock browser cookies (Next.js headers)
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock Redis for unit tests (allowed for unit tests)
jest.mock('@upstash/redis', () => {
  function Redis(this: unknown, ...args: unknown[]) {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      eval: jest.fn().mockResolvedValue(1),
    };
  }
  return { Redis };
});

console.log('[OAUTH_UNIT_SETUP] OAuth unit tests configured with Redis mocks');
console.log('[OAUTH_UNIT_SETUP] These tests prove code logic, NOT Redis runtime behavior');
console.log('[OAUTH_UNIT_SETUP] For Redis runtime proof, use jest.oauth.integration.config.ts');