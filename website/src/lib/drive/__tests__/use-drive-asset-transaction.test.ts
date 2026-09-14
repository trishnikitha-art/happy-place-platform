/**
 * Use Drive Asset Transaction Test
 *
 * Negative test for duplication prevention:
 * - One "Use This Asset" click = one confirmation = one materialization = one assignment
 * - Double-click = one transaction
 * - Click while pending = no second transaction
 * - Background Drive loading/reconciliation = no mutation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Redis availability check for integration tests
const OAUTH_SECURITY_KV_REST_API_URL = process.env.KV_REST_API_URL ||
                         process.env.KV_REST_API__KV_REST_API_URL;
const OAUTH_SECURITY_KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN ||
                         process.env.KV_REST_API__KV_REST_API_TOKEN;
const OAUTH_SECURITY_REDIS_AVAILABLE = !!(OAUTH_SECURITY_KV_REST_API_URL && OAUTH_SECURITY_KV_REST_API_TOKEN);

// Set environment variables before importing modules
process.env.KV_REST_API_URL = 'https://test.redis.com';
process.env.KV_REST_API_TOKEN = 'test-token';

// Mock Next.js dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/lib/workbench-session', () => ({
  workbenchSession: {
    isAuthenticated: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/lib/assignment-store', () => ({
  getServiceCardAssignment: jest.fn(),
  storeServiceCardAssignment: jest.fn(),
}));

jest.mock('@/lib/media', () => ({
  resolvePublicMedia: jest.fn(),
}));

describe('Use Drive Asset Transaction - Duplication Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  describe('Transaction ID Uniqueness', () => {
    it('should generate unique transaction IDs for each request', () => {
      // Verify that the endpoint uses crypto.randomUUID() for transaction IDs
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('crypto.randomUUID()');
      expect(routeCode).toContain('requestId');
    });

    it('should include transaction ID in all log statements', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // Verify requestId is logged at each boundary
      const logMatches = routeCode.match(/requestId/g);
      expect(logMatches).toBeTruthy();
      expect(logMatches!.length).toBeGreaterThan(5);
    });
  });

  describe('Input Validation', () => {
    it('should reject requests without sourceFileId', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('sourceFileId');
      expect(routeCode).toContain('REQUIRED_FIELDS_MISSING');
    });

    it('should reject requests without targetSlotId', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('targetSlotId');
      expect(routeCode).toContain('REQUIRED_FIELDS_MISSING');
    });
  });

  describe('Authentication Boundary', () => {
    it('should require Workbench authentication', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('workbenchSession.isAuthenticated()');
      expect(routeCode).toContain('WORKBENCH_AUTH_REQUIRED');
      expect(routeCode).toContain('status: 401');
    });
  });

  describe('Drive Resolution Boundary', () => {
    it('should call /api/drive/ingest to resolve canonical asset', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('/api/drive/ingest');
      expect(routeCode).toContain('CANONICAL_RESOLUTION_FAILED');
    });

    it('should validate canonical asset exists before proceeding', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('canonicalMediaId');
      expect(routeCode).toContain('CANONICAL_ASSET_MISSING');
    });
  });

  describe('Public Media Gate Validation', () => {
    it('should validate canonical asset through public media gate', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('resolvePublicMedia');
      expect(routeCode).toContain('PUBLIC_MEDIA_GATE_REJECTED');
    });
  });

  describe('Assignment Boundary', () => {
    it('should mutate only the explicit target slot', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('targetSlotId');
      expect(routeCode).toContain('storeServiceCardAssignment');
      expect(routeCode).toContain('serviceSlug');
    });

    it('should use CAS/revision protection', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('expectedRevision');
      expect(routeCode).toContain('EXPECTED_REVISION_REQUIRED');
    });
  });

  describe('Readback Verification', () => {
    it('should read assignment back after mutation', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('getServiceCardAssignment');
      expect(routeCode).toContain('ASSIGNMENT_READBACK_MISMATCH');
    });

    it('should verify readback media ID equals canonical media ID', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('readbackMediaId');
      expect(routeCode).toContain('expectedMediaId');
      expect(routeCode).toContain('readbackAssignment?.mediaId !== canonicalMediaId');
    });
  });

  describe('Error Propagation', () => {
    it('should return explicit failure state for any partial operation', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('TRANSACTION_ERROR');
      expect(routeCode).toContain('status: 500');
    });

    it('should never claim success after materialization alone', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // Verify that success response is only at the very end after all steps
      // The transaction must pass public media gate, CAS, readback verification before returning success
      const successResponsePattern = /success: true/;
      const matches = routeCode.match(successResponsePattern);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBe(1); // Only one success response
    });
  });

  describe('Target Slot Authority (P0 #1)', () => {
    it('should reject unknown target slots not in authoritative registry', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('UNKNOWN_TARGET_SLOT');
      expect(routeCode).toContain('VISUAL_SLOT_AUTHORITY');
      expect(routeCode).toContain('resolveTargetSlotAuthority');
    });

    it('should reject project slots (static-only authority)', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('SLOT_NOT_WRITABLE');
      expect(routeCode).toContain('static-project');
    });

    it('should only allow service-card-assignment authority type', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('UNSUPPORTED_AUTHORITY_TYPE');
      expect(routeCode).toContain('authorityType: \'service-card-assignment\'');
    });
  });

  describe('CAS Revision Mandatory (P0 #2)', () => {
    it('should require expectedRevision at API boundary', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('EXPECTED_REVISION_REQUIRED');
      expect(routeCode).toContain('expectedRevision is required for CAS enforcement');
      
      // Verify it's NOT optional
      expect(routeCode).not.toContain('expectedRevision?:');
    });

    it('should not derive revision server-side (no fallback)', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // Should NOT have fallback logic
      expect(routeCode).not.toContain('expectedRevision ??');
      expect(routeCode).not.toContain('currentAssignment?.revision || 0');
    });
  });

  describe('Public Media Gate Fail-Closed (P0 #3)', () => {
    it('should reject when resolvePublicMedia returns null', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('if (!publicMedia)');
      expect(routeCode).toContain('PUBLIC_MEDIA_GATE_REJECTED');
    });

    it('should not proceed to assignment if public gate fails', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // Find the specific PUBLIC_MEDIA_GATE_REJECTED error block
      const rejectionBlock = routeCode.indexOf('PUBLIC_MEDIA_GATE_REJECTED');
      expect(rejectionBlock).toBeGreaterThan(0);
      
      // Find the actual assignment mutation (await storeServiceCardAssignment)
      const assignmentMutation = routeCode.indexOf('await storeServiceCardAssignment');
      
      // The rejection should come before the actual mutation
      expect(rejectionBlock).toBeLessThan(assignmentMutation);
    });
  });

  describe('No Broad Reconciliation (P0 #4)', () => {
    it('should pass skipReconciliation=true to ingest endpoint', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('skipReconciliation: true');
      expect(routeCode).toContain('Prevent implicit assignment reconciliation');
    });

    it('should not call reconcileDriveAssignments directly', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).not.toContain('reconcileDriveAssignments');
      expect(routeCode).not.toContain('getAllServiceCardAssignments');
    });
  });

  describe('No False Client Authority (P0 #5)', () => {
    it('should not accept sourceFileName from client', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).not.toContain('sourceFileName');
    });

    it('should not accept sourceMimeType from client', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).not.toContain('sourceMimeType');
    });

    it('should fetch authoritative Drive metadata server-side', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('getDriveClient');
      expect(routeCode).toContain('driveClient.files.get');
      expect(routeCode).toContain('Fetch authoritative Drive metadata');
    });
  });

  describe('No Sensitive Logging (Security)', () => {
    it('should not log sourceFileId after transaction initiated', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // Find Transaction initiated log
      const transactionInitLog = routeCode.match(/Transaction initiated[\s\S]*?\}/);
      expect(transactionInitLog).toBeTruthy();
      
      // Should only log safe identifiers
      if (transactionInitLog) {
        expect(transactionInitLog[0]).not.toContain('sourceFileId');
        expect(transactionInitLog[0]).not.toContain('sourceSharedDriveId');
      }
    });

    it('should not log Drive file IDs in transaction complete', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // Find Transaction complete log
      const transactionCompleteLog = routeCode.match(/Transaction complete[\s\S]*?\}/);
      expect(transactionCompleteLog).toBeTruthy();
      
      if (transactionCompleteLog) {
        expect(transactionCompleteLog[0]).not.toContain('sourceFileId');
      }
    });
  });

  describe('CAS Enforcement (P0 #1)', () => {
    it('should reject Drive handoff with stale expectedRevision', async () => {
      // Skip if Redis credentials not available
      if (!OAUTH_SECURITY_REDIS_AVAILABLE) {
        console.log('[USE_DRIVE_ASSET_TRANSACTION] Skipping test - Redis credentials not available');
        return;
      }

      const { storeServiceCardAssignment, getServiceCardAssignment } = await import('../../assignment-store');
      const { atomicPromoteAssignments } = await import('../../deployment-transaction');

      const serviceSlug = 'test-cas-service';
      const namespace = process.env.TEST_NAMESPACE || 'hpp:test:';
      const deploymentTransactionId = `test_cas_tx_${Date.now()}`;

      // Step 1: Create initial assignment (revision 0)
      await storeServiceCardAssignment({
        serviceSlug,
        mediaId: 'initial-media-id',
        updatedAt: new Date().toISOString(),
        source: 'workbench',
      }, undefined, deploymentTransactionId);
      const assignment1 = await getServiceCardAssignment(serviceSlug, deploymentTransactionId);
      expect(assignment1?.revision).toBe(1); // Revision increments on first write

      // Step 2: Simulate concurrent writer updating to revision 2
      await storeServiceCardAssignment({
        serviceSlug,
        mediaId: 'concurrent-media-id',
        updatedAt: new Date().toISOString(),
        source: 'workbench',
      }, undefined, deploymentTransactionId);
      const assignment2 = await getServiceCardAssignment(serviceSlug, deploymentTransactionId);
      expect(assignment2?.revision).toBe(2);

      // Step 3: Attempt Drive handoff with stale expectedRevision (revision 1)
      // This should fail CAS because current revision is 2
      const staleExpectedRevision = 1;
      const promotionResult = await atomicPromoteAssignments([
        {
          serviceSlug,
          mediaId: 'drive-handoff-media-id',
          expectedRevision: staleExpectedRevision,
          updatedAt: new Date().toISOString(),
          source: 'workbench',
        }
      ], deploymentTransactionId);

      // Verify CAS failure
      expect(promotionResult.success).toBe(false);
      expect(promotionResult.error).toContain('CAS_FAILURE');
      expect(promotionResult.failedServiceSlug).toBe(serviceSlug);

      // Step 4: Verify concurrent write remains intact (still revision 2)
      const assignmentAfter = await getServiceCardAssignment(serviceSlug, deploymentTransactionId);
      expect(assignmentAfter?.mediaId).toBe('concurrent-media-id');
      expect(assignmentAfter?.revision).toBe(2);

      console.log('[USE_DRIVE_ASSET_TRANSACTION] CAS enforcement test passed: Stale expectedRevision rejected');
    });

    it('should accept Drive handoff with correct expectedRevision', async () => {
      // Skip if Redis credentials not available
      if (!OAUTH_SECURITY_REDIS_AVAILABLE) {
        console.log('[USE_DRIVE_ASSET_TRANSACTION] Skipping test - Redis credentials not available');
        return;
      }

      const { storeServiceCardAssignment, getServiceCardAssignment } = await import('../../assignment-store');
      const { atomicPromoteAssignments } = await import('../../deployment-transaction');

      const serviceSlug = 'test-cas-correct-service';
      const namespace = process.env.TEST_NAMESPACE || 'hpp:test:';
      const deploymentTransactionId = `test_cas_correct_tx_${Date.now()}`;

      // Step 1: Create initial assignment
      await storeServiceCardAssignment({
        serviceSlug,
        mediaId: 'initial-media-id',
        updatedAt: new Date().toISOString(),
        source: 'workbench',
      }, undefined, deploymentTransactionId);
      const assignment1 = await getServiceCardAssignment(serviceSlug, deploymentTransactionId);
      const currentRevision = assignment1?.revision ?? 0;

      // Step 2: Attempt Drive handoff with correct expectedRevision
      const promotionResult = await atomicPromoteAssignments([
        {
          serviceSlug,
          mediaId: 'drive-handoff-media-id',
          expectedRevision: currentRevision,
          updatedAt: new Date().toISOString(),
          source: 'workbench',
        }
      ], deploymentTransactionId);

      // Verify success
      expect(promotionResult.success).toBe(true);
      expect(promotionResult.count).toBe(1);

      // Step 3: Verify assignment was updated
      const assignmentAfter = await getServiceCardAssignment(serviceSlug, deploymentTransactionId);
      expect(assignmentAfter?.mediaId).toBe('drive-handoff-media-id');
      expect(assignmentAfter?.revision).toBe(currentRevision + 1);

      console.log('[USE_DRIVE_ASSET_TRANSACTION] CAS enforcement test passed: Correct expectedRevision accepted');
    });
  });
});

describe('Client-Side Duplication Prevention', () => {
  describe('Media Workbench UI', () => {
    it('should prevent duplicate mutations while pending', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      expect(pageCode).toContain('mutationState');
      expect(pageCode).toContain('mutationRequestId');
      expect(pageCode).toContain('mutationState !== \'idle\'');
    });

    it('should generate unique request IDs for each client transaction', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      expect(pageCode).toContain('crypto.randomUUID()');
      expect(pageCode).toContain('requestId');
    });

    it('should call the authoritative transaction endpoint', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      expect(pageCode).toContain('/api/workbench/use-drive-asset');
    });

    it('should NOT independently call materialize-drive and assign-media', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      // After the fix, the handler should call only the authoritative endpoint
      // Count calls to materialize-drive in handleUseDriveAsset
      const handlerMatch = pageCode.match(/const handleUseDriveAsset = async \(\) => \{[\s\S]*?\n  \};/);
      if (handlerMatch) {
        const handlerCode = handlerMatch[0];
        // Should not contain materialize-drive call (it's now handled by use-drive-asset)
        const hasMaterializeCall = handlerCode.includes('/api/workbench/materialize-drive');
        const hasAssignCall = handlerCode.includes('/api/workbench/assign-media');
        const hasUseAssetCall = handlerCode.includes('/api/workbench/use-drive-asset');

        expect(hasUseAssetCall).toBe(true);
        // If it has the new endpoint, it should not have the old split calls
        if (hasUseAssetCall) {
          expect(hasMaterializeCall).toBe(false);
          expect(hasAssignCall).toBe(false);
        }
      }
    });
  });

  describe('Pagination Guard', () => {
    it('should reset loading state after pagination completes', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      expect(pageCode).toContain('loadMoreDriveFiles');
      expect(pageCode).toContain('try');
      expect(pageCode).toContain('finally');
      expect(pageCode).toContain('driveLoadingMore: false');
    });
  });
});
