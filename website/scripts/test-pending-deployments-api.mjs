/**
 * Test pending-deployments API directly
 */

async function testPendingDeployments() {
  console.log('[TEST PENDING DEPLOYMENTS API] START');

  try {
    const response = await fetch('https://happy-place-platform.vercel.app/api/workbench/pending-deployments', {
      method: 'GET',
    });

    console.log('[TEST] Response status:', response.status);
    console.log('[TEST] Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('[TEST] Response data:', data);

    if (data.transactions && data.transactions.length > 0) {
      console.log('[TEST] Found transactions:', data.transactions.length);
      data.transactions.forEach(tx => {
        console.log('[TEST] Transaction:', {
          transactionId: tx.transactionId,
          projectId: tx.projectId,
          state: tx.state,
          stagingKeysCount: tx.stagingKeysCount,
        });
      });
    } else {
      console.log('[TEST] No transactions found');
    }
  } catch (error) {
    console.error('[TEST] Error:', error);
  }

  console.log('[TEST PENDING DEPLOYMENTS API] COMPLETE');
}

testPendingDeployments();
