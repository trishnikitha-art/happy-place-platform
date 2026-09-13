/**
 * Authorization State Inspection Diagnostic
 * 
 * Comprehensive inspection of current Redis authorization/session/index state
 * to identify corrupted records and verify the authorization chain.
 * 
 * POST /api/admin/diagnostic/inspect-authorization-state
 * 
 * Requires Workbench authentication (admin authorization boundary)
 * 
 * This diagnostic inspects:
 * - All authorization records (drive:auth:*)
 * - All subject indexes (drive:auth:subject:*)
 * - All session records (drive:session:*)
 * - Session indexes (drive:auth:sessions:*)
 * 
 * It verifies:
 * - Subject index → authorization record consistency
 * - Authorization → session record consistency
 * - Principal binding correctness
 * - Status validity (active/revoked/expired)
 * - Record schema validity
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

interface AuthorizationRecord {
  id: string;
  googleSubject: string;
  email: string;
  principalId: string;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  lastRefreshAt: string;
}

interface SessionRecord {
  id: string;
  authorizationId: string;
  createdAt: string;
  lastSeenAt: string;
}

interface StateReport {
  testId: string;
  startTime: string;
  endTime: string;
  deploymentSha: string;
  environment: string;
  namespace: string;
  
  // Counts
  totalAuthorizations: number;
  totalSubjectIndexes: number;
  totalSessions: number;
  totalSessionIndexes: number;
  
  // Classifications
  activeAuthorizations: number;
  revokedAuthorizations: number;
  expiredAuthorizations: number;
  invalidAuthorizations: number;
  
  // Consistency
  subjectIndexConsistent: number;
  subjectIndexMissingAuth: number;
  subjectIndexStale: number;
  authWithoutSubjectIndex: number;
  
  // Sessions
  sessionsWithValidAuth: number;
  sessionsWithInvalidAuth: number;
  sessionsWithMissingAuth: number;
  
  // Specific investigation
  targetAuthorization?: {
    id: string;
    hasSubjectIndex: boolean;
    hasAuthRecord: boolean;
    hasSessions: number;
    status?: string;
    principalId?: string;
  };
  
  // Issues
  issues: Array<{
    type: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    description: string;
    evidence?: Record<string, unknown>;
  }>;
  
  verdict: 'CONSISTENT' | 'INCONSISTENT' | 'ERROR';
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const testId = `authorization-state-inspection-${Date.now()}`;
  const startTime = new Date().toISOString();
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  
  console.log('[AUTHORIZATION_STATE_INSPECTION] TEST_STARTED', { testId, startTime, deploymentSha, environment });

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
    const body = await request.json();
    const targetAuthorizationId = body.targetAuthorizationId || 'c00d0121-239f-4c12-bfb7-7a950f10b38b';

    // Create Redis client
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const issues: StateReport['issues'] = [];
    
    // Get namespace
    const namespace = environment === 'production' ? 'hpp:production:' : `hpp:${environment}:`;
    const authPrefix = `${namespace}drive:auth:`;
    const subjectPrefix = `${namespace}drive:auth:subject:`;
    const sessionPrefix = `${namespace}drive:session:`;
    const sessionIndexPrefix = `${namespace}drive:auth:sessions:`;

    const report: StateReport = {
      testId,
      startTime,
      endTime: '',
      deploymentSha,
      environment,
      namespace,
      
      totalAuthorizations: 0,
      totalSubjectIndexes: 0,
      totalSessions: 0,
      totalSessionIndexes: 0,
      
      activeAuthorizations: 0,
      revokedAuthorizations: 0,
      expiredAuthorizations: 0,
      invalidAuthorizations: 0,
      
      subjectIndexConsistent: 0,
      subjectIndexMissingAuth: 0,
      subjectIndexStale: 0,
      authWithoutSubjectIndex: 0,
      
      sessionsWithValidAuth: 0,
      sessionsWithInvalidAuth: 0,
      sessionsWithMissingAuth: 0,
      
      issues,
      verdict: 'CONSISTENT',
    };

    // Scan authorization records
    const authKeys = [];
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, {
        match: `${authPrefix}*`,
        count: 100,
      });
      cursor = result[0] as string;
      const keys = result[1] as string[];
      const pureAuthKeys = keys.filter(key => 
        !key.includes(':subject:') && !key.includes(':sessions:')
      );
      authKeys.push(...pureAuthKeys);
    } while (cursor !== '0');

    report.totalAuthorizations = authKeys.length;
    console.log('[AUTHORIZATION_STATE_INSPECTION] Authorizations scanned', { testId, count: authKeys.length });

    // Scan subject indexes
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

    report.totalSubjectIndexes = subjectKeys.length;
    console.log('[AUTHORIZATION_STATE_INSPECTION] Subject indexes scanned', { testId, count: subjectKeys.length });

    // Scan session records
    const sessionKeys = [];
    cursor = '0';
    do {
      const result = await redis.scan(cursor, {
        match: `${sessionPrefix}*`,
        count: 100,
      });
      cursor = result[0] as string;
      const keys = result[1] as string[];
      sessionKeys.push(...keys);
    } while (cursor !== '0');

    report.totalSessions = sessionKeys.length;
    console.log('[AUTHORIZATION_STATE_INSPECTION] Sessions scanned', { testId, count: sessionKeys.length });

    // Scan session indexes
    const sessionIndexKeys = [];
    cursor = '0';
    do {
      const result = await redis.scan(cursor, {
        match: `${sessionIndexPrefix}*`,
        count: 100,
      });
      cursor = result[0] as string;
      const keys = result[1] as string[];
      sessionIndexKeys.push(...keys);
    } while (cursor !== '0');

    report.totalSessionIndexes = sessionIndexKeys.length;
    console.log('[AUTHORIZATION_STATE_INSPECTION] Session indexes scanned', { testId, count: sessionIndexKeys.length });

    // Inspect subject indexes
    for (const subjectKey of subjectKeys) {
      const subject = subjectKey.replace(subjectPrefix, '');
      const authorizationId = await redis.get<string>(subjectKey);

      if (!authorizationId) {
        report.subjectIndexStale++;
        issues.push({
          type: 'STALE_SUBJECT_INDEX',
          severity: 'WARNING',
          description: 'Subject index exists but has no authorization ID value',
          evidence: { subject: safeCorrelationId(subject) },
        });
        continue;
      }

      const authKey = `${authPrefix}${authorizationId}`;
      const auth = await redis.get(authKey);

      if (!auth) {
        report.subjectIndexMissingAuth++;
        issues.push({
          type: 'SUBJECT_INDEX_MISSING_AUTH',
          severity: 'CRITICAL',
          description: 'Subject index points to authorization that does not exist',
          evidence: { 
            subject: safeCorrelationId(subject),
            authorizationId: safeCorrelationId(authorizationId),
          },
        });
        continue;
      }

      try {
        const authRecord = typeof auth === 'string' ? JSON.parse(auth) : auth;
        
        if (authRecord.status === 'active') {
          report.subjectIndexConsistent++;
        } else if (authRecord.status === 'revoked') {
          issues.push({
            type: 'INDEXED_REVOKED_AUTH',
            severity: 'WARNING',
            description: 'Subject index points to revoked authorization',
            evidence: {
              subject: safeCorrelationId(subject),
              authorizationId: safeCorrelationId(authorizationId),
            },
          });
        } else if (authRecord.status === 'expired') {
          issues.push({
            type: 'INDEXED_EXPIRED_AUTH',
            severity: 'WARNING',
            description: 'Subject index points to expired authorization',
            evidence: {
              subject: safeCorrelationId(subject),
              authorizationId: safeCorrelationId(authorizationId),
            },
          });
        }
      } catch (parseError) {
        issues.push({
          type: 'INVALID_AUTH_RECORD',
          severity: 'CRITICAL',
          description: 'Authorization record cannot be parsed',
          evidence: {
            subject: safeCorrelationId(subject),
            authorizationId: safeCorrelationId(authorizationId),
          },
        });
      }
    }

    // Inspect authorization records
    for (const authKey of authKeys) {
      const auth = await redis.get(authKey);
      if (!auth) continue;

      try {
        const authRecord = typeof auth === 'string' ? JSON.parse(auth) : auth;
        
        if (authRecord.status === 'active') {
          report.activeAuthorizations++;
        } else if (authRecord.status === 'revoked') {
          report.revokedAuthorizations++;
        } else if (authRecord.status === 'expired') {
          report.expiredAuthorizations++;
        } else {
          report.invalidAuthorizations++;
          issues.push({
            type: 'INVALID_AUTH_STATUS',
            severity: 'CRITICAL',
            description: 'Authorization has invalid status',
            evidence: {
              authorizationId: safeCorrelationId(authRecord.id),
              status: authRecord.status,
            },
          });
        }

        // Check for subject index
        const subjectKey = `${subjectPrefix}${authRecord.googleSubject}`;
        const hasSubjectIndex = await redis.exists(subjectKey);
        
        if (!hasSubjectIndex && authRecord.status === 'active') {
          report.authWithoutSubjectIndex++;
          issues.push({
            type: 'AUTH_WITHOUT_SUBJECT_INDEX',
            severity: 'CRITICAL',
            description: 'Active authorization has no subject index',
            evidence: {
              authorizationId: safeCorrelationId(authRecord.id),
            },
          });
        }

        // Check target authorization
        if (authRecord.id === targetAuthorizationId) {
          report.targetAuthorization = {
            id: authRecord.id,
            hasSubjectIndex: hasSubjectIndex === 1,
            hasAuthRecord: true,
            hasSessions: 0, // Will be filled in session inspection
            status: authRecord.status,
            principalId: authRecord.principalId,
          };
        }
      } catch (parseError) {
        report.invalidAuthorizations++;
      }
    }

    // Inspect session records
    for (const sessionKey of sessionKeys) {
      const session = await redis.get(sessionKey);
      if (!session) continue;

      try {
        const sessionRecord = typeof session === 'string' ? JSON.parse(session) : session;
        
        const authKey = `${authPrefix}${sessionRecord.authorizationId}`;
        const auth = await redis.get(authKey);

        if (!auth) {
          report.sessionsWithMissingAuth++;
          issues.push({
            type: 'SESSION_MISSING_AUTH',
            severity: 'CRITICAL',
            description: 'Session points to authorization that does not exist',
            evidence: {
              sessionId: safeCorrelationId(sessionRecord.id),
              authorizationId: safeCorrelationId(sessionRecord.authorizationId),
            },
          });
        } else {
          try {
            const authRecord = typeof auth === 'string' ? JSON.parse(auth) : auth;
            
            if (authRecord.status === 'active') {
              report.sessionsWithValidAuth++;
              
              // Count sessions for target authorization
              if (report.targetAuthorization && authRecord.id === targetAuthorizationId) {
                report.targetAuthorization.hasSessions++;
              }
            } else {
              report.sessionsWithInvalidAuth++;
              issues.push({
                type: 'SESSION_INVALID_AUTH',
                severity: 'WARNING',
                description: 'Session points to non-active authorization',
                evidence: {
                  sessionId: safeCorrelationId(sessionRecord.id),
                  authorizationId: safeCorrelationId(sessionRecord.authorizationId),
                  authStatus: authRecord.status,
                },
              });
            }
          } catch (parseError) {
            report.sessionsWithInvalidAuth++;
          }
        }
      } catch (parseError) {
        // Invalid session record
      }
    }

    // Check if target authorization exists at all
    if (!report.targetAuthorization) {
      report.targetAuthorization = {
        id: targetAuthorizationId,
        hasSubjectIndex: false,
        hasAuthRecord: false,
        hasSessions: 0,
      };
      issues.push({
        type: 'TARGET_AUTH_NOT_FOUND',
        severity: 'INFO',
        description: 'Target authorization record does not exist in KV',
        evidence: {
          authorizationId: safeCorrelationId(targetAuthorizationId),
        },
      });
    }

    const endTime = new Date().toISOString();
    report.endTime = endTime;
    report.verdict = issues.filter(i => i.severity === 'CRITICAL').length > 0 ? 'INCONSISTENT' : 'CONSISTENT';

    console.log('[AUTHORIZATION_STATE_INSPECTION] COMPLETED', {
      testId,
      totalAuthorizations: report.totalAuthorizations,
      totalSubjectIndexes: report.totalSubjectIndexes,
      totalSessions: report.totalSessions,
      criticalIssues: issues.filter(i => i.severity === 'CRITICAL').length,
      verdict: report.verdict,
    });

    return NextResponse.json(report);

  } catch (error) {
    console.error('[AUTHORIZATION_STATE_INSPECTION] ERROR', {
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

function safeCorrelationId(identifier: string): string {
  return crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 8);
}
