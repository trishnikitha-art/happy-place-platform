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
const mockStateStore = new Map<string, any>();

jest.mock('@upstash/redis', () => {
  function Redis(this: unknown, ...args: unknown[]) {
    return {
      get: jest.fn().mockImplementation(async (key: string) => {
        const value = mockStateStore.get(key);
        if (value) {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return null;
      }),
      set: jest.fn().mockImplementation(async (key: string, value: any, options?: any) => {
        // If value is an object (state record), store it as JSON
        if (typeof value === 'object' && value !== null) {
          mockStateStore.set(key, JSON.stringify(value));
        } else {
          mockStateStore.set(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
        return 'OK';
      }),
      del: jest.fn().mockImplementation(async (key: string) => {
        mockStateStore.delete(key);
        return 1;
      }),
      expire: jest.fn().mockResolvedValue(1),
      eval: jest.fn().mockImplementation(async (script: string, keys: string[], args: any[]) => {
        // Implement atomic state consumption Lua script
        if (script.includes('consumed') || script.includes('KEEPTTL')) {
          const key = keys[0];
          const stateArg = args[0];
          const browserBindingArg = args[1];
          
          const recordData = mockStateStore.get(key);
          if (!recordData) {
            return 0; // State not found
          }
          
          const record = JSON.parse(recordData);
          
          // Check if already consumed
          if (record.consumed === true) {
            return 0;
          }
          
          // Check browser binding if provided
          if (browserBindingArg && record.browserBinding !== browserBindingArg) {
            return 0;
          }
          
          // Mark as consumed atomically
          record.consumed = true;
          mockStateStore.set(key, JSON.stringify(record));
          
          return 1; // Success
        }
        
        // Default eval behavior
        return 1;
      }),
    };
  }
  return { Redis };
});

console.log('[OAUTH_UNIT_SETUP] OAuth unit tests configured with Redis mocks');
console.log('[OAUTH_UNIT_SETUP] These tests prove code logic, NOT Redis runtime behavior');
console.log('[OAUTH_UNIT_SETUP] For Redis runtime proof, use jest.oauth.integration.config.ts');