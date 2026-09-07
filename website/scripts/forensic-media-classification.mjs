/**
 * Forensic Media Classification Script
 * 
 * Forensically classifies the entire production KV media set.
 * 
 * USAGE:
 * WORKBENCH_SESSION_COOKIE=your_cookie node scripts/forensic-media-classification.mjs
 * 
 * This script:
 * 1. Enumerates EVERY media record in production KV
 * 2. Produces full forensic details for each record
 * 3. Classifies each record by contract compliance
 * 4. Reports exact counts for each classification
 * 
 * Does NOT repair or modify any records - classification only.
 */

const PRODUCTION_ENDPOINT = 'https://happy-place-platform.vercel.app/api/workbench/media-forensics';
const SESSION_COOKIE = process.env.WORKBENCH_SESSION_COOKIE;

async function forensicClassification() {
  console.log('[FORENSIC_CLASSIFICATION] Starting production KV media forensic classification...');
  console.log('[FORENSIC_CLASSIFICATION] Endpoint:', PRODUCTION_ENDPOINT);
  
  if (!SESSION_COOKIE) {
    console.error('[FORENSIC_CLASSIFICATION] ERROR: WORKBENCH_SESSION_COOKIE environment variable not set');
    console.error('[FORENSIC_CLASSIFICATION] Please set your Workbench session cookie:');
    console.error('[FORENSIC_CLASSIFICATION] WORKBENCH_SESSION_COOKIE=your_cookie node scripts/forensic-media-classification.mjs');
    console.error('[FORENSIC_CLASSIFICATION] To get your session cookie:');
    console.error('[FORENSIC_CLASSIFICATION] 1. Log into https://happy-place-platform.vercel.app/workbench/login');
    console.error('[FORENSIC_CLASSIFICATION] 2. Open browser DevTools → Application → Cookies');
    console.error('[FORENSIC_CLASSIFICATION] 3. Copy the workbench_session_id cookie value');
    process.exit(1);
  }
  
  try {
    const response = await fetch(PRODUCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `workbench_session_id=${SESSION_COOKIE}`,
      },
      body: JSON.stringify({ action: 'forensicClassification' }),
    });
    
    if (!response.ok) {
      console.error('[FORENSIC_CLASSIFICATION] Request failed:', response.status, response.statusText);
      const error = await response.text();
      console.error('[FORENSIC_CLASSIFICATION] Error details:', error);
      
      if (response.status === 401) {
        console.log('[FORENSIC_CLASSIFICATION] Authentication required.');
        console.log('[FORENSIC_CLASSIFICATION] Please log into the Workbench at:');
        console.log('[FORENSIC_CLASSIFICATION] https://happy-place-platform.vercel.app/workbench/login');
      }
      return;
    }
    
    const result = await response.json();
    console.log('[FORENSIC_CLASSIFICATION] Forensic data received');
    
    const forensics = result.forensics;
    const records = forensics.records;
    
    // Classify each record
    const classification = {
      VALID_PUBLISHED_STATIC: 0,
      VALID_PUBLISHED_BLOB: 0,
      MISSING_STORAGE: 0,
      MALFORMED_PUBLISHED: 0,
      DRIVE_REFERENCE: 0,
      MATERIALIZING: 0,
      STALE: 0,
      UNKNOWN: 0,
      missingStorageIds: [] as string[],
      malformedIds: [] as string[],
      sampleRecords: [] as any[],
    };
    
    for (const record of records) {
      // Classify by lifecycle state and characteristics
      if (record.lifecycleState === 'source_reference') {
        classification.DRIVE_REFERENCE++;
      } else if (record.lifecycleState === 'materializing') {
        classification.MATERIALIZING++;
      } else if (record.lifecycleState === 'stale') {
        classification.STALE++;
      } else if (record.lifecycleState === 'published') {
        // Check if published asset satisfies complete contract
        const hasRequiredFields = 
          record.source === 'local' &&
          record.contentHash &&
          record.dimensions?.width > 0 &&
          record.dimensions?.height > 0 &&
          record.variants?.original;
        
        const hasStorage = record.storage === 'static' || record.storage === 'blob';
        
        const hasLegacyDriveField = !!record.drive;
        const hasProvenance = !!record.provenance?.driveFileId;
        
        if (!hasStorage) {
          classification.MISSING_STORAGE++;
          classification.missingStorageIds.push(record.mediaId);
        } else if (!hasRequiredFields) {
          classification.MALFORMED_PUBLISHED++;
          classification.malformedIds.push(record.mediaId);
        } else if (hasLegacyDriveField) {
          // Published asset with legacy drive field - malformed
          classification.MALFORMED_PUBLISHED++;
          classification.malformedIds.push(record.mediaId);
        } else if (record.storage === 'static') {
          classification.VALID_PUBLISHED_STATIC++;
        } else if (record.storage === 'blob') {
          classification.VALID_PUBLISHED_BLOB++;
        } else {
          classification.MALFORMED_PUBLISHED++;
          classification.malformedIds.push(record.mediaId);
        }
      } else {
        classification.UNKNOWN++;
      }
      
      // Collect sample records (first 20)
      if (classification.sampleRecords.length < 20) {
        classification.sampleRecords.push(record);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('FORENSIC CLASSIFICATION REPORT');
    console.log('='.repeat(80));
    console.log('\nPRODUCTION MEDIA RECORDS:');
    console.log(`  Total records: ${forensics.totalRecords}`);
    console.log(`  Valid static: ${classification.VALID_PUBLISHED_STATIC}`);
    console.log(`  Valid blob: ${classification.VALID_PUBLISHED_BLOB}`);
    console.log(`  Missing storage: ${classification.MISSING_STORAGE} (CRITICAL)`);
    console.log(`  Malformed: ${classification.MALFORMED_PUBLISHED}`);
    console.log(`  Drive references: ${classification.DRIVE_REFERENCE}`);
    console.log(`  Materializing: ${classification.MATERIALIZING}`);
    console.log(`  Stale: ${classification.STALE}`);
    console.log(`  Unknown: ${classification.UNKNOWN}`);
    
    console.log('\nCRITICAL ISSUE - MISSING STORAGE:');
    console.log(`  Records affected: ${classification.MISSING_STORAGE}`);
    if (classification.missingStorageIds.length > 0) {
      console.log(`  Sample IDs (first 20):`);
      classification.missingStorageIds.slice(0, 20).forEach(id => {
        console.log(`    - ${id}`);
      });
      if (classification.missingStorageIds.length > 20) {
        console.log(`    ... and ${classification.missingStorageIds.length - 20} more`);
      }
    }
    
    console.log('\nMALFORMED RECORDS:');
    console.log(`  Records affected: ${classification.MALFORMED_PUBLISHED}`);
    if (classification.malformedIds.length > 0) {
      console.log(`  Sample IDs (first 20):`);
      classification.malformedIds.slice(0, 20).forEach(id => {
        console.log(`    - ${id}`);
      });
      if (classification.malformedIds.length > 20) {
        console.log(`    ... and ${classification.malformedIds.length - 20} more`);
      }
    }
    
    console.log('\nSAMPLE RECORDS (first 20):');
    classification.sampleRecords.forEach((record, i) => {
      console.log(`  ${i + 1}. ${record.mediaId}`);
      console.log(`     Filename: ${record.filename}`);
      console.log(`     Lifecycle: ${record.lifecycleState}`);
      console.log(`     Source: ${record.source}`);
      console.log(`     Storage: ${record.storage || 'MISSING'}`);
      console.log(`     Content hash: ${record.contentHash || 'MISSING'}`);
      console.log(`     Original: ${record.variants?.original || 'MISSING'}`);
      console.log(`     Has legacy drive field: ${!!record.drive}`);
      console.log(`     Has provenance: ${!!record.provenance?.driveFileId}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('CLASSIFICATION SUMMARY');
    console.log('='.repeat(80));
    
    if (classification.MISSING_STORAGE > 0) {
      console.log('\n⚠️  CRITICAL: ' + classification.MISSING_STORAGE + ' published records missing storage field');
      console.log('    These records are rejected by the public media gate.');
      console.log('    This is the root cause of "one photo works, others disappear" behavior.');
    }
    
    if (classification.MALFORMED_PUBLISHED > 0) {
      console.log('\n⚠️  WARNING: ' + classification.MALFORMED_PUBLISHED + ' malformed published records');
      console.log('    These records have structural violations.');
    }
    
    const validTotal = classification.VALID_PUBLISHED_STATIC + classification.VALID_PUBLISHED_BLOB;
    if (validTotal > 0) {
      console.log('\n✅ GOOD: ' + validTotal + ' valid published records');
      console.log('    These records pass the complete public media gate contract.');
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Save full classification to file
    const fs = await import('fs');
    const classificationReport = {
      timestamp: new Date().toISOString(),
      classification,
      forensics,
    };
    fs.writeFileSync(
      'forensic-classification-report.json',
      JSON.stringify(classificationReport, null, 2)
    );
    console.log('\nFull classification report saved to: forensic-classification-report.json');
    
  } catch (error) {
    console.error('[FORENSIC_CLASSIFICATION] Script failed:', error);
  }
}

// Run the forensic classification
forensicClassification();
