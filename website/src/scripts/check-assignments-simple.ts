/**
 * Simple Assignment Checker
 * 
 * Direct KV scan to check current assignment state without library imports
 * to avoid module cycles.
 */

import { Redis } from '@upstash/redis';

async function main() {
  console.log('[ASSIGNMENT_CHECK] Starting...');
  
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    console.error('[ASSIGNMENT_CHECK] KV credentials missing');
    process.exit(1);
  }
  
  const client = new Redis({ url, token });
  
  try {
    // Scan for all service-card-assignment keys
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await client.scan(cursor, { match: 'service-card-assignment:*', count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    console.log('[ASSIGNMENT_CHECK] TOTAL_ASSIGNMENTS', { count: keys.length });
    
    // Get brand-specific assignments
    const brandHero = await client.get('service-card-assignment:brand-hero');
    const brandHeroBackground = await client.get('service-card-assignment:brand-hero-background');
    const brandPortrait = await client.get('service-card-assignment:brand-portrait');
    const brandPortraitHomepage = await client.get('service-card-assignment:brand-portrait-homepage');
    
    console.log('[ASSIGNMENT_CHECK] BRAND_ASSIGNMENTS', {
      brandHero,
      brandHeroBackground,
      brandPortrait,
      brandPortraitHomepage,
    });
    
    // Get service card assignments
    const fences = await client.get('service-card-assignment:fences');
    const painting = await client.get('service-card-assignment:painting');
    const drywallRepair = await client.get('service-card-assignment:drywall-repair');
    
    console.log('[ASSIGNMENT_CHECK] SERVICE_ASSIGNMENTS', {
      fences,
      painting,
      drywallRepair,
    });
    
    // List all assignment keys
    console.log('[ASSIGNMENT_CHECK] ALL_KEYS', keys);
    
    process.exit(0);
  } catch (error) {
    console.error('[ASSIGNMENT_CHECK] ERROR', error);
    process.exit(1);
  }
}

main();