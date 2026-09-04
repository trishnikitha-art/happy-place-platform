/**
 * Focused Media Resolution Trace - Local Diagnostic
 * 
 * Traces the exact chain for a specific media ID to identify the first broken link.
 * This runs locally without authentication constraints.
 */

const path = require('path');
const fs = require('fs');

async function traceMediaResolution(mediaId) {
  const trace = {
    mediaId,
    timestamp: new Date().toISOString(),
    steps: [],
  };

  console.log(`[TRACE] Starting media resolution trace for: ${mediaId}`);

  // STEP 1: Check static media.v1.main.json authority
  console.log('[TRACE] Step 1: Checking static media.v1.main.json authority...');
  try {
    const manifestPath = path.join(process.cwd(), 'src/config/media.v1.main.json');
    const manifestData = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestData);
    const staticMedia = manifest.media.find(m => m.id === mediaId);
    
    if (staticMedia) {
      console.log('[TRACE] ✓ Static media found in media.v1.main.json');
      trace.steps.push({ 
        step: '1', 
        status: 'STATIC_MEDIA_FOUND',
        data: {
          id: staticMedia.id,
          hasLifecycleState: typeof staticMedia.lifecycleState !== 'undefined',
          lifecycleState: staticMedia.lifecycleState,
          source: staticMedia.source,
          hasContentHash: typeof staticMedia.contentHash !== 'undefined',
          contentHash: staticMedia.contentHash,
          hasDriveId: typeof staticMedia.driveId !== 'undefined',
          driveId: staticMedia.driveId,
          variants: staticMedia.variants,
        }
      });
    } else {
      console.log('[TRACE] ✗ Static media NOT found in media.v1.main.json');
      trace.steps.push({ step: '1', status: 'STATIC_MEDIA_NOT_FOUND' });
    }
  } catch (error) {
    console.log('[TRACE] ✗ Static authority error:', error.message);
    trace.steps.push({ 
      step: '1', 
      status: 'STATIC_AUTHORITY_ERROR',
      data: { error: error.message }
    });
  }

  // STEP 2: Check physical file existence (bypass KV for now)
  console.log('[TRACE] Step 2: Checking physical file existence...');
  try {
    const manifestPath = path.join(process.cwd(), 'src/config/media.v1.main.json');
    const manifestData = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestData);
    const staticMedia = manifest.media.find(m => m.id === mediaId);
    
    if (staticMedia && staticMedia.variants?.web) {
      const filePath = staticMedia.variants.web.startsWith('/') 
        ? staticMedia.variants.web.substring(1) 
        : staticMedia.variants.web;
      
      const fullPath = path.join(process.cwd(), 'public', filePath);
      const exists = fs.existsSync(fullPath);
      
      if (exists) {
        console.log('[TRACE] ✓ Physical file EXISTS:', fullPath);
      } else {
        console.log('[TRACE] ✗ Physical file NOT FOUND:', fullPath);
      }
      
      trace.steps.push({ 
        step: '2', 
        status: exists ? 'PHYSICAL_FILE_EXISTS' : 'PHYSICAL_FILE_NOT_FOUND',
        data: { filePath, fullPath, exists }
      });
    } else {
      console.log('[TRACE] ✗ No variant path to check');
      trace.steps.push({ 
        step: '2', 
        status: 'NO_VARIANT_PATH_TO_CHECK',
        data: { hasStaticMedia: !!staticMedia, hasVariants: !!staticMedia?.variants, hasWeb: !!staticMedia?.variants?.web }
      });
    }
  } catch (error) {
    console.log('[TRACE] ✗ Physical file check error:', error.message);
    trace.steps.push({ 
      step: '2', 
      status: 'PHYSICAL_FILE_CHECK_ERROR',
      data: { error: error.message }
    });
  }

  console.log('\n[TRACE] Complete trace result:');
  console.log(JSON.stringify(trace, null, 2));
  
  return trace;
}

// Run trace for pergolas-001-hero
traceMediaResolution('pergolas-001-hero')
  .then(() => console.log('\n[TRACE] Trace complete'))
  .catch(error => {
    console.error('[TRACE] Fatal error:', error);
    process.exit(1);
  });
