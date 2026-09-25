/**
 * Pending Deployments API
 * 
 * GET: Returns prepared deployment transactions available for retry.
 * DELETE: Clears selected deployment transactions.
 * 
 * This enables recovery and cleanup of transactions.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { Redis } from '@upstash/redis';
import { getKvNamespace } from '@/lib/environment';

export const runtime = 'nodejs';

const TRANSACTION_PREFIX = 'deployment-transaction:';
const STAGING_PREFIX = 'workbench-staging:';

export interface DeploymentTransaction {
  state: string;
  stagingKeys?: string[];
  reason?: string;
  createdAt?: string;
  files?: string[];
  failureReason?: string;
  retryCount?: number;
}

function extractProjectIdFromStagingKeys(stagingKeys: string[] | undefined): string | null {
  if (!stagingKeys || stagingKeys.length === 0) return null;
  
  // Look for project gallery keys: hpp:{env}:workbench-staging:{txId}:project:{projectId}:gallery
  for (const key of stagingKeys) {
    const match = key.match(/:project:([^:]+):gallery$/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * DELETE endpoint: Clear selected deployment transactions
 * DELETE /api/workbench/pending-deployments
 * Body: { transactionIds: string[] }
 */
export async function DELETE(request: Request) {
  // Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { transactionIds } = body;
    
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: "Bad request", message: "transactionIds array is required" },
        { status: 400 }
      );
    }

    const redis = new Redis({
      url: process.env.KV_REST_API_URL || '',
      token: process.env.KV_REST_API_TOKEN || '',
    });

    const namespace = getKvNamespace();
    let deletedCount = 0;
    let deletedIds: string[] = [];
    let cleanedStagingKeys: string[] = [];

    for (const transactionId of transactionIds) {
      const transactionKey = `${namespace}${TRANSACTION_PREFIX}${transactionId}`;
      const transaction = await redis.get(transactionKey) as DeploymentTransaction | null;
      
      if (transaction) {
        // Delete the transaction
        await redis.del(transactionKey);
        deletedCount++;
        deletedIds.push(transactionId);
        
        // Clean up associated staging keys
        if (transaction.stagingKeys && transaction.stagingKeys.length > 0) {
          for (const stagingKey of transaction.stagingKeys) {
            const fullKey = `${namespace}${stagingKey}`;
            await redis.del(fullKey);
            cleanedStagingKeys.push(stagingKey);
          }
        }
      }
    }

    console.log('[PENDING DEPLOYMENTS API] TRANSACTIONS_CLEARED', {
      deletedCount,
      deletedIds,
      cleanedStagingKeysCount: cleanedStagingKeys.length
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      deletedIds,
      cleanedStagingKeysCount: cleanedStagingKeys.length,
      message: `Cleared ${deletedCount} deployment transaction(s) and ${cleanedStagingKeys.length} staging key(s)`
    });
  } catch (error) {
    console.error('[PENDING DEPLOYMENTS API] DELETE Error:', error);
    return NextResponse.json(
      { error: "Failed to clear transactions", message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  // Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL || '',
      token: process.env.KV_REST_API_TOKEN || '',
    });

    // Scan for all deployment transaction keys
    const keys = await redis.keys(`${getKvNamespace()}${TRANSACTION_PREFIX}*`);
    
    const transactions = [];
    
    for (const key of keys) {
      const transactionId = key.replace(`${getKvNamespace()}${TRANSACTION_PREFIX}`, '');
      const transaction = await redis.get(key) as DeploymentTransaction | null;
      
      // P0 FIX: Expose both prepared and failed transactions for recovery
      // The state machine supports failed → prepared retry via /api/admin/deploy
      if (transaction && (transaction.state === 'prepared' || transaction.state === 'failed')) {
        // Extract project ID from staging keys if possible
        const projectId = extractProjectIdFromStagingKeys(transaction.stagingKeys);
        
        transactions.push({
          transactionId,
          projectId,
          state: transaction.state,
          reason: transaction.reason || 'Manual deployment',
          timestamp: transaction.createdAt || new Date().toISOString(),
          stagingKeysCount: transaction.stagingKeys?.length || 0,
          failureReason: transaction.failureReason,
          retryCount: transaction.retryCount || 0,
        });
      }
    }

    return NextResponse.json({
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('[PENDING DEPLOYMENTS API] Error:', error);
    // P0 FIX: Return 503 to distinguish Redis failure from empty transaction list
    return NextResponse.json(
      { error: "Pending deployment recovery unavailable", message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
