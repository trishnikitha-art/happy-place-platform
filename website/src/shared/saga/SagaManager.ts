/**
 * Saga Manager - Compensating actions for rollback
 * 
 * Some actions require rollback when a step fails.
 * 
 * Example:
 * Create Project
 * ↓
 * Reserve Inventory
 * ↓
 * Assign Crew
 * ↓
 * Charge Deposit
 * 
 * If Assign Crew fails:
 * - Release inventory
 * - Delete reservation
 * - Refund deposit
 */

export interface SagaStep {
  id: string;
  name: string;
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}

export interface Saga {
  id: string;
  name: string;
  steps: SagaStep[];
  currentStep: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'compensating' | 'compensated';
  error?: Error;
  startedAt?: string;
  completedAt?: string;
}

export class SagaManager {
  private sagas: Map<string, Saga> = new Map();
  private activeSaga: Saga | null = null;

  // Create and execute a saga
  async executeSaga(name: string, steps: SagaStep[]): Promise<Saga> {
    const saga: Saga = {
      id: `saga-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      steps,
      currentStep: 0,
      status: 'pending',
      startedAt: new Date().toISOString()
    };

    this.sagas.set(saga.id, saga);
    this.activeSaga = saga;

    try {
      await this.executeSteps(saga);
      saga.status = 'completed';
      saga.completedAt = new Date().toISOString();
    } catch (error) {
      saga.status = 'failed';
      saga.error = error instanceof Error ? error : new Error(String(error));
      
      // Compensate
      await this.compensate(saga);
    }

    this.activeSaga = null;
    return saga;
  }

  // Execute saga steps sequentially
  private async executeSteps(saga: Saga): Promise<void> {
    saga.status = 'in-progress';

    for (let i = 0; i < saga.steps.length; i++) {
      saga.currentStep = i;
      const step = saga.steps[i];

      try {
        await step.execute();
      } catch (error) {
        console.error(`Saga step ${step.name} failed:`, error);
        throw error; // Propagate to trigger compensation
      }
    }
  }

  // Compensate by running compensating actions in reverse order
  private async compensate(saga: Saga): Promise<void> {
    saga.status = 'compensating';
    console.log(`Compensating saga ${saga.name} from step ${saga.currentStep}`);

    // Run compensating actions in reverse order
    for (let i = saga.currentStep - 1; i >= 0; i--) {
      const step = saga.steps[i];
      
      try {
        await step.compensate();
        console.log(`Compensated step: ${step.name}`);
      } catch (error) {
        console.error(`Failed to compensate step ${step.name}:`, error);
        // Continue compensating even if one step fails
      }
    }

    saga.status = 'compensated';
  }

  // Get saga by ID
  getSaga(id: string): Saga | undefined {
    return this.sagas.get(id);
  }

  // Get active saga
  getActiveSaga(): Saga | null {
    return this.activeSaga;
  }

  // Get all sagas
  getAllSagas(): Saga[] {
    return Array.from(this.sagas.values());
  }

  // Clear completed sagas
  clearCompleted(): void {
    for (const [id, saga] of this.sagas.entries()) {
      if (saga.status === 'completed' || saga.status === 'compensated') {
        this.sagas.delete(id);
      }
    }
  }
}

// Helper to create saga steps
export function createSagaStep(
  id: string,
  name: string,
  execute: () => Promise<any>,
  compensate: () => Promise<void>
): SagaStep {
  return { id, name, execute, compensate };
}

// Example saga: Create Project with compensation
export function createProjectSaga(
  projectId: string,
  customerId: string
): SagaStep[] {
  return [
    createSagaStep(
      'reserve-inventory',
      'Reserve Inventory',
      async () => {
        console.log(`Reserving inventory for project ${projectId}`);
        // Reserve inventory logic
        return { inventoryReserved: true };
      },
      async () => {
        console.log(`Releasing inventory for project ${projectId}`);
        // Release inventory logic
      }
    ),
    createSagaStep(
      'assign-crew',
      'Assign Crew',
      async () => {
        console.log(`Assigning crew to project ${projectId}`);
        // Assign crew logic
        return { crewAssigned: true };
      },
      async () => {
        console.log(`Unassigning crew from project ${projectId}`);
        // Unassign crew logic
      }
    ),
    createSagaStep(
      'charge-deposit',
      'Charge Deposit',
      async () => {
        console.log(`Charging deposit for project ${projectId}`);
        // Charge deposit logic
        return { depositCharged: true };
      },
      async () => {
        console.log(`Refunding deposit for project ${projectId}`);
        // Refund deposit logic
      }
    )
  ];
}

// Initialize saga manager
export function initializeSagaManager(): SagaManager {
  return new SagaManager();
}
