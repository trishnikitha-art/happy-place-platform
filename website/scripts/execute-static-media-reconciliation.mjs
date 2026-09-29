/**
 * Execute Static Media Reconciliation
 * 
 * This script calls the production reconciliation endpoint to restore
 * all canonical static media records from media.v1.json into KV.
 * 
 * REQUIRES: Workbench authentication (login to Workbench first)
 * 
 * Usage:
 * 1. Login to Workbench: https://happy-place-platform.vercel.app/workbench/media
 * 2. Run this script: node scripts/execute-static-media-reconciliation.mjs
 */

const RECONCILIATION_ENDPOINT = 'https://happy-place-platform.vercel.app/api/admin/diagnostic/reconcile-static-media';

async function executeReconciliation() {
  console.log('[STATIC_MEDIA_RECONCILIATION] Starting...');
  console.log('[STATIC_MEDIA_RECONCILIATION] Endpoint:', RECONCILIATION_ENDPOINT);
  console.log('[STATIC_MEDIA_RECONCILIATION] Prerequisite: You must be logged into Workbench first');
  console.log('');

  try {
    const response = await fetch(RECONCILIATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include Workbench session cookies
    });

    const result = await response.json();

    console.log('[STATIC_MEDIA_RECONCILIATION] Response Status:', response.status);
    console.log('[STATIC_MEDIA_RECONCILIATION] Response:', JSON.stringify(result, null, 2));

    if (result.verdict === 'SUCCESS') {
      console.log('');
      console.log('[STATIC_MEDIA_RECONCILIATION] ✓ SUCCESS');
      console.log('[STATIC_MEDIA_RECONCILIATION] Canonical records:', result.evidence.totalCanonical);
      console.log('[STATIC_MEDIA_RECONCILIATION] KV records:', result.evidence.totalKvRecords);
      console.log('[STATIC_MEDIA_RECONCILIATION] Repaired:', result.evidence.repaired);
      console.log('[STATIC_MEDIA_RECONCILIATION] Preserved:', result.evidence.preserved);
      console.log('[STATIC_MEDIA_RECONCILIATION] Failed:', result.evidence.failed);
      console.log('[STATIC_MEDIA_RECONCILIATION] Classification:', result.evidence.classification);
    } else {
      console.log('');
      console.log('[STATIC_MEDIA_RECONCILIATION] ✗ FAILED');
      console.log('[STATIC_MEDIA_RECONCILIATION] Error:', result.evidence?.error || 'Unknown error');
    }

  } catch (error) {
    console.error('[STATIC_MEDIA_RECONCILIATION] Exception:', error);
    console.error('[STATIC_MEDIA_RECONCILIATION] Make sure you are logged into Workbench first');
    process.exit(1);
  }
}

executeReconciliation();
