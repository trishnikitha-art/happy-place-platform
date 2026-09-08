/**
 * Gallery Media Audit API
 * 
 * Provides dry-run analysis of which gallery IDs resolve through the authority chain
 * without modifying any data.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { loadMediaManifest } from '@/lib/media';
import { getMedia, listMediaIds } from '@/lib/media-kv-store';
import { getKvNamespace } from '@/lib/environment';
import type { Media } from '@/types/media';

export const dynamic = 'force-dynamic';

interface GalleryAuditResponse {
  success: boolean;
  auditId: string;
  performedAt: string;
  galleryIds: {
    mediaId: string;
    staticAuthority: 'PRESENT' | 'MISSING';
    kvAuthority: 'PRESENT' | 'MISSING';
    kvValidity: 'VALID' | 'INVALID' | 'MISSING';
    publicGate: 'PASS' | 'FAIL' | 'MISSING';
    action: 'BOOTSTRAP' | 'NOOP' | 'MISSING_FROM_STATIC';
    staticRecord?: any;
    kvRecord?: any;
  }[];
  summary: {
    totalGalleryIds: number;
    missingFromKv: number;
    presentInKv: number;
    missingFromStatic: number;
    kvValidityValid: number;
    kvValidityInvalid: number;
    publicGatePass: number;
    publicGateFail: number;
  };
}

export async function GET(request: Request) {
  const auditId = `gallery-audit-${Date.now()}`;
  const performedAt = new Date().toISOString();
  
  console.log('[GALLERY_AUDIT] OPERATION_STARTED', { auditId, performedAt });
  
  // AUTHORIZATION: Admin authentication required
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    console.error('[GALLERY_AUDIT] AUTHENTICATION_FAILED', { auditId });
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin authentication required for gallery audit' },
      { status: 401 }
    );
  }
  
  const sessionIdentity = await workbenchSession.getSessionIdentity();
  const authorizedBy = sessionIdentity?.email || 'unknown';
  
  console.log('[GALLERY_AUDIT] AUTHORIZATION_PASSED', { auditId, authorizedBy });
  
  try {
    // Load static media manifest
    const manifest = loadMediaManifest();
    
    // Gallery IDs from projects.v1.json
    const galleryIds = [
      'repairs-001-drywall',
      'repairs-001-floor',
      'repairs-001-gutter',
      'repairs-001-floor0',
      'repairs-001-img0544',
      'repairs-001-img0546',
      'builtins-001-secondary',
      'outdoor-living-001-2',
      'outdoor-living-001-3',
      'outdoor-living-001-4',
      'outdoor-living-001-5',
      'outdoor-living-001-6'
    ];
    
    const auditResults = [];
    let missingFromKv = 0;
    let presentInKv = 0;
    let missingFromStatic = 0;
    let kvValidityValid = 0;
    let kvValidityInvalid = 0;
    let publicGatePass = 0;
    let publicGateFail = 0;
    
    for (const mediaId of galleryIds) {
      const staticRecord = manifest.media.find((m: Media) => m.id === mediaId);
      const kvRecord = await getMedia(mediaId);
      
      // Validate KV record
      let kvValidity: 'VALID' | 'INVALID' | 'MISSING' = 'MISSING';
      if (kvRecord) {
        // Check if it's a valid PublishedMediaAsset
        kvValidity = (
          kvRecord.lifecycleState === 'published' &&
          kvRecord.source === 'local' &&
          kvRecord.storage === 'static' &&
          kvRecord.contentHash &&
          kvRecord.contentHash.length > 0 &&
          kvRecord.variants &&
          kvRecord.variants.original &&
          kvRecord.variants.original.startsWith('/images/')
        ) ? 'VALID' as const : 'INVALID' as const;
        
        if (kvValidity === 'VALID') kvValidityValid++;
        else kvValidityInvalid++;
      } else {
        missingFromKv++;
      }
      
      // Check public gate (simulated)
      let publicGate: 'PASS' | 'FAIL' | 'MISSING' = 'MISSING';
      if (kvRecord && kvValidity === 'VALID') {
        // Static assets pass public gate if they have valid /images/ paths
        publicGate = 'PASS' as const;
        publicGatePass++;
      } else if (kvRecord) {
        publicGate = 'FAIL' as const;
        publicGateFail++;
      }
      
      // Determine action
      const action = !kvRecord && staticRecord ? 'BOOTSTRAP' as const : (kvRecord ? 'NOOP' as const : 'MISSING_FROM_STATIC' as const);
      
      if (!staticRecord) missingFromStatic++;
      if (kvRecord) presentInKv++;
      
      auditResults.push({
        mediaId,
        staticAuthority: staticRecord ? 'PRESENT' as const : 'MISSING' as const,
        kvAuthority: kvRecord ? 'PRESENT' as const : 'MISSING' as const,
        kvValidity,
        publicGate,
        action: action as 'BOOTSTRAP' | 'NOOP' | 'MISSING_FROM_STATIC',
        staticRecord: staticRecord ? {
          lifecycleState: staticRecord.lifecycleState,
          source: staticRecord.source,
          storage: staticRecord.storage,
          contentHash: staticRecord.contentHash ? staticRecord.contentHash.substring(0, 16) + '...' : 'MISSING',
          variants: staticRecord.variants ? { original: staticRecord.variants.original } : undefined
        } : undefined,
        kvRecord: kvRecord ? {
          lifecycleState: kvRecord.lifecycleState,
          source: kvRecord.source,
          storage: kvRecord.storage,
          contentHash: kvRecord.contentHash ? kvRecord.contentHash.substring(0, 16) + '...' : 'MISSING',
          variants: kvRecord.variants ? { original: kvRecord.variants.original } : undefined
        } : undefined
      });
    }
    
    const response: GalleryAuditResponse = {
      success: true,
      auditId,
      performedAt,
      galleryIds: auditResults,
      summary: {
        totalGalleryIds: galleryIds.length,
        missingFromKv,
        presentInKv,
        missingFromStatic,
        kvValidityValid,
        kvValidityInvalid,
        publicGatePass,
        publicGateFail
      }
    };
    
    console.log('[GALLERY_AUDIT] OPERATION_COMPLETED', {
      auditId,
      summary: response.summary
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[GALLERY_AUDIT] OPERATION_FAILED', {
      auditId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      {
        error: 'Gallery audit failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        auditId
      },
      { status: 500 }
    );
  }
}
