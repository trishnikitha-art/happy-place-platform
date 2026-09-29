/**
 * Repair Transaction Schema
 * 
 * Updates the preserved transaction to use files instead of targetFiles
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const TRANSACTION_PREFIX = 'deployment-transaction:';

const TRANSACTION_ID = 'WBDEP-1790257725027-biblw3qya';

function getTransactionKey(transactionId) {
  return KV_NAMESPACE + TRANSACTION_PREFIX + transactionId;
}

async function main() {
  console.log('[REPAIR TRANSACTION SCHEMA] START', {
    transactionId: TRANSACTION_ID,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

  const key = getTransactionKey(TRANSACTION_ID);
  const transaction = await redis.get(key);

  if (!transaction) {
    console.log('[REPAIR] Transaction not found');
    return;
  }

  console.log('[REPAIR] Current transaction:', transaction);

  if ('targetFiles' in transaction && !('files' in transaction)) {
    console.log('[REPAIR] Fixing schema: targetFiles → files');
    
    const repairedTransaction = {
      ...transaction,
      files: transaction.targetFiles,
      // Delete old field
      targetFiles: undefined,
    };
    
    await redis.set(key, repairedTransaction);
    
    console.log('[REPAIR] Transaction schema repaired');
  } else if ('files' in transaction) {
    console.log('[REPAIR] Transaction already uses correct schema');
  } else {
    console.log('[REPAIR] Transaction has neither targetFiles nor files');
  }

  console.log('[REPAIR TRANSACTION SCHEMA] COMPLETE');
}

main();
