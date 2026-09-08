/**
 * Gallery Media Audit API
 * 
 * Provides dry-run analysis of which gallery IDs resolve through the authority chain
 * without modifying any data.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { loadMediaManifest } from '@/lib/media';
import { getMedia, getMediaRecordRaw, listMediaIds } from '@/lib/media-kv-store';
import { getKvNamespace } from '@/lib/environment';
import { resolvePublicMedia } from '@/lib/media';
import type { Media } from '@/types/media';
import { loadProjectsManifest } from '@/lib/projects';

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
    
    // Load projects manifest to derive actual gallery IDs
    const projectsManifest = loadProjectsManifest();
    
    // Derive gallery IDs from actual project authority
    const galleryIds: string[] = [];
    for (const project of projectsManifest.projects) {
      const projectGallery = project.media?.gallery || [];
      for (const mediaId of projectGallery) {
        if (!galleryIds.includes(mediaId)) {
          galleryIds.push(mediaId);
        }
      }
    }
    
    console.log('[GALLERY_AUDIT] DERIVED_GALLERY_IDS', {
      auditId,
      totalProjects: projectsManifest.projects.length,
      totalGalleryIds: galleryIds.length
    });
    
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
      const kvRecordRaw = await getMediaRecordRaw(mediaId);
      const kvRecord = await getMedia(mediaId); // Runs public gate
      
      // Validate KV record using raw accessor (not through public gate)
      let kvValidity: 'VALID' | 'INVALID' | 'MISSING' = 'MISSING';
      if (kvRecordRaw) {
        // Check if it's a valid PublishedMediaAsset
        kvValidity = (
          kvRecordRaw.lifecycleState === 'published' &&
          kvRecordRaw.source === 'local' &&
          kvRecordRaw.storage === 'static' &&
          kvRecordRaw.contentHash &&
          kvRecordRaw.contentHash.length > 0 &&
          kvRecordRaw.variants &&
          kvRecordRaw.variants.original &&
          kvRecordRaw.variants.original.startsWith('/images/')
        ) ? 'VALID' as const : 'INVALID' as const;
        
        if (kvValidity === 'VALID') kvValidityValid++;
        else kvValidityInvalid++;
      } else {
        missingFromKv++;
      }
      
      // Test actual public gate using resolvePublicMedia()
      let publicGate: 'PASS' | 'FAIL' | 'MISSING' = 'MISSING';
      const publicMedia = await resolvePublicMedia(mediaId);
      if (publicMedia) {
        publicGate = 'PASS' as const;
        publicGatePass++;
      } else if (kvRecordRaw) {
        publicGate = 'FAIL' as const;
        publicGateFail++;
      }
      
      // Determine action
      const action = !kvRecordRaw && staticRecord ? 'BOOTSTRAP' as const : (kvRecordRaw ? 'NOOP' as const : 'MISSING_FROM_STATIC' as const);
      
      if (!staticRecord) missingFromStatic++;
      if (kvRecordRaw) presentInKv++;
      
      auditResults.push({
        mediaId,
        staticAuthority: staticRecord ? 'PRESENT' as const : 'MISSING' as const,
        kvAuthority: kvRecordRaw ? 'PRESENT' as const : 'MISSING' as const,
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
        kvRecord: kvRecordRaw ? {
          lifecycleState: kvRecordRaw.lifecycleState,
          source: kvRecordRaw.source,
          storage: kvRecordRaw.storage,
          contentHash: kvRecordRaw.contentHash ? kvRecordRaw.contentHash.substring(0, 16) + '...' : 'MISSING',
          variants: kvRecordRaw.variants ? { original: kvRecordRaw.variants.original } : undefined
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
