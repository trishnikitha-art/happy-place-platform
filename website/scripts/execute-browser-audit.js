/**
 * Browser-based Production Audit Execution (Paginated)
 * 
 * Run this script in the browser console on the Workbench page:
 * https://happy-place-platform.vercel.app/workbench/media
 * 
 * It uses the authenticated Workbench session to execute the audit in batches.
 */

async function executePaginatedAudit() {
  console.log('[PRODUCTION_AUDIT] Starting paginated forensic classification...');
  
  const pageSize = 50; // Process 50 records per batch
  let offset = 0;
  let allResults = {
    totalRecords: 0,
    validPublished: 0,
    sourceReferences: 0,
    materializing: 0,
    stale: 0,
    malformedPublished: 0,
    missingStorage: 0,
    missingStorageIds: [],
    repairableStatic: 0,
    repairableStaticIds: [],
    repairableBlob: 0,
    repairableBlobIds: [],
    requiresMaterialization: 0,
    requiresMaterializationIds: [],
    ambiguous: 0,
    ambiguousIds: [],
    unknown: 0,
    totalPages: 0,
    sampleRecords: [],
  };
  
  try {
    // Get first page to determine total records
    console.log('[PRODUCTION_AUDIT] Fetching first page...');
    const firstResponse = await fetch('/api/workbench/media-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'auditPublicGate', limit: pageSize, offset: 0 }),
    });
    
    if (!firstResponse.ok) {
      console.error('[PRODUCTION_AUDIT] First page request failed:', firstResponse.status, firstResponse.statusText);
      const error = await firstResponse.text();
      console.error('[PRODUCTION_AUDIT] Error details:', error);
      return;
    }
    
    const firstResult = await firstResponse.json();
    const firstAudit = firstResult.audit;
    
    allResults.totalRecords = firstAudit.totalRecords;
    allResults.totalPages = firstAudit.totalPages;
    
    console.log('[PRODUCTION_AUDIT] Total records:', allResults.totalRecords);
    console.log('[PRODUCTION_AUDIT] Total pages:', allResults.totalPages);
    console.log('[PRODUCTION_AUDIT] Processing all pages...');
    
    // Process all pages
    for (let page = 0; page < allResults.totalPages; page++) {
      const currentPage = page + 1;
      const currentOffset = page * pageSize;
      
      console.log(`[PRODUCTION_AUDIT] Processing page ${currentPage}/${allResults.totalPages} (offset: ${currentOffset})...`);
      
      const response = await fetch('/api/workbench/media-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'auditPublicGate', limit: pageSize, offset: currentOffset }),
      });
      
      if (!response.ok) {
        console.error(`[PRODUCTION_AUDIT] Page ${currentPage} request failed:`, response.status, response.statusText);
        continue;
      }
      
      const result = await response.json();
      const audit = result.audit;
      
      // Aggregate results
      allResults.validPublished += audit.validPublished;
      allResults.sourceReferences += audit.sourceReferences;
      allResults.materializing += audit.materializing;
      allResults.stale += audit.stale;
      allResults.malformedPublished += audit.malformedPublished;
      allResults.missingStorage += audit.missingStorage;
      allResults.repairableStatic += audit.repairableStatic;
      allResults.repairableBlob += audit.repairableBlob;
      allResults.requiresMaterialization += audit.requiresMaterialization;
      allResults.ambiguous += audit.ambiguous;
      allResults.unknown += audit.unknown;
      
      // Aggregate ID lists
      allResults.missingStorageIds.push(...audit.missingStorageIds);
      allResults.repairableStaticIds.push(...audit.repairableStaticIds);
      allResults.repairableBlobIds.push(...audit.repairableBlobIds);
      allResults.requiresMaterializationIds.push(...audit.requiresMaterializationIds);
      allResults.ambiguousIds.push(...audit.ambiguousIds);
      
      // Collect sample records (first 20 total)
      if (allResults.sampleRecords.length < 20) {
        allResults.sampleRecords.push(...audit.sampleRecords.slice(0, 20 - allResults.sampleRecords.length));
      }
      
      console.log(`[PRODUCTION_AUDIT] Page ${currentPage} complete:`, {
        processed: audit.processedRecords,
        validPublished: audit.validPublished,
        repairableStatic: audit.repairableStatic,
        repairableBlob: audit.repairableBlob,
        requiresMaterialization: audit.requiresMaterialization,
        ambiguous: audit.ambiguous,
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('PRODUCTION MEDIA AUTHORITY CLASSIFICATION (AGGREGATED)');
    console.log('='.repeat(80));
    console.log('\nTOTAL RECORDS:', allResults.totalRecords);
    console.log('\nCLASSIFICATION BREAKDOWN:');
    console.log(`  VALID_PUBLISHED: ${allResults.validPublished}`);
    console.log(`  DRIVE_REFERENCE: ${allResults.sourceReferences}`);
    console.log(`  MATERIALIZING: ${allResults.materializing}`);
    console.log(`  STALE: ${allResults.stale}`);
    console.log(`  MALFORMED: ${allResults.malformedPublished}`);
    console.log(`  MISSING_STORAGE: ${allResults.missingStorage}`);
    console.log(`  REPAIRABLE_STATIC: ${allResults.repairableStatic}`);
    console.log(`  REPAIRABLE_BLOB: ${allResults.repairableBlob}`);
    console.log(`  REQUIRES_MATERIALIZATION: ${allResults.requiresMaterialization}`);
    console.log(`  AMBIGUOUS: ${allResults.ambiguous}`);
    console.log(`  UNKNOWN: ${allResults.unknown}`);
    
    console.log('\nCOMPLETE ID LISTS:');
    console.log(`\nREPAIRABLE_STATIC (${allResults.repairableStaticIds.length}):`);
    allResults.repairableStaticIds.forEach(id => console.log(`  - ${id}`));
    
    console.log(`\nREPAIRABLE_BLOB (${allResults.repairableBlobIds.length}):`);
    allResults.repairableBlobIds.forEach(id => console.log(`  - ${id}`));
    
    console.log(`\nREQUIRES_MATERIALIZATION (${allResults.requiresMaterializationIds.length}):`);
    allResults.requiresMaterializationIds.forEach(id => console.log(`  - ${id}`));
    
    console.log(`\nAMBIGUOUS (${allResults.ambiguousIds.length}):`);
    allResults.ambiguousIds.forEach(id => console.log(`  - ${id}`));
    
    console.log(`\nMISSING_STORAGE (${allResults.missingStorageIds.length}):`);
    allResults.missingStorageIds.forEach(id => console.log(`  - ${id}`));
    
    console.log('\nSAMPLE RECORDS (first 20):');
    allResults.sampleRecords.forEach((record, i) => {
      console.log(`  ${i + 1}. ${record.id}`);
      console.log(`     Filename: ${record.filename}`);
      console.log(`     Lifecycle: ${record.lifecycleState}`);
      console.log(`     Source: ${record.source}`);
      console.log(`     Storage: ${record.storage || 'MISSING'}`);
      console.log(`     Classification: ${record.classification}`);
      console.log(`     Reason: ${record.reason}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Save to clipboard for easier analysis
    const auditText = JSON.stringify(allResults, null, 2);
    await navigator.clipboard.writeText(auditText);
    console.log('\n[PRODUCTION_AUDIT] Full aggregated audit report copied to clipboard');
    
    return allResults;
  } catch (error) {
    console.error('[PRODUCTION_AUDIT] Script failed:', error);
  }
}

// Execute immediately
executePaginatedAudit();
