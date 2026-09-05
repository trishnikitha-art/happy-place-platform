/**
 * Inspect OAuth Authorizations in KV
 *
 * This script inspects existing OAuth authorization records to identify
 * which authorizations are dead/invalid and need revocation/re-authentication.
 *
 * This is diagnostic only - it does not modify KV.
 *
 * Usage:
 *   node scripts/inspect-oauth-authorizations.mjs
 */

import { Redis } from '@upstash/redis';

/**
 * Get environment - matches oauth-credential-store.ts logic
 */
function getEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  
  if (vercelEnv === 'production') {
    return 'production';
  }
  
  if (vercelEnv === 'preview') {
    return 'preview';
  }
  
  if (nodeEnv === 'development') {
    return 'development';
  }
  
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  console.warn('[INSPECT] Unknown environment, defaulting to development');
  return 'development';
}

/**
 * Get KV namespace prefix - matches oauth-credential-store.ts logic
 */
function getKvNamespace() {
  if (process.env.TEST_NAMESPACE) {
    return process.env.TEST_NAMESPACE;
  }
  
  const env = getEnvironment();
  return `hpp:${env}:`;
}

/**
 * Apply namespace prefix to KV key
 */
function namespacedKey(key) {
  const namespace = getKvNamespace();
  return `${namespace}${key}`;
}

function getRedisClient() {
  let url = process.env.KV_REST_API_URL;
  let token = process.env.KV_REST_API_TOKEN;

  const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
  const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;

  if (!url && integrationUrl) {
    url = integrationUrl;
  }
  if (!token && integrationToken) {
    token = integrationToken;
  }

  if (!url || !token) {
    console.error('[INSPECT] KV credentials not configured');
    return null;
  }

  const redis = new Redis({ url, token });
  
  console.log('[INSPECT] Redis client configured', {
    environment: getEnvironment(),
    namespace: getKvNamespace(),
  });
  
  return redis;
}

async function inspectOAuthAuthorizations() {
  console.log('[INSPECT] Starting OAuth authorization inspection...');
  
  const redis = getRedisClient();
  if (!redis) {
    console.error('[INSPECT] Cannot inspect: KV client not available');
    process.exit(1);
  }

  console.log('[INSPECT] KV namespace configuration', {
    environment: getEnvironment(),
    namespace: getKvNamespace(),
  });

  const AUTH_PREFIX = 'auth:';
  const namespace = getKvNamespace();
  const pattern = `${namespace}${AUTH_PREFIX}*`;

  console.log('[INSPECT] Scanning for authorization records with pattern:', pattern);

  let totalAuthorizations = 0;
  const authorizations = [];

  try {
    // Scan for all auth keys
    const keys = [];
    let cursor = 0;
    
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== 0);

    console.log(`[INSPECT] Found ${keys.length} authorization keys`);

    // Inspect each authorization
    for (const key of keys) {
      totalAuthorizations++;
      const value = await redis.get(key);
      
      if (!value) {
        console.log(`[INSPECT] SKIP: ${key} - no value`);
        continue;
      }

      let auth;
      try {
        auth = JSON.parse(value);
      } catch (e) {
        console.error(`[INSPECT] ERROR: ${key} - failed to parse JSON`);
        continue;
      }

      const authId = key.replace(namespace + AUTH_PREFIX, '');
      
      authorizations.push({
        id: authId,
        googleSubject: auth.googleSubject,
        email: auth.email,
        scopes: auth.scopes,
        createdAt: auth.createdAt,
        updatedAt: auth.updatedAt,
        hasAccessToken: !!auth.accessToken,
        hasRefreshToken: !!auth.refreshToken,
        expiresAt: auth.expiresAt,
      });

      console.log(`[INSPECT] AUTHORIZATION: ${authId}`);
      console.log(`  googleSubject: ${auth.googleSubject}`);
      console.log(`  email: ${auth.email}`);
      console.log(`  createdAt: ${auth.createdAt}`);
      console.log(`  updatedAt: ${auth.updatedAt}`);
      console.log(`  hasAccessToken: ${!!auth.accessToken}`);
      console.log(`  hasRefreshToken: ${!!auth.refreshToken}`);
      console.log(`  expiresAt: ${auth.expiresAt}`);
    }

    console.log('\n[INSPECT] SUMMARY');
    console.log('================');
    console.log(`Total authorizations: ${totalAuthorizations}`);
    console.log(`Authorizations with refresh tokens: ${authorizations.filter(a => a.hasRefreshToken).length}`);
    console.log(`Authorizations with access tokens: ${authorizations.filter(a => a.hasAccessToken).length}`);

    if (authorizations.length > 0) {
      console.log('\n[INSPECT] AUTHORIZATION DETAILS:');
      authorizations.forEach(auth => {
        console.log(`\nID: ${auth.id}`);
        console.log(`  Google Subject: ${auth.googleSubject}`);
        console.log(`  Email: ${auth.email}`);
        console.log(`  Created: ${auth.createdAt}`);
        console.log(`  Updated: ${auth.updatedAt}`);
        console.log(`  Access Token: ${auth.hasAccessToken ? 'present' : 'missing'}`);
        console.log(`  Refresh Token: ${auth.hasRefreshToken ? 'present' : 'missing'}`);
        console.log(`  Expires At: ${auth.expiresAt || 'not set'}`);
      });
    }

    console.log('\n[INSPECT] RECOMMENDATION:');
    if (totalAuthorizations === 0) {
      console.log('No authorizations found. User needs to authorize via /api/drive/oauth/authorize');
    } else {
      console.log('To test if authorization is valid, try:');
      console.log('  1. GET /api/drive/auth/status');
      console.log('  2. GET /api/drive/discovery');
      console.log('If invalid_grant, revoke old authorization and re-authorize.');
    }

  } catch (error) {
    console.error('[INSPECT] Fatal error:', error);
    process.exit(1);
  }
}

inspectOAuthAuthorizations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[INSPECT] Fatal error:', error);
    process.exit(1);
  });
