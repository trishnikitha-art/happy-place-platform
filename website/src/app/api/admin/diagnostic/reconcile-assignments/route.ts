/**
 * Assignment Reconciliation
 * 
 * IDempotent reconciliation of canonical project/media relationships into runtime assignments
 * Uses authoritative assignment writer (storeServiceCardAssignment) to enforce constitutional path
 * Validates media IDs against canonical media authority through public media gate
 * Idempotent: skips existing valid assignments
 * 
 * CLASSIFICATION: SYNTHETIC-WRITE
 * - Reconciles assignments from projects.v1.json and brand.v1.json
 * - Uses storeServiceCardAssignment() to enforce CAS and public-media gate
 * - Validates media IDs against canonical media authority
 * - Idempotent: skips existing valid assignments
 * - Must be run with explicit admin authorization
 * 
 * POST /api/admin/diagnostic/reconcile-assignments
 * 
 * Performs:
 * - Load projects.v1.json and brand.v1.json (canonical configuration)
 * - Load media.v1.main.json (canonical media authority)
 * - For each project/media relationship: create or validate assignment
 * - Use authoritative assignment writer (storeServiceCardAssignment)
 * - Validates media IDs against canonical media authority through public gate
 * - Return reconciliation report
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { storeServiceCardAssignment, getServiceCardAssignment, type ServiceCardAssignment } from "@/lib/assignment-store";

interface ReconciliationResult {
  testId: string;
  startTime: string;
  endTime: string;
  deploymentSha: string;
  environment: string;
  operation: string;
  evidence: {
    projects: number;
    media: number;
    reconciled: number;
    skipped: number;
    failed: number;
    errors: Record<string, string>;
  };
  verdict: 'SUCCESS' | 'FAILED';
}

export async function POST() {
  const testId = `assignment-reconciliation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date().toISOString();
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  
  console.log('[ASSIGNMENT_RECONCILIATION] STARTED', { testId, startTime, deploymentSha, environment });

  // SECURITY: Require authentication in production
  // Development bypass requires explicit DRIVE_AUTH_BYPASS=true
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true';

  if (process.env.NODE_ENV !== 'development' || !isDevBypass) {
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({
        testId,
        startTime,
        endTime: new Date().toISOString(),
        deploymentSha,
        environment,
        operation: 'authentication',
        evidence: { error: 'Unauthorized' },
        verdict: 'FAILED',
      }, { status: 401 });
    }
  } else {
    console.warn('[ASSIGNMENT_RECONCILIATION] DEV_MODE_BYPASS_ACTIVE', {
      reason: 'DRIVE_AUTH_BYPASS=true',
    });
  }

  try {
    // Load canonical project configuration
    const projectsData = JSON.parse(
      require('fs').readFileSync(
        require('path').join(process.cwd(), 'src/config/projects.v1.json'),
        'utf8'
      )
    );
    
    // Load canonical media authority
    const mediaData = JSON.parse(
      require('fs').readFileSync(
        require('path').join(process.cwd(), 'src/config/media.v1.main.json'),
        'utf8'
      )
    );
    
    // Load brand configuration
    const brandData = JSON.parse(
      require('fs').readFileSync(
        require('path').join(process.cwd(), 'src/config/brand.v1.json'),
        'utf8'
      )
    );
    
    // Build media ID set for validation
    const canonicalMediaIds = new Set<string>(mediaData.media.map((m: { id: string }) => m.id));
    
    console.log('[ASSIGNMENT_RECONCILIATION] CANONICAL_LOADED', { 
      projects: projectsData.projects.length,
      media: mediaData.media.length
    });
    
    let reconciled = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    
    // Define helpers with closure access to counters
    const reconcileAssignment = async (slotKey: string, mediaId: string) => {
      try {
        // Validate media ID exists in canonical authority
        if (!canonicalMediaIds.has(mediaId)) {
          console.warn('[ASSIGNMENT_RECONCILIATION] MEDIA_ID_NOT_IN_CANONICAL', {
            slotKey,
            mediaId,
            reason: 'Media ID not found in canonical media authority'
          });
          return;
        }
        
        // Check if assignment already exists with same mediaId
        const existing = await getServiceCardAssignment(slotKey, testId);
        if (existing && existing.mediaId === mediaId) {
          skipped++;
          console.log('[ASSIGNMENT_RECONCILIATION] SKIPPED', { 
            slotKey,
            mediaId,
            reason: 'Assignment already exists with same mediaId'
          });
          return;
        }
        
        // Get current revision for CAS (0 if missing)
        const currentRevision = existing?.revision || 0;
        
        // Create assignment using authoritative writer
        // This enforces public-media gate validation
        const assignment: ServiceCardAssignment = {
          serviceSlug: slotKey,
          mediaId,
          source: 'reconciliation',
          revision: currentRevision + 1,
          updatedAt: new Date().toISOString(),
        };
        
        await storeServiceCardAssignment(assignment, currentRevision, testId);
        reconciled++;
        console.log('[ASSIGNMENT_RECONCILIATION] RECONCILED', { 
          slotKey,
          mediaId
        });
        
      } catch (error) {
        failed++;
        errors[slotKey] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ASSIGNMENT_RECONCILIATION] FAILED', {
          slotKey,
          mediaId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
    
    // Reconcile project media assignments
    for (const project of projectsData.projects) {
      try {
        const projectMedia = project.media;
        if (!projectMedia) continue;
        
        // Hero assignment
        if (projectMedia.hero) {
          await reconcileAssignment(
            `project:${project.id}:hero`,
            projectMedia.hero,
            canonicalMediaIds
          );
        }
        
        // Before assignment
        if (projectMedia.before) {
          await reconcileAssignment(
            `project:${project.id}:before`,
            projectMedia.before,
            canonicalMediaIds
          );
        }
        
        // After assignment
        if (projectMedia.after) {
          await reconcileAssignment(
            `project:${project.id}:after`,
            projectMedia.after,
            canonicalMediaIds
          );
        }
        
        // Gallery assignments
        if (projectMedia.gallery && Array.isArray(projectMedia.gallery)) {
          for (const [index, mediaId] of projectMedia.gallery.entries()) {
            await reconcileAssignment(
              `project:${project.id}:gallery:${index}`,
              mediaId,
              canonicalMediaIds
            );
          }
        }
        
      } catch (error) {
        failed++;
        errors[project.id] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ASSIGNMENT_RECONCILIATION] PROJECT_FAILED', {
          projectId: project.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // Reconcile brand assignments
    if (brandData.homepageHero?.mediaId) {
      await reconcileAssignment(
        'brand-hero-background',
        brandData.homepageHero.mediaId,
        canonicalMediaIds
      );
    }
    
    if (brandData.ownerPortrait?.mediaId) {
      await reconcileAssignment(
        'brand-portrait-homepage',
        brandData.ownerPortrait.mediaId,
        canonicalMediaIds
      );
    }
    
    const endTime = new Date().toISOString();
    
    return NextResponse.json({
      testId,
      startTime,
      endTime,
      deploymentSha,
      environment,
      operation: 'reconcile_assignments',
      evidence: {
        projects: projectsData.projects.length,
        media: mediaData.media.length,
        reconciled,
        skipped,
        failed,
        errors: failed > 0 ? errors : undefined,
      },
      verdict: failed === 0 ? 'SUCCESS' : 'FAILED',
    });
    
  } catch (error) {
    console.error('[ASSIGNMENT_RECONCILIATION] ERROR', {
      testId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      operation: 'reconcile',
      evidence: { error: error instanceof Error ? error.message : 'Unknown error' },
      verdict: 'FAILED',
    }, { status: 500 });
  }
}
