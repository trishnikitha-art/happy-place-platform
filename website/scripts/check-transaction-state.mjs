/**
 * Check Transaction State
 * 
 * Checks the current state of the preserved gallery transaction in Redis.
 * This confirms the transaction is still preserved and ready for retry.
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const TRANSACTION_PREFIX = 'deployment-transaction:';

const TRANSACTION_ID = 'WBDEP-1790371363022-8apujfxtd';

function getTransactionKey(transactionId) {
  return `${KV_NAMESPACE}${TRANSACTION_PREFIX}${transactionId}`;
}

async function main() {
  console.log('[CHECK TRANSACTION STATE] START', {
    transactionId: TRANSACTION_ID,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

  const key = getTransactionKey(TRANSACTION_ID);
  const transaction = await redis.get(key);

  if (!transaction) {
    console.log('[CHECK] Transaction not found in Redis');
    console.log('[CHECK] Transaction may have been consumed or does not exist');
    return;
  }

  console.log('[CHECK] Transaction state:', {
    transactionId: TRANSACTION_ID,
    state: transaction.state,
    retryCount: transaction.retryCount,
    failureReason: transaction.failureReason,
    stagingKeysCount: transaction.stagingKeys?.length,
    files: transaction.files,
    createdAt: transaction.createdAt,
  });

  if (transaction.state === 'failed') {
    console.log('[CHECK] TRANSACTION_IS_FAILED - Ready for retry');
    
    if ((transaction.retryCount || 0) >= 3) {
      console.log('[CHECK] RETRY_LIMIT_EXCEEDED - Cannot retry');
    } else {
      console.log('[CHECK] RETRY_AVAILABLE - Can be retried');
    }
  } else if (transaction.state === 'prepared') {
    console.log('[CHECK] TRANSACTION_IS_PREPARED - Ready for deployment');
  } else if (transaction.state === 'committed') {
    console.log('[CHECK] TRANSACTION_ALREADY_COMMITTED - No action needed');
  } else {
    console.log('[CHECK] TRANSACTION_STATE:', transaction.state);
  }

  // Show staging keys for forensic verification
  if (transaction.stagingKeys && transaction.stagingKeys.length > 0) {
    console.log('[CHECK] Staging keys:', transaction.stagingKeys);
    
    // Check if gallery key is present
    const galleryKey = transaction.stagingKeys.find(key => key.includes(':gallery'));
    if (galleryKey) {
      console.log('[CHECK] GALLERY_KEY_FOUND:', galleryKey);
    }
  }

  console.log('[CHECK TRANSACTION STATE] COMPLETE');
}

main();
