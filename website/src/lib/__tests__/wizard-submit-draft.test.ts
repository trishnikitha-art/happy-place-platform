import { createAutosave, loadWizardState, saveWizardState, validateSubmissionIntegrity, type WizardState } from '../wizard-persistence';

describe('submission while draft autosave is pending', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();

  beforeEach(() => {
    jest.useFakeTimers();
    values.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete (globalThis as unknown as Record<string, unknown>).localStorage;
  });

  it('flushes the current submission snapshot before readback while the debounced write remains pending', () => {
    const saved: WizardState = {
      step: 5, selected: ['decks'], projectType: 'Build something new', otherNeed: '',
      answers: {}, photos: [], property: { address: '', city: 'Corvallis', county: 'benton', details: '' },
      customer: { name: 'Visitor', email: 'previous@example.test', phone: '5550100' },
      submitted: false, updatedAt: 1,
    };
    saveWizardState(saved);
    const current = { ...saved, customer: { ...saved.customer, email: 'current@example.test' }, updatedAt: 2 };
    const autosave = createAutosave(() => current);
    autosave();

    expect(jest.getTimerCount()).toBe(1);
    expect(validateSubmissionIntegrity(current, loadWizardState())).toEqual({
      valid: false, issues: ['Customer email mismatch'],
    });
    // This models the handler's required flush/readback ordering. Browser proof
    // still must establish that handleSubmit invokes it before submission.
    saveWizardState(current);
    expect(jest.getTimerCount()).toBe(1);
    expect(validateSubmissionIntegrity(current, loadWizardState())).toEqual({ valid: true, issues: [] });
    expect(loadWizardState()?.customer.email).toBe('current@example.test');
  });
});
