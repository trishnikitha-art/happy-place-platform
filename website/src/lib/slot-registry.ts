/**
 * Slot Registry - Runtime registration of website visual slots
 * 
 * Purpose: Allow actual website components to register their image slots
 * - Components wrap images with VisualSlot
 * - VisualSlot registers itself to this registry
 * - Workbench consumes registry to get slot mappings
 * - Single source of truth: website components declare their own slots
 * 
 * Architecture:
 * - VisualSlot component registers on mount, unregisters on unmount
 * - Registry stores slot metadata (id, route, section, currentMediaId)
 * - Workbench reads registry to enable click selection and drag/drop
 * - Uses postMessage for iframe cross-frame communication
 */

export interface RegisteredSlot {
  id: string;
  route: string;
  page: string;
  section: string;
  slotName: string;
  currentMediaId: string | null;
  element: HTMLElement | null;
  component: string;
}

class SlotRegistry {
  private slots: Map<string, RegisteredSlot> = new Map();
  private listeners: Set<() => void> = new Set();
  private isWorkbenchMode = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isWorkbenchMode = window.location.pathname.startsWith('/workbench');
      
      if (this.isWorkbenchMode) {
        window.addEventListener('message', this.handleMessage);
      }
    }
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'SLOT_REGISTER') {
      // Reconstruct slot with element as null (cannot send HTMLElement across iframe)
      this.register({ ...event.data.slot, element: null });
    } else if (event.data.type === 'SLOT_UNREGISTER') {
      this.unregister(event.data.slotId);
    } else if (event.data.type === 'SLOT_CLICK') {
      // Forward slot click events to window for workbench to handle
      window.dispatchEvent(new CustomEvent('slot-click', { detail: event.data.slot }));
    }
  };

  register(slot: RegisteredSlot) {
    this.slots.set(slot.id, slot);
    
    // If in regular page mode and workbench is open, notify parent
    if (!this.isWorkbenchMode && typeof window !== 'undefined' && window.parent !== window) {
      // Remove element before sending (cannot clone HTMLElement)
      const { element, ...slotWithoutElement } = slot;
      window.parent.postMessage({
        type: 'SLOT_REGISTER',
        slot: slotWithoutElement,
      }, '*');
    }
    
    this.notify();
  }

  unregister(slotId: string) {
    this.slots.delete(slotId);
    
    // If in regular page mode and workbench is open, notify parent
    if (!this.isWorkbenchMode && typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'SLOT_UNREGISTER',
        slotId,
      }, '*');
    }
    
    this.notify();
  }

  get(slotId: string): RegisteredSlot | undefined {
    return this.slots.get(slotId);
  }

  getAll(): RegisteredSlot[] {
    return Array.from(this.slots.values());
  }

  getByRoute(route: string): RegisteredSlot[] {
    return this.getAll().filter(slot => slot.route === route);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  clear() {
    this.slots.clear();
    this.notify();
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleMessage);
    }
  }
}

// Singleton instance
export const slotRegistry = new SlotRegistry();
