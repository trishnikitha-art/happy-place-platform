/**
 * Restore Gallery to Original State
 * 
 * Restores a project's gallery to its original filesystem projection state.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';

function getRuntimeGalleryKey(projectId) {
  return `${KV_NAMESPACE}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

async function restoreGallery(projectId) {
  console.log('[RESTORE GALLERY] START', {
    projectId,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const runtimeKey = getRuntimeGalleryKey(projectId);

  try {
    // Read filesystem projection
    const projectsPath = join(process.cwd(), 'src/config/projects.v1.json');
    const projectsData = JSON.parse(readFileSync(projectsPath, 'utf-8'));

    const project = projectsData.projects.find((p) => p.id === projectId);
    if (!project) {
      console.error('[RESTORE GALLERY] ERROR', {
        projectId,
        reason: 'Project not found in filesystem projection',
      });
      process.exit(1);
    }

    const gallery = project.media?.gallery || [];
    const galleryRevision = project.media?.galleryRevision || 0;

    // Restore runtime authority from filesystem projection
    const runtimePayload = {
      gallery,
      currentRevision: galleryRevision,
      lastMutationTimestamp: new Date().toISOString(),
      lastTransactionId: 'RESTORE',
      source: 'filesystem-restore',
    };

    await redis.set(runtimeKey, runtimePayload);

    console.log('[RESTORE GALLERY] SUCCESS', {
      projectId,
      galleryLength: gallery.length,
      currentRevision: galleryRevision,
      galleryIds: gallery,
      source: 'filesystem-restore',
    });
  } catch (error) {
    console.error('[RESTORE GALLERY] ERROR', {
      projectId,
      error: error.message,
    });
    process.exit(1);
  }
}

const projectId = process.argv[2] || 'fences-001';
restoreGallery(projectId);
