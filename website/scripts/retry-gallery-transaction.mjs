/**
 * Retry Preserved Gallery Transaction
 * 
 * Triggers a retry of the preserved gallery transaction through the deployment API.
 * The transaction was preserved when the old deployment failed due to the dispatcher bug.
 * Now that 64ee8014 is deployed with the corrected dispatcher, this should succeed.
 */

const TRANSACTION_ID = 'WBDEP-1790257725027-biblw3qya';
const DEPLOY_URL = 'https://happy-place-platform.vercel.app/api/admin/deploy';

async function retryGalleryTransaction() {
  console.log('[RETRY GALLERY TRANSACTION] START', {
    transactionId: TRANSACTION_ID,
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await fetch(DEPLOY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionIds: [TRANSACTION_ID],
        reason: 'Retry preserved gallery transaction after dispatcher fix (64ee8014)',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[RETRY] DEPLOYMENT_API_ERROR', {
        status: response.status,
        error: result.error,
        message: result.message,
      });
      process.exit(1);
    }

    console.log('[RETRY] DEPLOYMENT_RESPONSE', {
      status: response.status,
      result,
    });

    if (result.error) {
      console.error('[RETRY] DEPLOYMENT_FAILED', result.error);
      process.exit(1);
    }

    console.log('[RETRY GALLERY TRANSACTION] SUCCESS', {
      transactionId: TRANSACTION_ID,
      deploymentState: result.state,
      gitCommitSha: result.gitCommitSha,
    });

  } catch (error) {
    console.error('[RETRY] REQUEST_FAILED', error);
    process.exit(1);
  }
}

retryGalleryTransaction();
