/**
 * Transaction Schema Regression Test
 * 
 * Verifies that gallery transactions use the correct 'files' field
 * instead of the old 'targetFiles' field.
 */

import { DeploymentTransaction } from '../deployment-transaction';

describe('Transaction Schema', () => {
  it('should accept transactions with files field', () => {
    const validTransaction: DeploymentTransaction = {
      transactionId: 'test-tx-001',
      state: 'prepared',
      stagingKeys: ['hpp:production:workbench-staging:test-tx-001:project:test-project:gallery'],
      files: ['projects.v1.json'],
      reason: 'Gallery order mutation',
      createdAt: new Date().toISOString(),
    };

    expect(validTransaction.files).toBeDefined();
    expect(validTransaction.files).toContain('projects.v1.json');
  });

  it('should reject transactions with old targetFiles field', () => {
    const invalidTransaction = {
      transactionId: 'test-tx-002',
      state: 'prepared',
      stagingKeys: ['hpp:production:workbench-staging:test-tx-002:project:test-project:gallery'],
      targetFiles: ['projects.v1.json'], // OLD SCHEMA
      reason: 'Gallery order mutation',
      createdAt: new Date().toISOString(),
    };

    // This should fail TypeScript type checking
    // @ts-expect-error - targetFiles is not a valid field
    const typedTransaction: DeploymentTransaction = invalidTransaction;
    expect(typedTransaction.files).toBeUndefined();
  });

  it('should require files field for gallery transactions', () => {
    const invalidTransaction = {
      transactionId: 'test-tx-003',
      state: 'prepared',
      stagingKeys: ['hpp:production:workbench-staging:test-tx-003:project:test-project:gallery'],
      reason: 'Gallery order mutation',
      createdAt: new Date().toISOString(),
    };

    // @ts-expect-error - files is required
    const typedTransaction: DeploymentTransaction = invalidTransaction;
    expect(typedTransaction.files).toBeUndefined();
  });
});
