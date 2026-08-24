/**
 * Probe Production Authority
 * 
 * This script probes the production deployment to determine:
 * 1. Which KV instance production is actually using
 * 2. Current assignment state in production
 * 3. Whether production matches local state
 */

const PRODUCTION_URL = 'https://happy-place-platform.vercel.app';

async function probeProductionAssignments() {
  console.log('=== PROBING PRODUCTION AUTHORITY ===\n');
  console.log(`[PROBE] Target: ${PRODUCTION_URL}`);
  
  const services = ['brand-hero', 'painting', 'repairs', 'restoration', 'fences', 'drywall'];
  
  for (const serviceSlug of services) {
    console.log(`\n[PROBE] Checking service: ${serviceSlug}`);
    
    try {
      // Try to hit the homepage to see what's rendering
      const response = await fetch(`${PRODUCTION_URL}/`);
      const html = await response.text();
      
      // Look for service-specific content
      if (html.includes(serviceSlug)) {
        console.log(`[PROBE] Service found in homepage HTML`);
      }
      
      // Try to check if there's any diagnostic endpoint
      try {
        const diagResponse = await fetch(`${PRODUCTION_URL}/api/admin/diagnostics`);
        if (diagResponse.ok) {
          const diagData = await diagResponse.json();
          console.log(`[PROBE] Diagnostic data available:`, Object.keys(diagData));
        }
      } catch (e) {
        console.log(`[PROBE] No diagnostic endpoint available`);
      }
      
    } catch (error) {
      console.log(`[PROBE] Error probing ${serviceSlug}:`, error.message);
    }
  }
  
  console.log('\n=== PROBE COMPLETE ===');
  console.log('[PROBE] PRODUCTION INVESTIGATION REQUIRED');
  console.log('[PROBE] Cannot determine production KV identity from HTTP probing alone');
  console.log('[PROBE] Must inspect Vercel environment variables directly');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  probeProductionAssignments()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Probe failed:', error);
      process.exit(1);
    });
}

export { probeProductionAssignments };
