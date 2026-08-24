/**
 * Investigate Drywall Control Case
 * 
 * This script investigates why drywall assignment works while the others fail.
 * The goal is to understand the structural difference between the working and broken assignments.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, '../.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch (error) {
    console.error('[INVESTIGATE] Failed to load .env.local:', error);
    return {};
  }
}

async function getAssignment(serviceSlug, env) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = env;
  
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return {
      serviceSlug,
      status: 'ERROR',
      reason: 'KV credentials not available',
    };
  }
  
  try {
    const key = `service-card-assignment:${serviceSlug}`;
    const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          serviceSlug,
          status: 'NOT_FOUND',
        };
      }
      return {
        serviceSlug,
        status: 'ERROR',
        reason: `KV request failed: ${response.status} ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    if (!data.result) {
      return {
        serviceSlug,
        status: 'NOT_FOUND',
      };
    }
    
    const assignment = typeof data.result === 'string' 
      ? JSON.parse(data.result) 
      : data.result;
    
    return {
      serviceSlug,
      status: 'FOUND',
      assignment,
    };
  } catch (error) {
    return {
      serviceSlug,
      status: 'ERROR',
      reason: `Check failed: ${error.message}`,
    };
  }
}

async function getMedia(mediaId, env) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = env;
  
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return {
      mediaId,
      status: 'ERROR',
      reason: 'KV credentials not available',
    };
  }
  
  try {
    const key = `media:${mediaId}`;
    const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          mediaId,
          status: 'NOT_FOUND',
        };
      }
      return {
        mediaId,
        status: 'ERROR',
        reason: `KV request failed: ${response.status} ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    if (!data.result) {
      return {
        mediaId,
        status: 'NOT_FOUND',
      };
    }
    
    const media = typeof data.result === 'string' 
      ? JSON.parse(data.result) 
      : data.result;
    
    return {
      mediaId,
      status: 'FOUND',
      media,
    };
  } catch (error) {
    return {
      mediaId,
      status: 'ERROR',
      reason: `Check failed: ${error.message}`,
    };
  }
}

async function investigateDrywallControl() {
  console.log('=== INVESTIGATING DRYWALL CONTROL CASE ===\n');
  
  const env = loadEnv();
  console.log('[INVESTIGATE] KV credentials:', {
    hasUrl: !!env.KV_REST_API_URL,
    url: env.KV_REST_API_URL,
    hasToken: !!env.KV_REST_API_TOKEN,
  });
  
  const services = ['brand-hero', 'painting', 'repairs', 'restoration', 'fences', 'drywall'];
  
  for (const serviceSlug of services) {
    console.log(`\n[INVESTIGATE] Service: ${serviceSlug}`);
    
    const assignmentResult = await getAssignment(serviceSlug, env);
    
    if (assignmentResult.status === 'FOUND') {
      console.log(`[INVESTIGATE] Assignment found:`, {
        mediaId: assignmentResult.assignment.mediaId,
        updatedAt: assignmentResult.assignment.updatedAt,
        source: assignmentResult.assignment.source,
      });
      
      const mediaResult = await getMedia(assignmentResult.assignment.mediaId, env);
      
      if (mediaResult.status === 'FOUND') {
        console.log(`[INVESTIGATE] Media found:`, {
          id: mediaResult.media.id,
          source: mediaResult.media.source,
          lifecycleState: mediaResult.media.lifecycleState,
          hasContentHash: !!mediaResult.media.contentHash,
          hasDrive: !!mediaResult.media.drive,
          hasDriveReference: !!mediaResult.media.driveReference,
          provenance: mediaResult.media.provenance,
        });
      } else {
        console.log(`[INVESTIGATE] Media ${mediaResult.status}: ${mediaResult.reason}`);
      }
    } else {
      console.log(`[INVESTIGATE] Assignment ${assignmentResult.status}: ${assignmentResult.reason}`);
    }
  }
  
  console.log('\n=== INVESTIGATION COMPLETE ===');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  investigateDrywallControl()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Investigation failed:', error);
      process.exit(1);
    });
}

export { investigateDrywallControl };
