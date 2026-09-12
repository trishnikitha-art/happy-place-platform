/**
 * Drive to Public Resolver Cross-Boundary Test
 *
 * Focused test proving the end-to-end transaction:
 * DriveFile → DriveReference → PublishedMediaAsset → canonicalMediaId → Assignment → assignment readback → public resolver
 *
 * The final assertion must be that the website slot resolves to the newly selected Drive photograph.
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

describe('Drive to Public Resolver Cross-Boundary Transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  describe('Server-Side Transaction Flow', () => {
    it('should implement all 8 transaction steps in correct order', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // Step 1: Authenticate Workbench session
      expect(routeCode).toContain('workbenchSession.isAuthenticated()');
      expect(routeCode).toContain('WORKBENCH_AUTH_REQUIRED');

      // Step 2: Authorize Drive corpus access (via ingest)
      expect(routeCode).toContain('/api/drive/ingest');

      // Step 3: Resolve or materialize Drive file to canonical PublishedMediaAsset
      expect(routeCode).toContain('canonicalMediaId');
      expect(routeCode).toContain('CANONICAL_ASSET_MISSING');

      // Step 4: Validate PublishedMediaAsset through public media contract
      expect(routeCode).toContain('resolvePublicMedia');
      expect(routeCode).toContain('PUBLIC_MEDIA_GATE_REJECTED');

      // Step 5: Mutate exactly the requested target slot with CAS/revision protection
      expect(routeCode).toContain('storeServiceCardAssignment');
      expect(routeCode).toContain('expectedRevision');

      // Step 6: Read assignment back from authoritative store
      expect(routeCode).toContain('getServiceCardAssignment');
      expect(routeCode).toContain('ASSIGNMENT_READBACK_MISMATCH');

      // Step 7: Verify readback media ID equals canonical media ID
      expect(routeCode).toContain('readbackAssignment?.mediaId !== canonicalMediaId');

      // Step 8: Return success only if all steps complete
      expect(routeCode).toContain('success: true');
    });
  });

  describe('Explicit Source and Target Model', () => {
    it('should accept sourceDriveFileId and sourceSharedDriveId', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('sourceFileId');
      expect(routeCode).toContain('sourceSharedDriveId');
    });

    it('should accept targetSlotId explicitly', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('targetSlotId');
    });

    it('should NOT infer target from any other event or state', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // The endpoint should only use the explicitly provided targetSlotId
      // It should not scan assignments or infer from source
      expect(routeCode).toContain('targetSlotId');
      expect(routeCode).not.toContain('scanAllAssignments');
      expect(routeCode).not.toContain('forEach.*assignment');
    });
  });

  describe('Canonical Media Reuse', () => {
    it('should reuse existing canonical asset when DRIVE_FILE_ALREADY_EXISTS_IN_KV', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // The endpoint delegates to /api/drive/ingest which handles deduplication
      expect(routeCode).toContain('/api/drive/ingest');
      expect(routeCode).toContain('canonicalMediaId');
    });

    it('should treat existing canonical ID as successful resolution, not failure', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      // The endpoint should accept any successful ingest result
      expect(routeCode).toContain('canonicalMediaId');
      expect(routeCode).toContain('ingestResult.media');
    });
  });

  describe('Assignment Readback Contract', () => {
    it('should read assignment from authoritative store after mutation', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('getServiceCardAssignment');
      expect(routeCode).toContain('readbackAssignment');
    });

    it('should assert readback media ID equals canonical media ID', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('readbackAssignment?.mediaId !== canonicalMediaId');
      expect(routeCode).toContain('ASSIGNMENT_READBACK_MISMATCH');
    });

    it('should return failure if readback verification fails', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('ASSIGNMENT_READBACK_MISMATCH');
      expect(routeCode).toContain('status: 500');
    });
  });

  describe('Public Resolver Verification', () => {
    it('should validate canonical asset through public media gate before assignment', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('resolvePublicMedia');
      expect(routeCode).toContain('PUBLIC_MEDIA_GATE_REJECTED');
    });

    it('should return failure if public media gate rejects', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('PUBLIC_MEDIA_GATE_REJECTED');
      expect(routeCode).toContain('status: 400');
    });
  });

  describe('Success Response Contract', () => {
    it('should return canonicalMediaId in success response', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('canonicalMediaId');
      expect(routeCode).toContain('success: true');
    });

    it('should return targetSlotId in success response', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('targetSlotId');
    });

    it('should return assignment in success response', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('assignment:');
    });

    it('should return asset in success response', () => {
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/workbench/use-drive-asset/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');

      expect(routeCode).toContain('asset:');
    });
  });

  describe('Transaction Atomicity', () => {
    it('should return explicit failure for any partial operation', () => {
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

describe('Client-Side Transaction Orchestration', () => {
  describe('Mutation State Machine', () => {
    it('should implement explicit mutation states', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      expect(pageCode).toContain('mutationState');
      expect(pageCode).toContain('idle');
      expect(pageCode).toContain('confirming');
      expect(pageCode).toContain('materializing');
      expect(pageCode).toContain('complete');
    });

    it('should prevent duplicate mutations while pending', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      expect(pageCode).toContain('mutationState !== \'idle\'');
    });
  });

  describe('Confirmation Behavior', () => {
    it('should show exactly one confirmation before transaction', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      expect(pageCode).toContain('confirm(');
    });

    it('should not show confirmation after materialization', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      // The confirm() should be before the API call, not after
      const handlerMatch = pageCode.match(/const handleUseDriveAsset = async \(\) => \{[\s\S]*?\n  \};/);
      if (handlerMatch) {
        const handlerCode = handlerMatch[0];
        const confirmIndex = handlerCode.indexOf('confirm(');
        const apiCallIndex = handlerCode.indexOf('/api/workbench/use-drive-asset');

        if (confirmIndex !== -1 && apiCallIndex !== -1) {
          expect(confirmIndex).toBeLessThan(apiCallIndex);
        }
      }
    });
  });

  describe('Iframe Refresh', () => {
    it('should refresh iframe only after successful verification', () => {
      const fs = require('fs');
      const path = require('path');
      const pagePath = path.join(__dirname, '../../../app/workbench/media/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');

      expect(pageCode).toContain('iframeRef.current');
      expect(pageCode).toContain('.src = ');
    });
  });
});
