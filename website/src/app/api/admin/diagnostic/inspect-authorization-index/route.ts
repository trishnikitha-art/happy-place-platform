/**
 * Authorization Index Consistency Diagnostic
 * 
 * Inspects the relationship between subject index and authorization records
 * to identify data-integrity issues like:
 * - Subject index pointing to missing authorization
 * - Authorization without subject index
 * - Invalid/revoked authorizations still indexed
 * 
 * POST /api/admin/diagnostic/inspect-authorization-index
 * 
 * Requires Workbench authentication (admin authorization boundary)
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getAuthorization } from '@/lib/drive/oauth-credential-store';
import { Redis } from '@upstash/redis';

interface IndexIssue {
  type: 'SUBJECT_INDEX_MISSING_AUTH' | 'AUTH_WITHOUT_SUBJECT_INDEX' | 'INVALID_AUTH_INDEXED' | 'STALE_INDEX';
  subject?: string;
  authorizationId?: string;
  details?: string;
}

interface DiagnosticResult {
  testId: string;
  startTime: string;
  endTime: string;
  deploymentSha: string;
  environment: string;
  totalAuthorizations: number;
  totalSubjectIndexes: number;
  consistentCount: number;
  issues: IndexIssue[];
  verdict: 'CONSISTENT' | 'INCONSISTENT' | 'ERROR';
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const testId = `authorization-index-inspection-${Date.now()}`;
  const startTime = new Date().toISOString();
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  
  console.log('[AUTHORIZATION_INDEX_INSPECTION] TEST_STARTED', { testId, startTime, deploymentSha, environment });

  // REQUIRE ADMIN AUTHORIZATION
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      error: 'Unauthorized',
      message: 'Workbench authentication required',
      verdict: 'FAILED',
    }, { status: 401 });
  }

  try {
    // Create Redis client
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const issues: IndexIssue[] = [];
    let totalAuthorizations = 0;
    let totalSubjectIndexes = 0;
    let consistentCount = 0;

    // Get Redis namespace
    const namespace = environment === 'production' ? 'hpp:production:' : `hpp:${environment}:`;
    const authPrefix = `${namespace}drive:auth:`;
    const subjectPrefix = `${namespace}drive:auth:subject:`;

    // Step 1: Scan all authorization records
    // Use explicit pattern to avoid matching subject indexes or session indexes
    const authKeys = [];
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, {
        match: `${authPrefix}*`,
        count: 100,
      });
      cursor = result[0] as string;
      const keys = result[1] as string[];
      // Filter out subject indexes and session indexes
      const pureAuthKeys = keys.filter(key => 
        !key.includes(':subject:') && !key.includes(':sessions:')
      );
      authKeys.push(...pureAuthKeys);
    } while (cursor !== '0');

    totalAuthorizations = authKeys.length;
    console.log('[AUTHORIZATION_INDEX_INSPECTION] Authorizations scanned', { testId, count: totalAuthorizations });

    // Step 2: Scan all subject indexes
    const subjectKeys = [];
    cursor = '0';
    do {
      const result = await redis.scan(cursor, {
        match: `${subjectPrefix}*`,
        count: 100,
      });
      cursor = result[0] as string;
      const keys = result[1] as string[];
      subjectKeys.push(...keys);
    } while (cursor !== '0');

    totalSubjectIndexes = subjectKeys.length;
    console.log('[AUTHORIZATION_INDEX_INSPECTION] Subject indexes scanned', { testId, count: totalSubjectIndexes });

    // Step 3: Check each subject index points to valid authorization
    for (const subjectKey of subjectKeys) {
      const subject = subjectKey.replace(subjectPrefix, '');
      const authorizationId = await redis.get<string>(subjectKey);

      if (!authorizationId) {
        // Subject index exists but has no value - stale index
        issues.push({
          type: 'STALE_INDEX',
          subject: subject.substring(0, 8) + '...',
          details: 'Subject index exists but has no authorization ID value',
        });
        continue;
      }

      const authKey = `${authPrefix}${authorizationId}`;
      const auth = await redis.get(authKey);

      if (!auth) {
        // Subject index points to missing authorization
        issues.push({
          type: 'SUBJECT_INDEX_MISSING_AUTH',
          subject: subject.substring(0, 8) + '...',
          authorizationId: authorizationId.substring(0, 8) + '...',
          details: 'Subject index points to authorization that does not exist',
        });
        continue;
      }

      try {
        // Handle both string and already-deserialized Redis objects
        const authRecord = typeof auth === 'string' ? JSON.parse(auth) : auth;
        
        // Check if authorization is valid
        if (authRecord.status === 'revoked' || authRecord.status === 'expired') {
          issues.push({
            type: 'INVALID_AUTH_INDEXED',
            subject: subject.substring(0, 8) + '...',
            authorizationId: authorizationId.substring(0, 8) + '...',
            details: `Authorization has status: ${authRecord.status}`,
          });
        } else if (authRecord.status === 'active') {
          consistentCount++;
        }
      } catch (parseError) {
        issues.push({
          type: 'INVALID_AUTH_INDEXED',
          subject: subject.substring(0, 8) + '...',
          authorizationId: authorizationId.substring(0, 8) + '...',
          details: 'Authorization record cannot be parsed',
        });
      }
    }

    // Step 4: Check for authorizations without subject indexes
    for (const authKey of authKeys) {
      const authorizationId = authKey.replace(authPrefix, '');
      const auth = await redis.get(authKey);

      if (!auth) continue;

      try {
        // Handle both string and already-deserialized Redis objects
        const authRecord = typeof auth === 'string' ? JSON.parse(auth) : auth;
        const subjectKey = `${subjectPrefix}${authRecord.googleSubject}`;
        const subjectIndexExists = await redis.exists(subjectKey);

        if (!subjectIndexExists && authRecord.status === 'active') {
          issues.push({
            type: 'AUTH_WITHOUT_SUBJECT_INDEX',
            authorizationId: authorizationId.substring(0, 8) + '...',
            details: 'Active authorization has no subject index',
          });
        }
      } catch (parseError) {
        // Already counted as invalid
      }
    }

    const endTime = new Date().toISOString();
    const verdict = issues.length === 0 ? 'CONSISTENT' : 'INCONSISTENT';

    console.log('[AUTHORIZATION_INDEX_INSPECTION] COMPLETED', {
      testId,
      totalAuthorizations,
      totalSubjectIndexes,
      consistentCount,
      issuesCount: issues.length,
      verdict,
    });

    return NextResponse.json({
      testId,
      startTime,
      endTime,
      deploymentSha,
      environment,
      totalAuthorizations,
      totalSubjectIndexes,
      consistentCount,
      issues,
      issuesCount: issues.length,
      verdict,
    });

  } catch (error) {
    console.error('[AUTHORIZATION_INDEX_INSPECTION] ERROR', {
      testId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      error: 'INSPECTION_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
      verdict: 'ERROR',
    }, { status: 500 });
  }
}
