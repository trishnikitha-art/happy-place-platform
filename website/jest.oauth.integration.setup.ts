/**
 * OAuth Integration Test Setup
 * 
 * This setup file configures environment variables for real Redis-backed OAuth integration tests.
 * These tests use actual Redis connectivity rather than mocks to prove the real data plane.
 */

// Set environment variables for real Redis testing
process.env.KV_REST_API_URL = process.env.KV_REST_API_URL || 'https://test.redis.com';
process.env.KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || 'test-token';
process.env.NODE_ENV = 'test';

// Set encryption key for OAuth credential tests
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-bytes-long';

// Mock browser cookies only (Next.js headers)
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

console.log('[OAUTH_INTEGRATION_SETUP] Real Redis integration tests configured');
console.log('[OAUTH_INTEGRATION_SETUP] Redis URL:', process.env.KV_REST_API_URL);
console.log('[OAUTH_INTEGRATION_SETUP] Environment:', process.env.NODE_ENV);