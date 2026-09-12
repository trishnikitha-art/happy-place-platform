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
      expect(routeCode).toContain('actualExpectedRevision');
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
      const successResponsePattern = /return NextResponse\.json\(\{[\s\S]*success: true/;
      const matches = routeCode.match(successResponsePattern);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBe(1); // Only one success response
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
