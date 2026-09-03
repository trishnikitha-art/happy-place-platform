/**
 * Unified Environment Detection
 * 
 * Single authoritative source of truth for environment detection across all modules.
 * Prevents namespace mismatches and cross-environment contamination.
 * 
 * FAILS CLOSED on unknown environments - no silent defaults.
 */

type Environment = 'production' | 'preview' | 'development' | 'test';

export function getEnvironment(): Environment {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  
  // Vercel production
  if (vercelEnv === 'production') {
    return 'production';
  }
  
  // Vercel preview
  if (vercelEnv === 'preview') {
    return 'preview';
  }
  
  // Local development
  if (nodeEnv === 'development') {
    return 'development';
  }
  
  // Test environment
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  // P0 FIX: Fail closed on unknown environment
  // Unknown/missing environment must not silently default to development
  // This prevents production-like execution from accidentally routing into development namespace
  throw new Error(
    `Unknown environment: VERCEL_ENV=${vercelEnv}, NODE_ENV=${nodeEnv}. ` +
    'Environment must be explicitly configured. Cannot proceed with unsafe default.'
  );
}

export function getKvNamespace(): string {
  // CRITICAL: Use TEST_NAMESPACE if present for integration test isolation
  // This prevents tests from writing to production/development data
  if (process.env.TEST_NAMESPACE) {
    return process.env.TEST_NAMESPACE;
  }
  
  const env = getEnvironment();
  return `hpp:${env}:`;
}

export type { Environment };
