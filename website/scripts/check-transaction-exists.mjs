/**
 * Check if preserved transaction still exists in Redis
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
  console.log('[CHECK TRANSACTION EXISTS] START', {
    transactionId: TRANSACTION_ID,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

  const key = getTransactionKey(TRANSACTION_ID);
  const transaction = await redis.get(key);

  if (!transaction) {
    console.log('[CHECK] Transaction NOT FOUND in Redis');
    console.log('[CHECK] The transaction may have expired or been deleted');
    return;
  }

  console.log('[CHECK] Transaction FOUND:', {
    transactionId: TRANSACTION_ID,
    state: transaction.state,
    stagingKeys: transaction.stagingKeys,
    files: transaction.files,
    createdAt: transaction.createdAt,
  });

  // Check if it has the corrected schema
  if ('files' in transaction) {
    console.log('[CHECK] Transaction has corrected schema (files field)');
  } else if ('targetFiles' in transaction) {
    console.log('[CHECK] Transaction has old schema (targetFiles field)');
  }

  console.log('[CHECK TRANSACTION EXISTS] COMPLETE');
}

main();
