/**
 * Browser-based Reconciliation Execution
 * 
 * Run this script in the browser console on the Workbench page:
 * https://happy-place-platform.vercel.app/workbench/media
 * 
 * It calls the server-side reconciliation endpoint which performs
 * the complete audit → plan → repair → verify workflow.
 */

async function executeReconciliation() {
  console.log('[RECONCILIATION] Starting server-side reconciliation...');
  
  try {
    // Step 1: Audit - classify all records
    console.log('[RECONCILIATION] Step 1: Audit');
    const auditResponse = await fetch('/api/admin/diagnostic/reconcile-media-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'audit' }),
    });
    
    if (!auditResponse.ok) {
      console.error('[RECONCILIATION] Audit failed:', auditResponse.status, auditResponse.statusText);
      return;
    }
    
    const auditResult = await auditResponse.json();
    console.log('[RECONCILIATION] Audit complete:', auditResult);
    
    console.log('\n' + '='.repeat(80));
    console.log('AUDIT RESULTS');
    console.log('='.repeat(80));
    console.log('Total Records:', auditResult.counts.totalRecords);
    console.log('Valid Published:', auditResult.counts.validPublished);
    console.log('REPAIRABLE_BLOB:', auditResult.counts.repairableBlob);
    console.log('REPAIRABLE_STATIC:', auditResult.counts.repairableStatic);
    console.log('AMBIGUOUS:', auditResult.counts.ambiguous);
    console.log('REQUIRES_MATERIALIZATION:', auditResult.counts.requiresMaterialization);
    console.log('='.repeat(80));
    
    // Step 2: Plan - show proposed repairs
    console.log('\n[RECONCILIATION] Step 2: Plan');
    const planResponse = await fetch('/api/admin/diagnostic/reconcile-media-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'plan', options: { dryRun: true } }),
    });
    
    if (!planResponse.ok) {
      console.error('[RECONCILIATION] Plan failed:', planResponse.status, planResponse.statusText);
      return;
    }
    
    const planResult = await planResponse.json();
    console.log('[RECONCILIATION] Plan complete:', planResult);
    
    console.log('\n' + '='.repeat(80));
    console.log('PLAN RESULTS');
    console.log('='.repeat(80));
    console.log('Eligible for Repair:', planResult.plan.eligibleForRepair.length);
    console.log('Ambiguous:', planResult.plan.ambiguous.length);
    console.log('Skipped:', planResult.plan.skipped.length);
    console.log('='.repeat(80));
    
    // Step 3: Confirm before repair
    const confirmRepair = confirm(
      `Ready to repair ${planResult.plan.eligibleForRepair.length} records.\n\n` +
      `This will perform field-level mutations to add storage metadata.\n\n` +
      `Ambiguous records (${planResult.plan.ambiguous.length}) will NOT be repaired.\n\n` +
      `Proceed?`
    );
    
    if (!confirmRepair) {
      console.log('[RECONCILIATION] Repair cancelled by user');
      return;
    }
    
    // Step 4: Repair - execute mutations
    console.log('\n[RECONCILIATION] Step 3: Repair');
    const repairResponse = await fetch('/api/admin/diagnostic/reconcile-media-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'repair' }),
    });
    
    if (!repairResponse.ok) {
      console.error('[RECONCILIATION] Repair failed:', repairResponse.status, repairResponse.statusText);
      return;
    }
    
    const repairResult = await repairResponse.json();
    console.log('[RECONCILIATION] Repair complete:', repairResult);
    
    console.log('\n' + '='.repeat(80));
    console.log('REPAIR RESULTS');
    console.log('='.repeat(80));
    console.log('Repaired:', repairResult.counts.repaired);
    console.log('Skipped:', repairResult.counts.skipped);
    console.log('Failed:', repairResult.counts.failed);
    console.log('='.repeat(80));
    
    // Step 5: Verify - re-audit after repair
    console.log('\n[RECONCILIATION] Step 4: Verify');
    const verifyResponse = await fetch('/api/admin/diagnostic/reconcile-media-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'verify' }),
    });
    
    if (!verifyResponse.ok) {
      console.error('[RECONCILIATION] Verify failed:', verifyResponse.status, verifyResponse.statusText);
      return;
    }
    
    const verifyResult = await verifyResponse.json();
    console.log('[RECONCILIATION] Verify complete:', verifyResult);
    
    console.log('\n' + '='.repeat(80));
    console.log('VERIFY RESULTS (AFTER REPAIR)');
    console.log('='.repeat(80));
    console.log('Total Records:', verifyResult.counts.totalRecords);
    console.log('Valid Published:', verifyResult.counts.validPublished);
    console.log('REPAIRABLE_BLOB:', verifyResult.counts.repairableBlob);
    console.log('REPAIRABLE_STATIC:', verifyResult.counts.repairableStatic);
    console.log('AMBIGUOUS:', verifyResult.counts.ambiguous);
    console.log('='.repeat(80));
    
    console.log('\n' + '='.repeat(80));
    console.log('RECONCILIATION COMPLETE');
    console.log('='.repeat(80));
    console.log('Before:', {
      repairableBlob: auditResult.counts.repairableBlob,
      repairableStatic: auditResult.counts.repairableStatic,
    });
    console.log('After:', {
      repairableBlob: verifyResult.counts.repairableBlob,
      repairableStatic: verifyResult.counts.repairableStatic,
    });
    console.log('Resolved:', {
      repairableBlob: auditResult.counts.repairableBlob - verifyResult.counts.repairableBlob,
      repairableStatic: auditResult.counts.repairableStatic - verifyResult.counts.repairableStatic,
    });
    console.log('='.repeat(80));
    
    // Save to clipboard
    const fullReport = {
      audit: auditResult,
      plan: planResult,
      repair: repairResult,
      verify: verifyResult,
    };
    await navigator.clipboard.writeText(JSON.stringify(fullReport, null, 2));
    console.log('\n[RECONCILIATION] Full report copied to clipboard');
    
    return fullReport;
  } catch (error) {
    console.error('[RECONCILIATION] Failed:', error);
  }
}

// Execute immediately
executeReconciliation();
