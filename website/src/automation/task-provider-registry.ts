/** Task Provider Registry

Data-driven provider registry using TaskProviderRuntimeView (single source of truth).

Architecture:
TaskProviderRegistry
  ↓
TaskProviderRuntimeView (single source of truth)
  ↓
Capability-based routing with priority
*/

import { TaskProvider } from './task-provider';
import { TaskProviderRuntimeView } from './task-provider-runtime';
import { AutomationCapabilityId } from './capability-id';

export class TaskProviderRegistry {
  private runtimes: Map<string, TaskProviderRuntimeView> = new Map();

  registerRuntime(runtime: TaskProviderRuntimeView): void {
    this.runtimes.set(runtime.name, runtime);
  }

  getProviderForCapability(capabilityId: AutomationCapabilityId): TaskProvider {
    const availableRuntimes = Array.from(this.runtimes.values()).filter(
      runtime => runtime.supportsCapability(capabilityId.toString()),
    );

    if (availableRuntimes.length === 0) {
      throw new Error(`No provider registered for capability: ${capabilityId}`);
    }

    const bestRuntime = this.selectBestRuntime(availableRuntimes);
    return bestRuntime.adapter;
  }

  private selectBestRuntime(runtimes: TaskProviderRuntimeView[]): TaskProviderRuntimeView {
    const availableRuntimes = runtimes.filter(runtime => runtime.isAvailable());

    if (availableRuntimes.length === 0) {
      return runtimes[0];
    }

    const priorityOrder = { primary: 0, secondary: 1, tertiary: 2 };
    availableRuntimes.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    return availableRuntimes[0];
  }

  getProvider(name: string): TaskProvider {
    const runtime = this.runtimes.get(name);
    if (!runtime) {
      throw new Error(`Provider runtime not found: ${name}`);
    }
    return runtime.adapter;
  }

  getRuntime(name: string): TaskProviderRuntimeView {
    const runtime = this.runtimes.get(name);
    if (!runtime) {
      throw new Error(`Provider runtime not found: ${name}`);
    }
    return runtime;
  }

  listCapabilities(): string[] {
    const capabilities = new Set<string>();
    this.runtimes.forEach(runtime => {
      runtime.capabilities.forEach(cap => capabilities.add(cap));
    });
    return Array.from(capabilities);
  }

  listProviders(): string[] {
    return Array.from(this.runtimes.keys());
  }

  getProvidersForCapability(capabilityId: AutomationCapabilityId): string[] {
    const providers: string[] = [];
    this.runtimes.forEach(runtime => {
      if (runtime.supportsCapability(capabilityId.toString())) {
        providers.push(runtime.name);
      }
    });
    return providers;
  }
}
