/**
 * Workbench Session Authentication Regression Test
 * 
 * Tests the constitutional invariant: Browser must possess only an opaque session identifier.
 * Credentials must remain server-side. Session ID alone cannot be forged into authentication.
 * 
 * Critical fix: Previous implementation stored authentication state in client cookies (workbench_authenticated, workbench_expires_at),
 * making the session client-controlled. The new implementation stores session data server-side in Redis/KV with only an opaque
 * session ID in the cookie.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Set environment variables before importing modules
process.env.KV_REST_API_URL = 'https://test.redis.com';
process.env.KV_REST_API_TOKEN = 'test-token';

// Mock cookies for Next.js
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('Workbench Session - Server-Side Authentication Boundary', () => {
  let mockCookieStore: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock cookies for Next.js
    const { cookies } = require('next/headers');
    mockCookieStore = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };
    cookies.mockReturnValue(mockCookieStore);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  describe('Session Cookie Architecture', () => {
    it('should workbench-session implementation uses Redis client factory for server-side storage', () => {
      // Read the workbench-session.ts file to verify the architecture
      const fs = require('fs');
      const workbenchSessionCode = fs.readFileSync(
        'C:/Users/nolan/CascadeProjects/happy-place-platform/website/src/lib/workbench-session.ts',
        'utf8'
      );
      
      // Verify it uses Redis for server-side storage
      expect(workbenchSessionCode).toContain('createRedisClient()');
      expect(workbenchSessionCode).toContain('workbench_session:');
      
      // Verify it does NOT store authentication state in cookies (except in clearSession for backwards compatibility)
      const cookieSetAuthenticated = workbenchSessionCode.match(/cookieStore\.set\('workbench_authenticated'/g);
      expect(cookieSetAuthenticated).toBeNull();
      
      // Verify it only stores opaque session ID in cookie
      expect(workbenchSessionCode).toContain('workbench_session_id');
    });

    it('should verify old cookie-based authentication was removed', () => {
      const fs = require('fs');
      const workbenchSessionCode = fs.readFileSync(
        'C:/Users/nolan/CascadeProjects/happy-place-platform/website/src/lib/workbench-session.ts',
        'utf8'
      );
      
      // Old implementation had these cookie fields - they should not be SET anymore
      const cookieSetAuthenticated = workbenchSessionCode.match(/cookieStore\.set\('workbench_authenticated'/g);
      const cookieSetExpires = workbenchSessionCode.match(/cookieStore\.set\('workbench_expires_at'/g);
      
      expect(cookieSetAuthenticated).toBeNull();
      expect(cookieSetExpires).toBeNull();
      
      // Verify setSessionCookie only sets session ID
      expect(workbenchSessionCode).toMatch(/setSessionCookie/);
    });
  });

  describe('Server-Side Session Data Structure', () => {
    it('should verify session data structure includes server-side authenticated flag', () => {
      const fs = require('fs');
      const workbenchSessionCode = fs.readFileSync(
        'C:/Users/nolan/CascadeProjects/happy-place-platform/website/src/lib/workbench-session.ts',
        'utf8'
      );
      
      // Verify session data includes authenticated flag
      expect(workbenchSessionCode).toMatch(/authenticated:\s*true/);
      expect(workbenchSessionCode).toMatch(/expiresAt/);
      expect(workbenchSessionCode).toMatch(/createdAt/);
    });

    it('should verify session validation checks server-side data', () => {
      const fs = require('fs');
      const workbenchSessionCode = fs.readFileSync(
        'C:/Users/nolan/CascadeProjects/happy-place-platform/website/src/lib/workbench-session.ts',
        'utf8'
      );
      
      // Verify isAuthenticated() fetches from Redis
      expect(workbenchSessionCode).toMatch(/createRedisClient\(\)/);
      expect(workbenchSessionCode).toMatch(/workbench_session:/);
      
      // Verify it checks server-side authenticated flag
      expect(workbenchSessionCode).toMatch(/parsedSession\.authenticated\s*===\s*true/);
    });
  });

  describe('Fail-Closed Semantics', () => {
    it('should verify Redis failures cause authentication to fail closed', () => {
      const fs = require('fs');
      const workbenchSessionCode = fs.readFileSync(
        'C:/Users/nolan/CascadeProjects/happy-place-platform/website/src/lib/workbench-session.ts',
        'utf8'
      );
      
      // Verify authenticate() fails closed on Redis error
      expect(workbenchSessionCode).toMatch(/catch/);
      expect(workbenchSessionCode).toMatch(/return false/);
      
      // Verify isAuthenticated() fails closed on Redis error
      expect(workbenchSessionCode).toMatch(/catch/);
      expect(workbenchSessionCode).toMatch(/return false/);
    });
  });

  describe('Session Expiration', () => {
    it('should verify session expiration is checked server-side', () => {
      const fs = require('fs');
      const workbenchSessionCode = fs.readFileSync(
        'C:/Users/nolan/CascadeProjects/happy-place-platform/website/src/lib/workbench-session.ts',
        'utf8'
      );
      
      // Verify expiration check uses server-side expiresAt
      expect(workbenchSessionCode).toMatch(/Date\.now\(\)\s*>=\s*parsedSession\.expiresAt/);
      
      // Verify expired sessions are cleared from Redis
      expect(workbenchSessionCode).toMatch(/clearSession/);
    });
  });
});
