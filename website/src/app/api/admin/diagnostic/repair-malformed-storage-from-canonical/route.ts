/**
 * Production-Safe Storage Repair from Canonical Authority
 * 
 * Repairs malformed KV media records (storage: undefined) using evidence from canonical static authority.
 * 
 * CONSTITUTIONAL GUARDRAILS:
 * - NEVER invent storage metadata
 * - NEVER blindly set storage: "static" without evidence
 * - NEVER overwrite valid Blob records
 * - ALWAYS verify physical file exists before repair
 * - ALWAYS preserve provenance
 * - NEVER weaken public media gate
 * 
 * This is the ONLY authorized path for repairing storage field from canonical authority.
 * 
 * POST /api/admin/diagnostic/repair-malformed-storage-from-canonical
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { loadMediaManifest } from "@/lib/media";
import { getMediaRecordRaw, saveMedia, listMediaIds } from "@/lib/media-kv-store";
import { existsSync } from 'fs';
import { join } from 'path';

interface RepairResult {
  testId: string;
  startTime: string;
  endTime: string;
  deploymentSha: string;
  environment: string;
  totalCanonical: number;
  totalKvRecords: number;
  repaired: number;
  skipped: number;
  failed: number;
  errors: Record<string, string>;
  repairedIds: string[];
  verdict: 'REPAIRED' | 'FAILED' | 'NO_REPAIRS_NEEDED';
}

export async function POST() {
  const testId = `repair-storage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date().toISOString();
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  
  console.log('[STORAGE_REPAIR] TEST_STARTED', { testId, startTime, deploymentSha, environment });

  // SECURITY: Require authentication in production
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
        error: 'Unauthorized',
        message: 'Workbench authentication required',
        verdict: 'FAILED',
      }, { status: 401 });
    }
  } else {
    console.warn('[STORAGE_REPAIR] DEV_MODE_BYPASS_ACTIVE');
  }

  try {
    // Load canonical static authority
    const manifest = loadMediaManifest();
    if (!manifest || !manifest.media || manifest.media.length === 0) {
      return NextResponse.json({
        testId,
        startTime,
        endTime: new Date().toISOString(),
        deploymentSha,
        environment,
        error: 'No canonical media records found',
        verdict: 'FAILED',
      }, { status: 400 });
    }

    console.log('[STORAGE_REPAIR] Canonical authority loaded', { 
      testId, 
      totalCanonical: manifest.media.length 
    });

    // Get all KV media IDs
    const allKvIds = await listMediaIds();
    const canonicalIds = new Set(manifest.media.map(m => m.id));
    const kvIds = new Set(allKvIds);

    console.log('[STORAGE_REPAIR] KV enumeration complete', {
      testId,
      totalKvRecords: allKvIds.length,
    });

    let repaired = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    const repairedIds: string[] = [];

    // Repair malformed storage records
    for (const canonicalMedia of manifest.media) {
      try {
        const mediaId = canonicalMedia.id;

        // Check if record exists in KV
        if (!kvIds.has(mediaId)) {
          // Record doesn't exist in KV - skip (bootstrap should handle this)
          skipped++;
          console.log('[STORAGE_REPAIR] Record not in KV, skipping', { testId, mediaId });
          continue;
        }

        // Get raw KV record
        const kvRecord = await getMediaRecordRaw(mediaId);
        if (!kvRecord) {
          skipped++;
          console.log('[STORAGE_REPAIR] KV record returned null, skipping', { testId, mediaId });
          continue;
        }

        // Check if storage is malformed
        if (kvRecord.storage !== undefined) {
          // Storage is already set - skip
          skipped++;
          console.log('[STORAGE_REPAIR] Storage already set, skipping', { 
            testId, 
            mediaId, 
            storage: kvRecord.storage 
          });
          continue;
        }

        // Verify canonical has storage field
        if (!canonicalMedia.storage) {
          failed++;
          errors[mediaId] = 'Canonical record has no storage field';
          console.error('[STORAGE_REPAIR] Canonical has no storage', { testId, mediaId });
          continue;
        }

        // Verify physical file exists for static storage
        if (canonicalMedia.storage === 'static') {
          const variantPath = canonicalMedia.variants?.original || canonicalMedia.variants?.web;
          if (!variantPath) {
            failed++;
            errors[mediaId] = 'Canonical has no variant path';
            console.error('[STORAGE_REPAIR] No variant path', { testId, mediaId });
            continue;
          }

          // Normalize path
          const normalizedPath = variantPath.startsWith('/') ? variantPath : `/${variantPath}`;
          const physicalPath = join(process.cwd(), 'public', normalizedPath);

          if (!existsSync(physicalPath)) {
            failed++;
            errors[mediaId] = `Physical file not found: ${physicalPath}`;
            console.error('[STORAGE_REPAIR] Physical file missing', { 
              testId, 
              mediaId, 
              physicalPath 
            });
            continue;
          }

          console.log('[STORAGE_REPAIR] Physical file verified', { 
            testId, 
            mediaId, 
            physicalPath 
          });
        }

        // EVIDENCE-BASED REPAIR: Use canonical storage value
        const repairedMedia = {
          ...kvRecord,
          storage: canonicalMedia.storage,
        };

        // Save repaired record
        await saveMedia(repairedMedia);
        repaired++;
        repairedIds.push(mediaId);

        console.log('[STORAGE_REPAIR] Record repaired', { 
          testId, 
          mediaId, 
          storage: canonicalMedia.storage 
        });

      } catch (error) {
        failed++;
        errors[canonicalMedia.id] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[STORAGE_REPAIR] Repair failed', {
          testId,
          mediaId: canonicalMedia.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const endTime = new Date().toISOString();

    return NextResponse.json({
      testId,
      startTime,
      endTime,
      deploymentSha,
      environment,
      totalCanonical: manifest.media.length,
      totalKvRecords: allKvIds.length,
      repaired,
      skipped,
      failed,
      errors: failed > 0 ? errors : undefined,
      repairedIds,
      verdict: repaired > 0 ? 'REPAIRED' : 'NO_REPAIRS_NEEDED',
    });

  } catch (error) {
    console.error('[STORAGE_REPAIR] FATAL ERROR', {
      testId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({
      testId,
      startTime,
      endTime: new Date().toISOString(),
      deploymentSha,
      environment,
      error: error instanceof Error ? error.message : 'Unknown error',
      verdict: 'FAILED',
    }, { status: 500 });
  }
}
