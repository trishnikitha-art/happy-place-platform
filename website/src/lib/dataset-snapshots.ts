/**
 * Dataset Snapshot Management
 * 
 * Server-authoritative immutable dataset snapshots for reconciliation.
 * 
 * P0 FIX: Snapshots are server-owned, not client-carried correlation IDs.
 * The server persists the snapshot with the actual dataset state.
 */

import { Redis } from '@upstash/redis';
import { getKvNamespace } from '@/lib/environment';

const SNAPSHOT_PREFIX = 'dataset_snapshot:';
const SNAPSHOT_TTL_SECONDS = 3600; // 1 hour TTL

export interface DatasetSnapshot {
  snapshotId: string;
  orderedMediaIds: string[];
  cardinality: number;
  createdAt: string;
  datasetDigest: string;
}

/**
 * Create a Redis client
 */
function createRedisClient(): Redis | null {
  try {
    const { getEnvironment } = require('@/lib/environment');
    const env = getEnvironment();
    
    if (!env.kvRestUrl || !env.kvRestToken) {
      console.warn('[DATASET_SNAPSHOT] KV credentials not configured');
      return null;
    }
    
    return new Redis({
      url: env.kvRestUrl,
      token: env.kvRestToken,
    });
  } catch (error) {
    console.error('[DATASET_SNAPSHOT] Failed to create Redis client:', error);
    return null;
  }
}

/**
 * Generate a cryptographically secure snapshot ID
 */
function generateSnapshotId(): string {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

/**
 * Generate dataset digest from ordered media IDs
 */
function generateDatasetDigest(orderedMediaIds: string[]): string {
  const crypto = require('crypto');
  const joined = orderedMediaIds.join('|');
  return crypto.createHash('sha256').update(joined).digest('hex');
}

/**
 * Create and persist a server-owned dataset snapshot
 * 
 * This is the authoritative snapshot for a reconciliation session.
 * The snapshot contains the actual dataset state at creation time.
 */
export async function createDatasetSnapshot(orderedMediaIds: string[]): Promise<DatasetSnapshot> {
  const client = createRedisClient();
  if (!client) {
    throw new Error('KV unavailable for snapshot creation');
  }

  const snapshotId = generateSnapshotId();
  const createdAt = new Date().toISOString();
  const cardinality = orderedMediaIds.length;
  const datasetDigest = generateDatasetDigest(orderedMediaIds);

  const snapshot: DatasetSnapshot = {
    snapshotId,
    orderedMediaIds,
    cardinality,
    createdAt,
    datasetDigest,
  };

  const namespace = getKvNamespace();
  const key = namespace + SNAPSHOT_PREFIX + snapshotId;

  // Persist snapshot with TTL
  await client.set(key, JSON.stringify(snapshot), { ex: SNAPSHOT_TTL_SECONDS });

  console.log('[DATASET_SNAPSHOT] Created server-owned snapshot', {
    snapshotId,
    cardinality,
    datasetDigest: datasetDigest.substring(0, 16) + '...',
  });

  return snapshot;
}

/**
 * Retrieve a server-owned dataset snapshot
 * 
 * Returns null if snapshot doesn't exist or has expired.
 */
export async function getDatasetSnapshot(snapshotId: string): Promise<DatasetSnapshot | null> {
  const client = createRedisClient();
  if (!client) {
    throw new Error('KV unavailable for snapshot retrieval');
  }

  const namespace = getKvNamespace();
  const key = namespace + SNAPSHOT_PREFIX + snapshotId;

  const data = await client.get(key);
  if (!data || typeof data !== 'string') {
    return null;
  }

  try {
    return JSON.parse(data) as DatasetSnapshot;
  } catch (error) {
    console.error('[DATASET_SNAPSHOT] Failed to parse snapshot:', error);
    return null;
  }
}

/**
 * Validate that the provided snapshot ID exists and is not expired
 */
export async function validateSnapshot(snapshotId: string): Promise<boolean> {
  const snapshot = await getDatasetSnapshot(snapshotId);
  return snapshot !== null;
}

/**
 * Delete a snapshot (for cleanup or revocation)
 */
export async function deleteDatasetSnapshot(snapshotId: string): Promise<void> {
  const client = createRedisClient();
  if (!client) {
    throw new Error('KV unavailable for snapshot deletion');
  }

  const namespace = getKvNamespace();
  const key = namespace + SNAPSHOT_PREFIX + snapshotId;

  await client.del(key);

  console.log('[DATASET_SNAPSHOT] Deleted snapshot', { snapshotId });
}
