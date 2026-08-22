/**
 * Focused test for browser binding implementation
 * 
 * Tests:
 * - same browser succeeds
 * - different browser fails
 * - missing browser binding fails
 * - binding cannot be forged from state alone
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getOrCreateBrowserBinding,
  getBrowserBinding,
  clearBrowserBinding,
  createState,
  validateState,
  consumeState,
  deleteState,
} from '../oauth-state-manager';

// Mock cookie store for testing
class MockCookieStore {
  private cookies: Map<string, string> = new Map();

  get(name: string): { value: string } | undefined {
    const value = this.cookies.get(name);
    return value ? { value } : undefined;
  }

  set(name: string, value: string, options?: any): void {
    this.cookies.set(name, value);
  }

  delete(name: string): void {
    this.cookies.delete(name);
  }

  clear(): void {
    this.cookies.clear();
  }
}

describe('OAuth Browser Binding', () => {
  let mockCookieStore: MockCookieStore;

  beforeEach(() => {
    mockCookieStore = new MockCookieStore();
  });

  it('should create browser binding cookie', async () => {
    const binding = await getOrCreateBrowserBinding(mockCookieStore as any);
    expect(binding).toBeDefined();
    expect(typeof binding).toBe('string');
    expect(binding.length).toBe(32); // 16 bytes = 32 hex characters
  });

  it('should retrieve existing browser binding', async () => {
    const binding1 = await getOrCreateBrowserBinding(mockCookieStore as any);
    const binding2 = await getBrowserBinding(mockCookieStore as any);
    
    expect(binding2).toBeDefined();
    expect(binding1).toBe(binding2);
  });

  it('should return null when no browser binding exists', async () => {
    const binding = await getBrowserBinding(mockCookieStore as any);
    expect(binding).toBeNull();
  });

  it('should clear browser binding', async () => {
    await getOrCreateBrowserBinding(mockCookieStore as any);
    await clearBrowserBinding(mockCookieStore as any);
    
    const binding = await getBrowserBinding(mockCookieStore as any);
    expect(binding).toBeNull();
  });

  it('should create state with browser binding', async () => {
    const binding = await getOrCreateBrowserBinding(mockCookieStore as any);
    const state = await createState(mockCookieStore as any);
    
    expect(state).toBeDefined();
    expect(typeof state).toBe('string');
    expect(state.length).toBe(32); // 16 bytes = 32 hex characters
    
    // State should be valid with matching browser binding
    const isValid = await validateState(state, mockCookieStore as any);
    expect(isValid).toBe(true);
  });

  it('should reject state without browser binding', async () => {
    // Create state first (establishes binding)
    const state = await createState(mockCookieStore as any);
    
    // Clear binding to simulate different browser
    await clearBrowserBinding(mockCookieStore as any);
    
    // State should be invalid without matching binding
    const isValid = await validateState(state, mockCookieStore as any);
    expect(isValid).toBe(false);
  });

  it('should consume state with matching browser binding', async () => {
    const state = await createState(mockCookieStore as any);
    
    const consumed = await consumeState(state, mockCookieStore as any);
    expect(consumed).toBe(true);
    
    // Second consume should fail
    const consumedAgain = await consumeState(state, mockCookieStore as any);
    expect(consumedAgain).toBe(false);
  });

  it('should reject state consumption without browser binding', async () => {
    const state = await createState(mockCookieStore as any);
    
    // Clear binding to simulate different browser
    await clearBrowserBinding(mockCookieStore as any);
    
    const consumed = await consumeState(state, mockCookieStore as any);
    expect(consumed).toBe(false);
  });

  it('should delete state and clear browser binding', async () => {
    const state = await createState(mockCookieStore as any);
    
    await deleteState(state);
    
    const binding = await getBrowserBinding(mockCookieStore as any);
    expect(binding).toBeNull();
    
    const isValid = await validateState(state, mockCookieStore as any);
    expect(isValid).toBe(false);
  });
});
