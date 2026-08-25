/**
 * Regression test for deployment staging key parsing
 * 
 * Tests the exact transaction shape that failed for Drywall service card assignment:
 * - workbench-staging:{txId}:service:drywall (4 parts, not 5)
 * - Ensures service keys are recognized as valid transactional format
 * - Ensures project keys (5 parts) are also recognized
 * - Ensures legacy formats are rejected
 */

import { describe, it, expect } from '@jest/globals';

// Simulate the key parsing logic from deploy/route.ts
function parseStagingKey(key: string): { valid: boolean; type: 'project' | 'service' | 'legacy' | 'invalid'; transactionId?: string; target?: string; field?: string } {
  const parts = key.split(':');
  
  // MUST start with workbench-staging prefix
  if (parts[0] !== 'workbench-staging') {
    return {
      valid: false,
      type: 'invalid',
    };
  }
  
  // New transactional format: workbench-staging:{txId}:project:{projectId}:{field} (5 parts)
  if (parts.length >= 5 && (parts[1].startsWith('WBDEP-') || parts[1].startsWith('tx-')) && parts[2] === 'project') {
    return {
      valid: true,
      type: 'project',
      transactionId: parts[1],
      target: parts[3],
      field: parts[4],
    };
  }
  
  // New transactional format: workbench-staging:{txId}:service:{serviceSlug} (4 parts)
  // THIS IS THE REGRESSION FIX - ensure 4-part service keys are recognized
  if (parts.length >= 4 && (parts[1].startsWith('WBDEP-') || parts[1].startsWith('tx-')) && parts[2] === 'service') {
    return {
      valid: true,
      type: 'service',
      transactionId: parts[1],
      target: parts[3],
    };
  }
  
  // Legacy format: workbench-staging:project:{projectId}:{field} (no transaction ID)
  if (parts.length >= 4 && parts[1] === 'project') {
    return {
      valid: false,
      type: 'legacy',
    };
  }
  
  // Legacy format: workbench-staging:service:{serviceSlug} (no transaction ID)
  if (parts.length >= 3 && parts[1] === 'service') {
    return {
      valid: false,
      type: 'legacy',
    };
  }
  
  return {
    valid: false,
    type: 'invalid',
  };
}

describe('Deployment Staging Key Parsing Regression Test', () => {
  describe('Drywall Transaction Shape (4-part service key)', () => {
    it('should recognize valid service transactional format with 4 parts', () => {
      const key = 'workbench-staging:WBDEP-1787624174997-ljtvhuv:service:drywall';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('service');
      expect(result.transactionId).toBe('WBDEP-1787624174997-ljtvhuv');
      expect(result.target).toBe('drywall');
    });
    
    it('should recognize service key with tx- prefix', () => {
      const key = 'workbench-staging:tx-1234567890-abc:service:painting';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('service');
      expect(result.transactionId).toBe('tx-1234567890-abc');
      expect(result.target).toBe('painting');
    });
  });
  
  describe('Project Transaction Shape (5-part project key)', () => {
    it('should recognize valid project transactional format with 5 parts', () => {
      const key = 'workbench-staging:WBDEP-1787624174997-ljtvhuv:project:fences-001:hero';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('project');
      expect(result.transactionId).toBe('WBDEP-1787624174997-ljtvhuv');
      expect(result.target).toBe('fences-001');
      expect(result.field).toBe('hero');
    });
    
    it('should recognize project gallery assignment', () => {
      const key = 'workbench-staging:WBDEP-1787624174997-ljtvhuv:project:exterior-painting-001:gallery';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('project');
      expect(result.transactionId).toBe('WBDEP-1787624174997-ljtvhuv');
      expect(result.target).toBe('exterior-painting-001');
      expect(result.field).toBe('gallery');
    });
    
    it('should recognize before/after assignments', () => {
      const beforeKey = 'workbench-staging:WBDEP-1787624174997-ljtvhuv:project:fences-001:before';
      const afterKey = 'workbench-staging:WBDEP-1787624174997-ljtvhuv:project:fences-001:after';
      
      const beforeResult = parseStagingKey(beforeKey);
      const afterResult = parseStagingKey(afterKey);
      
      expect(beforeResult.valid).toBe(true);
      expect(beforeResult.type).toBe('project');
      expect(beforeResult.field).toBe('before');
      
      expect(afterResult.valid).toBe(true);
      expect(afterResult.type).toBe('project');
      expect(afterResult.field).toBe('after');
    });
  });
  
  describe('Legacy Format Rejection', () => {
    it('should reject legacy project format without transaction ID', () => {
      const key = 'workbench-staging:project:fences-001:hero';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(false);
      expect(result.type).toBe('legacy');
    });
    
    it('should reject legacy service format without transaction ID', () => {
      const key = 'workbench-staging:service:drywall';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(false);
      expect(result.type).toBe('legacy');
    });
  });
  
  describe('Invalid Format Rejection', () => {
    it('should reject keys with wrong prefix', () => {
      const key = 'some-other-prefix:WBDEP-123:service:drywall';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(false);
      expect(result.type).toBe('invalid');
    });
    
    it('should reject keys with insufficient parts', () => {
      const key = 'workbench-staging:WBDEP-123';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(false);
      expect(result.type).toBe('invalid');
    });
  });
  
  describe('Brand Assignment Support', () => {
    it('should recognize brand-hero as service assignment', () => {
      const key = 'workbench-staging:WBDEP-1787624174997-ljtvhuv:service:brand-hero';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('service');
      expect(result.target).toBe('brand-hero');
    });
    
    it('should recognize brand-portrait as service assignment', () => {
      const key = 'workbench-staging:WBDEP-1787624174997-ljtvhuv:service:brand-portrait';
      const result = parseStagingKey(key);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('service');
      expect(result.target).toBe('brand-portrait');
    });
  });
});
