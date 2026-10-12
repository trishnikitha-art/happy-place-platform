import { loadWizardState, saveWizardState, validateSubmissionIntegrity, type WizardState } from '../wizard-persistence';
import { estimateService } from '@/services/estimate';
import type { EstimateRequest } from '@/types';

jest.mock('@/config/infrastructure-flags', () => ({ features: { estimateApi: false } }));

const originals = ['window', 'localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
const storage = new Map<string, string>();
let draftHref = '';
beforeEach(() => {
  storage.clear(); draftHref = '';
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { set href(value: string) { draftHref = value; } },
  } });
});
afterEach(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as unknown as Record<string, unknown>)[key];
  }
});

function state(county: string): WizardState {
  return { step: 4, selected: ['something-else'], projectType: '', otherNeed: 'Repair an interior cabinet',
    answers: {}, photos: [], property: { address: '', city: 'Test city', county, details: '' },
    customer: { name: 'Preview Test', email: 'preview@example.test', phone: '5550100' },
    submitted: false, updatedAt: Date.now() };
}

test.each(['benton-county', 'linn-county', 'polk-county', 'marion-county'])('%s survives persistence and the actual estimate draft transport', async county => {
  const draft = state(county);
  saveWizardState(draft);
  const persisted = loadWizardState()!;
  expect(persisted.property.county).toBe(county);
  expect(validateSubmissionIntegrity(draft, persisted)).toEqual({ valid: true, issues: [] });
  const request: EstimateRequest = { services: persisted.selected, answers: persisted.answers,
    customer: persisted.customer, property: persisted.property, photos: [], otherNeed: persisted.otherNeed };
  const result = await estimateService.submit(request);
  expect(result).toMatchObject({ ok: true, transport: 'mailto' });
  expect(result.message).toMatch(/draft prepared.*Send it from your email app/i);
  const body = new URL(draftHref).searchParams.get('body');
  expect(body).toContain(`County:  ${county}`);
});

test('a stale persisted county cannot validate as the current submission', () => {
  saveWizardState(state('benton-county'));
  expect(validateSubmissionIntegrity(state('marion-county'), loadWizardState())).toEqual({
    valid: false, issues: ['Property county mismatch'],
  });
});
