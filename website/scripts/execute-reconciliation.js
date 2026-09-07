/**
 * Browser-based Reconciliation Execution
 * 
 * Run this script in the browser console on the Workbench page:
 * https://happy-place-platform.vercel.app/workbench/media
 * 
 * It calls the server-side reconciliation endpoint which performs
 * the complete audit → plan → repair → verify workflow.
 * 
 * P0 FIX: Updated for dataset snapshot and page-specific fingerprints
 */

async function executeReconciliation() {
  console.log('[RECONCILIATION] Starting server-side reconciliation...');
  
  const pageSize = 50;
  let offset = 0;
  let datasetSnapshotId = null;
  let allAuditResults = [];
  let allPlanResults = [];
  
  try {
    // Step 1: Audit - classify all records with pagination
    console.log('[RECONCILIATION] Step 1: Audit (paginated)');
    
    while (true) {
      const auditResponse = await fetch('/api/admin/diagnostic/reconcile-media-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'audit', options: { pageSize, offset } }),
      });
      
      if (!auditResponse.ok) {
        console.error('[RECONCILIATION] Audit failed:', auditResponse.status, auditResponse.statusText);
        return;
      }
      
      const auditResult = await auditResponse.json();
      allAuditResults.push(auditResult);
      
      // Capture dataset snapshot ID from first page
      if (!datasetSnapshotId && auditResult.datasetSnapshotId) {
        datasetSnapshotId = auditResult.datasetSnapshotId;
        console.log('[RECONCILIATION] Dataset snapshot ID:', datasetSnapshotId);
      }
      
      console.log(`[RECONCILIATION] Audit page ${auditResult.pagination.currentPage}/${auditResult.pagination.totalPages}`);
      
      if (!auditResult.pagination.hasNextPage) {
        break;
      }
      
      offset += pageSize;
    }
    
    // Aggregate audit results
    const aggregatedCounts = {
      totalRecords: 0,
      validPublished: 0,
      repairableBlob: 0,
      repairableStatic: 0,
      ambiguous: 0,
      requiresMaterialization: 0,
    };
    
    const allRepairableBlobIds = [];
    const allRepairableStaticIds = [];
    const allAmbiguousIds = [];
    
    for (const result of allAuditResults) {
      aggregatedCounts.totalRecords = result.pagination.totalRecords;
      aggregatedCounts.validPublished += result.counts.validPublished;
      aggregatedCounts.repairableBlob += result.counts.repairableBlob;
      aggregatedCounts.repairableStatic += result.counts.repairableStatic;
      aggregatedCounts.ambiguous += result.counts.ambiguous;
      aggregatedCounts.requiresMaterialization += result.counts.requiresMaterialization;
      allRepairableBlobIds.push(...result.repairableBlobIds);
      allRepairableStaticIds.push(...result.repairableStaticIds);
      allAmbiguousIds.push(...result.ambiguousIds);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('AUDIT RESULTS (AGGREGATED)');
    console.log('='.repeat(80));
    console.log('Dataset Snapshot ID:', datasetSnapshotId);
    console.log('Total Records:', aggregatedCounts.totalRecords);
    console.log('Valid Published:', aggregatedCounts.validPublished);
    console.log('REPAIRABLE_BLOB:', aggregatedCounts.repairableBlob);
    console.log('REPAIRABLE_STATIC:', aggregatedCounts.repairableStatic);
    console.log('AMBIGUOUS:', aggregatedCounts.ambiguous);
    console.log('REQUIRES_MATERIALIZATION:', aggregatedCounts.requiresMaterialization);
    console.log('='.repeat(80));
    
    // Step 2: Plan - show proposed repairs with page-specific fingerprints
    console.log('\n[RECONCILIATION] Step 2: Plan (paginated)');
    offset = 0;
    
    while (true) {
      const planResponse = await fetch('/api/admin/diagnostic/reconcile-media-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'plan', 
          options: { 
            pageSize, 
            offset,
            datasetSnapshotId,  // P0 FIX: Pass dataset snapshot ID
            dryRun: true 
          } 
        }),
      });
      
      if (!planResponse.ok) {
        console.error('[RECONCILIATION] Plan failed:', planResponse.status, planResponse.statusText);
        return;
      }
      
      const planResult = await planResponse.json();
      allPlanResults.push(planResult);
      
      console.log(`[RECONCILIATION] Plan page ${planResult.pagination.currentPage}/${planResult.pagination.totalPages}`);
      console.log(`  Page fingerprint: ${planResult.plan.pageFingerprint.substring(0, 16)}...`);
      
      if (!planResult.pagination.hasNextPage) {
        break;
      }
      
      offset += pageSize;
    }
    
    // Aggregate plan results
    const aggregatedPlan = {
      datasetSnapshotId,
      eligibleForRepair: [],
      ambiguous: [],
      skipped: [],
    };
    
    for (const result of allPlanResults) {
      aggregatedPlan.eligibleForRepair.push(...result.plan.eligibleForRepair);
      aggregatedPlan.ambiguous.push(...result.plan.ambiguous);
      aggregatedPlan.skipped.push(...result.plan.skipped);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('PLAN RESULTS (AGGREGATED)');
    console.log('='.repeat(80));
    console.log('Dataset Snapshot ID:', aggregatedPlan.datasetSnapshotId);
    console.log('Eligible for Repair:', aggregatedPlan.eligibleForRepair.length);
    console.log('Ambiguous:', aggregatedPlan.ambiguous.length);
    console.log('Skipped:', aggregatedPlan.skipped.length);
    console.log('='.repeat(80));
    
    // Step 3: Confirm before repair
    const confirmRepair = confirm(
      `Ready to repair ${aggregatedPlan.eligibleForRepair.length} records.\n\n` +
      `Dataset snapshot: ${aggregatedPlan.datasetSnapshotId}\n\n` +
      `This will perform field-level mutations to add storage metadata.\n\n` +
      `Ambiguous records (${aggregatedPlan.ambiguous.length}) will NOT be repaired.\n\n` +
      `Proceed?`
    );
    
    if (!confirmRepair) {
      console.log('[RECONCILIATION] Repair cancelled by user');
      return;
    }
    
    // Step 4: Repair - execute mutations with page-specific fingerprints (paginated)
    console.log('\n[RECONCILIATION] Step 3: Repair (paginated)');
    offset = 0;
    let totalRepaired = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const allRepairs = [];
    const allErrors = {};
    
    while (true) {
      // Get the page fingerprint for this specific page
      const pagePlan = allPlanResults.find(p => p.pagination.offset === offset);
      if (!pagePlan) {
        console.error('[RECONCILIATION] Plan missing for offset:', offset);
        break;
      }
      
      const repairResponse = await fetch('/api/admin/diagnostic/reconcile-media-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'repair',
          options: { 
            pageSize,
            offset,
            datasetSnapshotId,  // P0 FIX: Pass dataset snapshot ID
            pageFingerprint: pagePlan.plan.pageFingerprint  // P0 FIX: Use page-specific fingerprint
          }
        }),
      });
      
      if (!repairResponse.ok) {
        console.error('[RECONCILIATION] Repair failed:', repairResponse.status, repairResponse.statusText);
        const errorText = await repairResponse.text();
        console.error('[RECONCILIATION] Error details:', errorText);
        return;
      }
      
      const repairResult = await repairResponse.json();
      console.log(`[RECONCILIATION] Repair page ${repairResult.pagination.currentPage}/${repairResult.pagination.totalPages}`);
      
      totalRepaired += repairResult.counts.repaired;
      totalSkipped += repairResult.counts.skipped;
      totalFailed += repairResult.counts.failed;
      allRepairs.push(...repairResult.repairs);
      Object.assign(allErrors, repairResult.errors || {});
      
      if (!repairResult.pagination.hasNextPage) {
        break;
      }
      
      offset += pageSize;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('REPAIR RESULTS (AGGREGATED)');
    console.log('='.repeat(80));
    console.log('Repaired:', totalRepaired);
    console.log('Skipped:', totalSkipped);
    console.log('Failed:', totalFailed);
    console.log('='.repeat(80));
    
    // Step 5: Verify - re-audit after repair (paginated)
    console.log('\n[RECONCILIATION] Step 4: Verify (paginated)');
    offset = 0;
    let allVerifyResults = [];
    
    while (true) {
      const verifyResponse = await fetch('/api/admin/diagnostic/reconcile-media-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'verify', options: { pageSize, offset } }),
      });
      
      if (!verifyResponse.ok) {
        console.error('[RECONCILIATION] Verify failed:', verifyResponse.status, verifyResponse.statusText);
        return;
      }
      
      const verifyResult = await verifyResponse.json();
      allVerifyResults.push(verifyResult);
      
      console.log(`[RECONCILIATION] Verify page ${verifyResult.pagination.currentPage}/${verifyResult.pagination.totalPages}`);
      
      if (!verifyResult.pagination.hasNextPage) {
        break;
      }
      
      offset += pageSize;
    }
    
    // Aggregate verify results
    const aggregatedVerifyCounts = {
      totalRecords: 0,
      validPublished: 0,
      repairableBlob: 0,
      repairableStatic: 0,
      ambiguous: 0,
    };
    
    for (const result of allVerifyResults) {
      aggregatedVerifyCounts.totalRecords = result.pagination.totalRecords;
      aggregatedVerifyCounts.validPublished += result.counts.validPublished;
      aggregatedVerifyCounts.repairableBlob += result.counts.repairableBlob;
      aggregatedVerifyCounts.repairableStatic += result.counts.repairableStatic;
      aggregatedVerifyCounts.ambiguous += result.counts.ambiguous;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('VERIFY RESULTS (AFTER REPAIR - AGGREGATED)');
    console.log('='.repeat(80));
    console.log('Total Records:', aggregatedVerifyCounts.totalRecords);
    console.log('Valid Published:', aggregatedVerifyCounts.validPublished);
    console.log('REPAIRABLE_BLOB:', aggregatedVerifyCounts.repairableBlob);
    console.log('REPAIRABLE_STATIC:', aggregatedVerifyCounts.repairableStatic);
    console.log('AMBIGUOUS:', aggregatedVerifyCounts.ambiguous);
    console.log('='.repeat(80));
    
    console.log('\n' + '='.repeat(80));
    console.log('RECONCILIATION COMPLETE');
    console.log('='.repeat(80));
    console.log('Before:', {
      repairableBlob: aggregatedCounts.repairableBlob,
      repairableStatic: aggregatedCounts.repairableStatic,
    });
    console.log('After:', {
      repairableBlob: aggregatedVerifyCounts.repairableBlob,
      repairableStatic: aggregatedVerifyCounts.repairableStatic,
    });
    console.log('Resolved:', {
      repairableBlob: aggregatedCounts.repairableBlob - aggregatedVerifyCounts.repairableBlob,
      repairableStatic: aggregatedCounts.repairableStatic - aggregatedVerifyCounts.repairableStatic,
    });
    console.log('='.repeat(80));
    
    // Save to clipboard
    const fullReport = {
      datasetSnapshotId,
      audit: allAuditResults,
      plan: allPlanResults,
      repair: {
        counts: { repaired: totalRepaired, skipped: totalSkipped, failed: totalFailed },
        repairs: allRepairs,
        errors: allErrors,
      },
      verify: allVerifyResults,
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
