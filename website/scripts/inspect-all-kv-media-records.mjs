/**
 * Production Diagnostic: Inspect ALL KV Media Records for Schema Compliance
 * 
 * This script audits every media record in KV to identify:
 * - Records with contentHash present but storage absent
 * - Records violating current Media schema
 * - Historical schema migration artifacts
 * 
 * Usage: node scripts/inspect-all-kv-media-records.mjs
 */

import { listMediaIds, getMediaRecordRaw } from '../src/lib/media-kv-store.ts';
import { loadMediaManifest } from '../src/lib/media.ts';

async function inspectAllRecords() {
  console.log('[KV_MEDIA_AUDIT] Starting comprehensive KV media record inspection...');
  
  try {
    // Get all media IDs from KV
    const allIds = await listMediaIds();
    console.log('[KV_MEDIA_AUDIT] Total KV records found:', allIds.length);
    
    const results = {
      total: allIds.length,
      compliant: 0,
      malformed: [],
      schemaViolations: [],
      missingStorage: [],
      missingContentHash: [],
      publishedLocal: [],
      driveReferences: [],
      unknownStates: [],
    };
    
    // Load canonical static authority for comparison
    const manifest = loadMediaManifest();
    const canonicalIds = new Set(manifest.media.map(m => m.id));
    console.log('[KV_MEDIA_AUDIT] Canonical static authority records:', canonicalIds.size);
    
    for (const id of allIds) {
      const record = await getMediaRecordRaw(id);
      
      if (!record) {
        console.warn('[KV_MEDIA_AUDIT] Record returned null:', id);
        continue;
      }
      
      // Classify record state
      const analysis = {
        id,
        hasStorage: record.storage !== undefined && record.storage !== null,
        storageValue: record.storage,
        hasContentHash: !!record.contentHash,
        contentHashLength: record.contentHash?.length || 0,
        lifecycleState: record.lifecycleState,
        source: record.source,
        hasVariants: !!record.variants,
        hasOriginalVariant: !!record.variants?.original,
        inCanonical: canonicalIds.has(id),
      };
      
      // Check for schema violations
      const isPublishedLocal = record.lifecycleState === 'published' && record.source === 'local';
      
      if (isPublishedLocal) {
        results.publishedLocal.push(id);
        
        // Check storage contract
        if (!analysis.hasStorage) {
          results.missingStorage.push({
            id,
            contentHash: record.contentHash ? record.contentHash.substring(0, 16) + '...' : 'MISSING',
            contentHashLength: analysis.contentHashLength,
            inCanonical: analysis.inCanonical,
            hasVariants: analysis.hasVariants,
          });
          results.malformed.push(id);
        } else if (record.storage !== 'static' && record.storage !== 'blob') {
          results.schemaViolations.push({
            id,
            storage: record.storage,
            reason: 'Invalid storage value (must be static or blob)',
          });
          results.malformed.push(id);
        }
        
        // Check content hash for blob storage
        if (record.storage === 'blob' && !analysis.hasContentHash) {
          results.schemaViolations.push({
            id,
            storage: record.storage,
            reason: 'Blob storage requires content hash',
          });
          results.malformed.push(id);
        }
        
        // Check variants for static storage
        if (record.storage === 'static' && !analysis.hasOriginalVariant) {
          results.schemaViolations.push({
            id,
            storage: record.storage,
            reason: 'Static storage requires original variant',
          });
          results.malformed.push(id);
        }
      } else if (record.lifecycleState === 'source_reference' || record.source === 'google-drive') {
        results.driveReferences.push(id);
      } else {
        results.unknownStates.push({
          id,
          lifecycleState: record.lifecycleState,
          source: record.source,
        });
      }
      
      // Track compliant records
      if (isPublishedLocal && analysis.hasStorage && 
          (record.storage === 'static' || record.storage === 'blob')) {
        results.compliant++;
      }
    }
    
    // Print results
    console.log('\n[KV_MEDIA_AUDIT] === RESULTS ===');
    console.log('[KV_MEDIA_AUDIT] Total records:', results.total);
    console.log('[KV_MEDIA_AUDIT] Compliant published local records:', results.compliant);
    console.log('[KV_MEDIA_AUDIT] Malformed records:', results.malformed.length);
    console.log('[KV_MEDIA_AUDIT] Published local records:', results.publishedLocal.length);
    console.log('[KV_MEDIA_AUDIT] Drive references:', results.driveReferences.length);
    console.log('[KV_MEDIA_AUDIT] Unknown states:', results.unknownStates.length);
    
    if (results.missingStorage.length > 0) {
      console.log('\n[KV_MEDIA_AUDIT] === MISSING STORAGE FIELD ===');
      console.log('[KV_MEDIA_AUDIT] Count:', results.missingStorage.length);
      results.missingStorage.forEach(r => {
        console.log(`[KV_MEDIA_AUDIT] - ID: ${r.id}`);
        console.log(`[KV_MEDIA_AUDIT]   ContentHash: ${r.contentHash}`);
        console.log(`[KV_MEDIA_AUDIT]   ContentHashLength: ${r.contentHashLength}`);
        console.log(`[KV_MEDIA_AUDIT]   InCanonical: ${r.inCanonical}`);
        console.log(`[KV_MEDIA_AUDIT]   HasVariants: ${r.hasVariants}`);
      });
    }
    
    if (results.schemaViolations.length > 0) {
      console.log('\n[KV_MEDIA_AUDIT] === SCHEMA VIOLATIONS ===');
      console.log('[KV_MEDIA_AUDIT] Count:', results.schemaViolations.length);
      results.schemaViolations.forEach(v => {
        console.log(`[KV_MEDIA_AUDIT] - ID: ${v.id}`);
        console.log(`[KV_MEDIA_AUDIT]   Storage: ${v.storage}`);
        console.log(`[KV_MEDIA_AUDIT]   Reason: ${v.reason}`);
      });
    }
    
    if (results.unknownStates.length > 0) {
      console.log('\n[KV_MEDIA_AUDIT] === UNKNOWN STATES ===');
      console.log('[KV_MEDIA_AUDIT] Count:', results.unknownStates.length);
      results.unknownStates.forEach(s => {
        console.log(`[KV_MEDIA_AUDIT] - ID: ${s.id}`);
        console.log(`[KV_MEDIA_AUDIT]   LifecycleState: ${s.lifecycleState}`);
        console.log(`[KV_MEDIA_AUDIT]   Source: ${s.source}`);
      });
    }
    
    console.log('\n[KV_MEDIA_AUDIT] === SUMMARY ===');
    console.log('[KV_MEDIA_AUDIT] Health:', results.malformed.length === 0 ? 'HEALTHY' : 'MALFORMED');
    console.log('[KV_MEDIA_AUDIT] Action required:', results.malformed.length > 0 ? 'YES' : 'NO');
    
    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      results,
      recommendations: results.malformed.length > 0 ? [
        '1. Review each malformed record',
        '2. Check canonical authority for missing storage records',
        '3. Determine if record should be deleted or repaired',
        '4. For records in canonical authority, add storage field',
        '5. For records not in canonical authority, consider deletion',
      ] : [
        'No action required - all records are schema-compliant',
      ],
    };
    
    console.log('\n[KV_MEDIA_AUDIT] Full report object:');
    console.log(JSON.stringify(report, null, 2));
    
  } catch (error) {
    console.error('[KV_MEDIA_AUDIT] ERROR:', error);
    process.exit(1);
  }
}

inspectAllRecords();
