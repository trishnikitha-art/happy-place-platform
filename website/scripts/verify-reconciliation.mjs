/**
 * Verify specific media IDs after reconciliation
 * Check the IDs that were previously failing with MEDIA_RESOLUTION_FAILED
 */

const TARGET_IDS = [
  'davis-bathroom-remodel-0',
  'pergolas-001-before',
  'outdoor-living-001-4',
  'pergolas-001-hero',
  'repairs-001-hero',
  'fences-001-hero',
  'fences-001-before',
  'smith-built-ins-0'
];

const SESSION_COOKIE = process.env.WORKBENCH_SESSION_COOKIE;
const PRODUCTION_ENDPOINT = 'https://happy-place-platform.vercel.app/api/workbench/media-authority';

async function verifyMediaIds() {
  console.log('[VERIFICATION] Checking specific media IDs after reconciliation...');
  
  if (!SESSION_COOKIE) {
    console.error('[VERIFICATION] ERROR: WORKBENCH_SESSION_COOKIE not set');
    process.exit(1);
  }
  
  const results = [];
  
  for (const mediaId of TARGET_IDS) {
    try {
      const response = await fetch(PRODUCTION_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `workbench_session_id=${SESSION_COOKIE}`
        },
        body: JSON.stringify({ action: 'get', mediaId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        results.push({
          mediaId,
          found: true,
          storage: data.media?.storage,
          lifecycleState: data.media?.lifecycleState,
          source: data.media?.source,
          hasVariants: !!data.media?.variants && Object.keys(data.media.variants).length > 0,
        });
      } else {
        results.push({
          mediaId,
          found: false,
          error: response.status,
        });
      }
    } catch (error) {
      results.push({
        mediaId,
        found: false,
        error: error.message,
      });
    }
  }
  
  console.log('[VERIFICATION] Results:');
  console.log(JSON.stringify(results, null, 2));
  
  const foundCount = results.filter(r => r.found).length;
  const staticCount = results.filter(r => r.storage === 'static').length;
  const publishedCount = results.filter(r => r.lifecycleState === 'published').length;
  
  console.log('[VERIFICATION] Summary:');
  console.log(`  - Found in KV: ${foundCount}/${TARGET_IDS.length}`);
  console.log(`  - Has storage: static: ${staticCount}/${TARGET_IDS.length}`);
  console.log(`  - Published: ${publishedCount}/${TARGET_IDS.length}`);
  
  if (foundCount === TARGET_IDS.length && staticCount === TARGET_IDS.length) {
    console.log('[VERIFICATION] ✅ All target IDs verified');
  } else {
    console.log('[VERIFICATION] ❌ Some IDs still failing');
  }
}

verifyMediaIds();