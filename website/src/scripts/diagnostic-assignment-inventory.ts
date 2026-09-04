/**
 * Runtime Assignment Inventory Diagnostic
 * 
 * Inspects the actual KV state to diagnose media resolution failures.
 * Returns detailed forensic data about assignments, media records, and resolution paths.
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// Import assignment store functions (with type check)
const assignmentStoreModule = require('../lib/assignment-store');
const mediaModule = require('../lib/media');

interface DiagnosticResult {
  kvConnectivity: {
    success: boolean;
    error?: string;
    namespace?: string;
    urlHost?: string;
  };
  assignments: {
    totalKeys: number;
    homepageBottomVisual: {
      exists: boolean;
      mediaId: string | null;
      schemaValid: boolean;
      rawAssignment: any;
    };
    aboutBottomVisual: {
      exists: boolean;
      mediaId: string | null;
      schemaValid: boolean;
      rawAssignment: any;
    };
    brandHero: {
      exists: boolean;
      mediaId: string | null;
      schemaValid: boolean;
      rawAssignment: any;
    };
    brandPortrait: {
      exists: boolean;
      mediaId: string | null;
      schemaValid: boolean;
      rawAssignment: any;
    };
    serviceCards: Array<{
      serviceSlug: string;
      exists: boolean;
      mediaId: string | null;
      schemaValid: boolean;
    }>;
  };
  mediaResolution: {
    homepageBottomVisual: {
      mediaId: string | null;
      mediaRecord: any;
      publicGateResult: 'PASSED' | 'FAILED' | 'NOT_FOUND';
      failureReason?: string;
    };
    aboutBottomVisual: {
      mediaId: string | null;
      mediaRecord: any;
      publicGateResult: 'PASSED' | 'FAILED' | 'NOT_FOUND';
      failureReason?: string;
    };
    brandHero: {
      mediaId: string | null;
      mediaRecord: any;
      publicGateResult: 'PASSED' | 'FAILED' | 'NOT_FOUND';
      failureReason?: string;
    };
    brandPortrait: {
      mediaId: string | null;
      mediaRecord: any;
      publicGateResult: 'PASSED' | 'FAILED' | 'NOT_FOUND';
      failureReason?: string;
    };
  };
  summary: {
    totalAssignments: number;
    assignmentsWithMedia: number;
    assignmentsResolving: number;
    assignmentsFailing: number;
  };
}

async function createRedisClient(): Promise<Redis> {
  let url = process.env.KV_REST_API_URL;
  let token = process.env.KV_REST_API_TOKEN;
  
  const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
  const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;
  
  if (!url && integrationUrl) {
    url = integrationUrl;
  }
  if (!token && integrationToken) {
    token = integrationToken;
  }
  
  return new Redis({
    url: url || '',
    token: token || '',
  });
}

function getEnvironment(): string {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'preview';
  if (nodeEnv === 'development') return 'development';
  if (nodeEnv === 'test') return 'test';
  
  return 'unknown';
}

function getKvNamespace(): string {
  const env = getEnvironment();
  return `hpp:${env}:`;
}

async function inspectAssignment(key: string, client: Redis): Promise<{
  exists: boolean;
  mediaId: string | null;
  schemaValid: boolean;
  rawAssignment: any;
}> {
  try {
    const assignment = await client.get(key);
    
    if (!assignment) {
      return { exists: false, mediaId: null, schemaValid: false, rawAssignment: null };
    }
    
    // Validate schema
    const candidate = assignment as any;
    const schemaValid = 
      typeof candidate === 'object' &&
      typeof candidate.serviceSlug === 'string' &&
      candidate.serviceSlug.trim().length > 0 &&
      typeof candidate.mediaId === 'string' &&
      candidate.mediaId.trim().length > 0;
    
    return {
      exists: true,
      mediaId: candidate.mediaId || null,
      schemaValid,
      rawAssignment: assignment,
    };
  } catch (error) {
    console.error(`[DIAGNOSTIC] Failed to inspect assignment ${key}:`, error);
    return { exists: false, mediaId: null, schemaValid: false, rawAssignment: null };
  }
}

async function inspectMediaResolution(mediaId: string): Promise<{
  mediaRecord: any;
  publicGateResult: 'PASSED' | 'FAILED' | 'NOT_FOUND';
  failureReason?: string;
}> {
  try {
    const mediaRecord = await mediaModule.getMedia(mediaId);
    
    if (!mediaRecord) {
      return { mediaRecord: null, publicGateResult: 'NOT_FOUND', failureReason: 'Media record not found' };
    }
    
    // Test public gate
    const resolvedMedia = await mediaModule.resolvePublicMedia(mediaId);
    
    if (resolvedMedia) {
      return { mediaRecord, publicGateResult: 'PASSED' };
    } else {
      // Determine failure reason
      const failureReason = mediaRecord.source === 'google-drive' 
        ? 'Drive reference cannot pass public gate'
        : mediaRecord.lifecycleState !== 'published'
        ? 'Media not in published state'
        : 'Media failed public gate validation';
      
      return { mediaRecord, publicGateResult: 'FAILED', failureReason };
    }
  } catch (error) {
    console.error(`[DIAGNOSTIC] Failed to inspect media resolution for ${mediaId}:`, error);
    return { mediaRecord: null, publicGateResult: 'FAILED', failureReason: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function runDiagnostic(): Promise<DiagnosticResult> {
  console.log('[DIAGNOSTIC] Starting runtime assignment inventory...');
  
  // Check KV connectivity
  let kvConnectivity: DiagnosticResult['kvConnectivity'] = {
    success: false,
  };
  
  try {
    const client = await createRedisClient();
    await client.ping();
    
    kvConnectivity = {
      success: true,
      namespace: getKvNamespace(),
      urlHost: process.env.KV_REST_API_URL ? new URL(process.env.KV_REST_API_URL).hostname : 'none',
    };
    
    console.log('[DIAGNOSTIC] KV connectivity OK', kvConnectivity);
    
    // Inspect key assignments
    const namespace = getKvNamespace();
    const ASSIGNMENT_PREFIX = 'service-card-assignment:';
    
    const homepageBottomVisual = await inspectAssignment(
      `${namespace}${ASSIGNMENT_PREFIX}homepage-bottom-visual`,
      client
    );
    
    const aboutBottomVisual = await inspectAssignment(
      `${namespace}${ASSIGNMENT_PREFIX}about-bottom-visual`,
      client
    );
    
    const brandHero = await inspectAssignment(
      `${namespace}${ASSIGNMENT_PREFIX}brand-hero-background`,
      client
    );
    
    const brandPortrait = await inspectAssignment(
      `${namespace}${ASSIGNMENT_PREFIX}brand-portrait-homepage`,
      client
    );
    
    // Inspect service cards
    const services = ['fences', 'painting', 'decks', 'bathrooms', 'finish-carpentry', 'historic-restoration', 'repairs', 'pergolas', 'adus', 'drywall'];
    const serviceCards = await Promise.all(
      services.map(async (serviceSlug) => {
        const assignment = await inspectAssignment(
          `${namespace}${ASSIGNMENT_PREFIX}${serviceSlug}`,
          client
        );
        return {
          serviceSlug,
          exists: assignment.exists,
          mediaId: assignment.mediaId,
          schemaValid: assignment.schemaValid,
        };
      })
    );
    
    // Count total keys
    const keys = await client.keys(`${namespace}${ASSIGNMENT_PREFIX}*`);
    const totalKeys = keys.length;
    
    // Inspect media resolution
    const mediaResolution = {
      homepageBottomVisual: homepageBottomVisual.mediaId 
        ? await inspectMediaResolution(homepageBottomVisual.mediaId)
        : { mediaRecord: null, publicGateResult: 'NOT_FOUND' as const },
      aboutBottomVisual: aboutBottomVisual.mediaId
        ? await inspectMediaResolution(aboutBottomVisual.mediaId)
        : { mediaRecord: null, publicGateResult: 'NOT_FOUND' as const },
      brandHero: brandHero.mediaId
        ? await inspectMediaResolution(brandHero.mediaId)
        : { mediaRecord: null, publicGateResult: 'NOT_FOUND' as const },
      brandPortrait: brandPortrait.mediaId
        ? await inspectMediaResolution(brandPortrait.mediaId)
        : { mediaRecord: null, publicGateResult: 'NOT_FOUND' as const },
    };
    
    // Summary
    const allAssignments = [
      homepageBottomVisual,
      aboutBottomVisual,
      brandHero,
      brandPortrait,
      ...serviceCards,
    ];
    
    const assignmentsWithMedia = allAssignments.filter(a => a.exists && a.mediaId !== null).length;
    const assignmentsResolving = Object.values(mediaResolution).filter(r => r.publicGateResult === 'PASSED').length;
    const assignmentsFailing = Object.values(mediaResolution).filter(r => r.publicGateResult === 'FAILED').length;
    
    const result: DiagnosticResult = {
      kvConnectivity,
      assignments: {
        totalKeys,
        homepageBottomVisual,
        aboutBottomVisual,
        brandHero,
        brandPortrait,
        serviceCards,
      },
      mediaResolution,
      summary: {
        totalAssignments: allAssignments.length,
        assignmentsWithMedia,
        assignmentsResolving,
        assignmentsFailing,
      },
    };
    
    console.log('[DIAGNOSTIC] Runtime inventory complete:', result);
    return result;
  }
}

// Run diagnostic if executed directly
if (require.main === module || process.argv.includes('diagnostic-assignment-inventory')) {
  runDiagnostic()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('[DIAGNOSTIC] Fatal error:', error);
      process.exit(1);
    });
}
