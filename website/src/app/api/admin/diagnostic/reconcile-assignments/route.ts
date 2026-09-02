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
import { loadProjectsManifest } from "@/lib/projects";
import { loadMediaManifest } from "@/lib/media";
import { loadBrandManifest } from "@/lib/brand";

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

  // SECURITY: Require Workbench authentication for reconciliation
  // This is a production data mutation operation that must be explicitly authorized
  // CRITICAL: Production never honors bypass flag, regardless of environment variable
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true' && process.env.VERCEL_ENV !== 'production';

  if (!isDevBypass) {
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({
        testId,
        startTime,
        endTime: new Date().toISOString(),
        deploymentSha,
        environment,
        operation: 'authentication',
        evidence: { error: 'Unauthorized: Workbench authentication required for reconciliation' },
        verdict: 'FAILED',
      }, { status: 401 });
    }
  } else {
    console.warn('[ASSIGNMENT_RECONCILIATION] DEV_MODE_BYPASS_ACTIVE', {
      reason: 'DRIVE_AUTH_BYPASS=true - Workbench authentication bypassed for local development',
      environment: process.env.VERCEL_ENV,
    });
  }

  try {
    // Load canonical configuration using authority loaders (production-safe module imports)
    const projectsData = loadProjectsManifest();
    const mediaData = loadMediaManifest();
    const brandData = loadBrandManifest();
    
    // Build media ID set for validation
    const canonicalMediaIds = new Set<string>(mediaData.media.map((m) => m.id));
    
    console.log('[ASSIGNMENT_RECONCILIATION] CANONICAL_LOADED', { 
      projects: projectsData.projects.length,
      media: mediaData.media.length
    });
    
    let reconciled = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    
    // Define helpers with closure access to counters and canonicalMediaIds
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
        const existing = await getServiceCardAssignment(slotKey, `reconcile-${slotKey}`);
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
          source: 'workbench',
          actor: 'reconciliation',
          revision: currentRevision + 1,
          updatedAt: new Date().toISOString(),
        };
        
        await storeServiceCardAssignment(assignment, currentRevision, `reconcile-${slotKey}`);
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
            projectMedia.hero
          );
        }
        
        // Before assignment
        if (projectMedia.before) {
          await reconcileAssignment(
            `project:${project.id}:before`,
            projectMedia.before
          );
        }
        
        // After assignment
        if (projectMedia.after) {
          await reconcileAssignment(
            `project:${project.id}:after`,
            projectMedia.after
          );
        }
        
        // Gallery assignments
        if (projectMedia.gallery && Array.isArray(projectMedia.gallery)) {
          for (const [index, mediaId] of projectMedia.gallery.entries()) {
            await reconcileAssignment(
              `project:${project.id}:gallery:${index}`,
              mediaId
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
        brandData.homepageHero.mediaId
      );
    }
    
    if (brandData.ownerPortrait?.mediaId) {
      await reconcileAssignment(
        'brand-portrait-homepage',
        brandData.ownerPortrait.mediaId
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
