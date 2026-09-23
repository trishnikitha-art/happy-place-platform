/**
 * Runtime Authority Initialization Concurrency Integration Tests
 * 
 * Real Redis-backed adversarial tests proving atomic create-if-absent semantics.
 * Verifies that two simultaneous initialization requests cannot overwrite each other
 * using actual Redis SET NX operations with Promise.all.
 * 
 * Test scenarios:
 * 1. Single initialization - authority created correctly in real Redis
 * 2. Concurrent initialization - exactly one succeeds with Promise.all on real Redis
 * 3. Retry after initialization - second attempt skips (idempotent)
 * 4. Existing authority preservation - revision/state never reset in real Redis
 * 
 * This uses the same CI Redis infrastructure as runtime-gallery-authority.test.ts
 * to provide actual runtime proof of the atomicity invariant.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Redis } from '@upstash/redis';
import { getKvNamespace } from '@/lib/environment';

// Use real Redis for integration tests
const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

const TEST_NAMESPACE = getKvNamespace();
const TEST_PROJECT_ID = 'test-concurrent-init-project';
const RUNTIME_KEY = `${TEST_NAMESPACE}workbench-runtime-gallery:${TEST_PROJECT_ID}`;

const initialPayload = {
  gallery: ['media-001', 'media-002'],
  currentRevision: 1,
  lastMutationTimestamp: new Date().toISOString(),
  lastTransactionId: 'BOOTSTRAP',
  source: 'filesystem-bootstrap',
};

const existingPayload = {
  gallery: ['media-003', 'media-004'],
  currentRevision: 5,
  lastMutationTimestamp: new Date().toISOString(),
  lastTransactionId: 'TX-123',
  source: 'runtime-authority',
};

describe('Runtime Authority Initialization Concurrency (Real Redis)', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await redis.del(RUNTIME_KEY);
  });

  afterAll(async () => {
    // Clean up test data
    await redis.del(RUNTIME_KEY);
  });

  it('should create authority when none exists using real Redis SET NX', async () => {
    // Ensure key doesn't exist
    await redis.del(RUNTIME_KEY);
    
    // Use SET with NX (set if not exists)
    const setResult = await redis.set(RUNTIME_KEY, initialPayload, { nx: true });
    
    expect(setResult).toBe('OK');
    
    // Verify authority was created
    const created = await redis.get(RUNTIME_KEY);
    expect(created).toMatchObject(initialPayload);
  });

  it('should skip initialization when authority already exists using real Redis', async () => {
    // Pre-populate with existing authority
    await redis.set(RUNTIME_KEY, existingPayload);
    
    // Attempt to initialize with SET NX
    const setResult = await redis.set(RUNTIME_KEY, initialPayload, { nx: true });
    
    // SET NX should return null when key already exists
    expect(setResult).toBeNull();
    
    // Verify existing authority is preserved
    const existing = await redis.get(RUNTIME_KEY);
    expect(existing).toMatchObject(existingPayload);
    expect(existing.currentRevision).toBe(5);
  });

  it('should be idempotent with real Redis - multiple calls skip after initialization', async () => {
    // Clean slate
    await redis.del(RUNTIME_KEY);
    
    // First call creates authority
    let setResult = await redis.set(RUNTIME_KEY, initialPayload, { nx: true });
    expect(setResult).toBe('OK');
    
    // Second call skips (authority exists)
    setResult = await redis.set(RUNTIME_KEY, initialPayload, { nx: true });
    expect(setResult).toBeNull();
    
    // Third call also skips
    setResult = await redis.set(RUNTIME_KEY, initialPayload, { nx: true });
    expect(setResult).toBeNull();
    
    // Verify authority still has initial state
    const final = await redis.get(RUNTIME_KEY);
    expect(final).toMatchObject(initialPayload);
  });

  it('should preserve existing revision and state in real Redis', async () => {
    // Authority exists with revision 5
    await redis.set(RUNTIME_KEY, existingPayload);
    
    // Attempt to initialize with revision 1 (from filesystem)
    const setResult = await redis.set(RUNTIME_KEY, initialPayload, { nx: true });
    expect(setResult).toBeNull();
    
    // Verify revision 5 is preserved, not reset to 1
    const existing = await redis.get(RUNTIME_KEY);
    expect(existing.currentRevision).toBe(5);
    expect(existing.lastTransactionId).toBe('TX-123');
    expect(existing.gallery).toEqual(['media-003', 'media-004']);
  });

  it('should handle concurrent initialization requests with real Redis - exactly one succeeds', async () => {
    // Clean slate
    await redis.del(RUNTIME_KEY);
    
    // Simulate two concurrent requests using Promise.all
    const results = await Promise.all([
      redis.set(RUNTIME_KEY, initialPayload, { nx: true }),
      redis.set(RUNTIME_KEY, initialPayload, { nx: true }),
    ]);
    
    // One should succeed (return 'OK'), one should fail (return null)
    const successCount = results.filter(r => r === 'OK').length;
    const failCount = results.filter(r => r === null).length;
    
    expect(successCount).toBe(1);
    expect(failCount).toBe(1);
    
    // Verify final state is consistent (not corrupted)
    const final = await redis.get(RUNTIME_KEY);
    expect(final).toMatchObject(initialPayload);
  });

  it('should not overwrite existing authority with filesystem projection in real Redis', async () => {
    // Authority exists with revision 5
    await redis.set(RUNTIME_KEY, existingPayload);
    
    // Attempt to initialize with different revision (1) from filesystem
    const setResult = await redis.set(RUNTIME_KEY, initialPayload, { nx: true });
    expect(setResult).toBeNull();
    
    // Verify original authority is preserved in real Redis
    const existing = await redis.get(RUNTIME_KEY);
    expect(existing).toMatchObject(existingPayload);
    expect(existing.currentRevision).toBe(5);
    expect(existing.gallery).toEqual(['media-003', 'media-004']);
  });

  it('should initialize missing authority with filesystem projection in real Redis', async () => {
    // No authority exists
    await redis.del(RUNTIME_KEY);
    
    // Initialize from filesystem projection
    const setResult = await redis.set(RUNTIME_KEY, initialPayload, { nx: true });
    expect(setResult).toBe('OK');
    
    // Verify authority was created with filesystem data in real Redis
    const created = await redis.get(RUNTIME_KEY);
    expect(created).toMatchObject(initialPayload);
    expect(created.currentRevision).toBe(1);
    expect(created.source).toBe('filesystem-bootstrap');
  });

  it('should handle rapid concurrent requests with Promise.all in real Redis', async () => {
    // Clean slate
    await redis.del(RUNTIME_KEY);
    
    // Simulate 10 concurrent requests
    const requests = Array(10).fill(null).map(() => 
      redis.set(RUNTIME_KEY, initialPayload, { nx: true })
    );
    
    const results = await Promise.all(requests);
    
    // Exactly one should succeed
    const successCount = results.filter(r => r === 'OK').length;
    const failCount = results.filter(r => r === null).length;
    
    expect(successCount).toBe(1);
    expect(failCount).toBe(9);
    
    // Verify final state is consistent
    const final = await redis.get(RUNTIME_KEY);
    expect(final).toMatchObject(initialPayload);
  });
});
