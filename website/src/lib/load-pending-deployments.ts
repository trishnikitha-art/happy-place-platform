/**
 * Load Pending Deployment Transactions
 * 
 * Server-side function to load prepared deployment transactions from Redis.
 * This enables recovery of transactions that were preserved after failed deployments.
 */

import { Redis } from '@upstash/redis';
import { getKvNamespace } from '@/lib/environment';

const TRANSACTION_PREFIX = 'deployment-transaction:';

export interface DeploymentTransaction {
  state: string;
  stagingKeys?: string[];
  reason?: string;
  createdAt?: string;
}

function getTransactionKey(transactionId: string) {
  return `${getKvNamespace()}${TRANSACTION_PREFIX}${transactionId}`;
}

export async function loadPendingDeploymentTransactions() {
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
      
      if (transaction && transaction.state === 'prepared') {
        // Extract project ID from staging keys if possible
        const projectId = extractProjectIdFromStagingKeys(transaction.stagingKeys);
        
        transactions.push({
          transactionId,
          projectId,
          reason: transaction.reason || 'Manual deployment',
          timestamp: transaction.createdAt || new Date().toISOString(),
          stagingKeysCount: transaction.stagingKeys?.length || 0,
        });
      }
    }

    return transactions;
  } catch (error) {
    console.error('[LOAD PENDING DEPLOYMENTS] Failed to load:', error);
    return [];
  }
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
