/**
 * Wizard State Persistence Layer
 * 
 * Provides localStorage-based persistence for the estimate wizard with:
 * - Autosave with debouncing
 * - Refresh recovery
 * - Draft restoration
 * - Submission integrity validation
 */

type PhotoMeta = { name: string; size: number; uploadedAt?: number };

export interface WizardState {
  step: number;
  selected: string[];
  projectType: string;
  otherNeed: string;
  answers: Record<string, string | boolean | number>;
  photos: PhotoMeta[];
  property: { address: string; city: string; county: string; details: string };
  customer: { name: string; email: string; phone: string };
  submitted: boolean;
  updatedAt: number;
}

const STORAGE_KEY = "estimate-wizard-draft";
const AUTOSAVE_DELAY = 500; // ms

/**
 * Save wizard state to localStorage
 */
export function saveWizardState(state: WizardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save wizard state:", error);
  }
}

/**
 * Load wizard state from localStorage
 */
export function loadWizardState(): WizardState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Validate that the state has the expected structure
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as WizardState;
  } catch (error) {
    console.error("Failed to load wizard state:", error);
    return null;
  }
}

/**
 * Clear wizard state from localStorage
 */
export function clearWizardState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear wizard state:", error);
  }
}

/**
 * Check if there's a valid draft to restore
 */
export function hasDraft(): boolean {
  const state = loadWizardState();
  if (!state) return false;
  // Don't restore if the draft is older than 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return state.updatedAt > weekAgo && !state.submitted;
}

/**
 * Create a debounced autosave function
 */
export function createAutosave(
  getState: () => WizardState,
  delay: number = AUTOSAVE_DELAY
): () => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      const state = getState();
      saveWizardState(state);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Validate that the submission payload matches the persisted state
 */
export function validateSubmissionIntegrity(
  uiState: WizardState,
  persistedState: WizardState | null
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!persistedState) {
    // No persisted state - this is fine for a fresh submission
    return { valid: true, issues: [] };
  }
  
  // Check critical fields
  if (uiState.selected.length !== persistedState.selected.length) {
    issues.push("Selected services count mismatch");
  }
  
  if (uiState.answers !== persistedState.answers) {
    issues.push("Answers mismatch");
  }
  
  if (uiState.property.city !== persistedState.property.city) {
    issues.push("Property city mismatch");
  }
  
  if (uiState.customer.email !== persistedState.customer.email) {
    issues.push("Customer email mismatch");
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
