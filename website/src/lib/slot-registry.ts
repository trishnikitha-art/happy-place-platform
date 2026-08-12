/**
 * Slot Registry - Runtime registration of website visual slots
 * 
 * Purpose: Allow actual website components to register their image slots
 * - Components wrap images with VisualSlot
 * - VisualSlot registers itself to this registry
 * - Workbench consumes registry to get actual slot positions and mappings
 * - Single source of truth: website components declare their own slots
 * 
 * Architecture:
 * - VisualSlot component registers on mount, unregisters on unmount
 * - Registry stores slot metadata (id, route, section, currentMediaId, DOM element ref)
 * - Workbench reads registry to render slot highlights and enable drag/drop
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
  rect?: { top: number; left: number; width: number; height: number };
}

class SlotRegistry {
  private slots: Map<string, RegisteredSlot> = new Map();
  private listeners: Set<() => void> = new Set();
  private isWorkbenchMode = false;

  constructor() {
    // Check if we're in workbench mode
    if (typeof window !== 'undefined') {
      this.isWorkbenchMode = window.location.pathname.startsWith('/workbench');
      
      // If in workbench mode, listen for slot registrations from iframe
      if (this.isWorkbenchMode) {
        window.addEventListener('message', this.handleMessage);
      }
    }
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'SLOT_REGISTER') {
      this.register(event.data.slot);
    } else if (event.data.type === 'SLOT_UNREGISTER') {
      this.unregister(event.data.slotId);
    } else if (event.data.type === 'SLOT_UPDATE_RECT') {
      this.updateRect(event.data.slotId, event.data.rect);
    }
  };

  register(slot: RegisteredSlot) {
    this.slots.set(slot.id, slot);
    
    // If in regular page mode and workbench is open, notify parent
    if (!this.isWorkbenchMode && typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'SLOT_REGISTER',
        slot,
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

  updateRect(slotId: string, rect: { top: number; left: number; width: number; height: number }) {
    const slot = this.slots.get(slotId);
    if (slot) {
      slot.rect = rect;
      this.notify();
    }
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
