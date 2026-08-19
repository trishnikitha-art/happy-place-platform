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

  // Use composite key (route + slotId) to prevent collisions across different pages
  private makeKey(slot: RegisteredSlot): string {
    return `${slot.route}:${slot.id}`;
  }

  private handleMessage = (event: MessageEvent) => {
    // Filter: Only process Workbench protocol messages
    if (!event.data || typeof event.data.type !== 'string') {
      return;
    }

    const messageType = event.data.type;

    if (messageType === 'SLOT_REGISTER') {
      console.log('[FORENSIC] SLOT REGISTRY MESSAGE RECEIVED', {
        type: messageType,
        origin: event.origin,
        slotId: event.data.slot?.id,
      });
      // Reconstruct slot with element as null (cannot send HTMLElement across iframe)
      this.register({ ...event.data.slot, element: null });
    } else if (messageType === 'SLOT_UNREGISTER') {
      console.log('[FORENSIC] SLOT REGISTRY MESSAGE RECEIVED', {
        type: messageType,
        origin: event.origin,
        slotId: event.data.slotId,
      });
      this.unregister(event.data.slotId);
    } else if (messageType === 'SLOT_CLICK') {
      console.log('[FORENSIC] SLOT REGISTRY MESSAGE RECEIVED', {
        type: messageType,
        origin: event.origin,
        slotId: event.data.slot?.id,
      });
      // Forward slot click events to window for workbench to handle
      window.dispatchEvent(new CustomEvent('slot-click', { detail: event.data.slot }));
    }
    // Ignore all other message types (Next.js HMR, devtools, etc.)
  };

  register(slot: RegisteredSlot) {
    console.log('[FORENSIC] SLOT REGISTRY REGISTER', {
      slotId: slot.id,
      route: slot.route,
      compositeKey: this.makeKey(slot),
      currentMediaId: slot.currentMediaId,
      isWorkbenchMode: this.isWorkbenchMode,
      parentWindow: typeof window !== 'undefined' ? window.parent !== window : 'N/A',
    });
    this.slots.set(this.makeKey(slot), slot);

    // If in regular page mode and workbench is open, notify parent
    if (!this.isWorkbenchMode && typeof window !== 'undefined' && window.parent !== window) {
      // Remove element before sending (cannot clone HTMLElement)
      const { element, ...slotWithoutElement } = slot;
      console.log('[FORENSIC] SLOT REGISTRY POSTMESSAGE SLOT_REGISTER', {
        slotId: slot.id,
        targetOrigin: '*',
      });
      window.parent.postMessage({
        type: 'SLOT_REGISTER',
        slot: slotWithoutElement,
      }, '*');
    }

    this.notify();
  }

  unregister(slotId: string, route?: string) {
    // If route provided, use composite key for direct lookup
    if (route) {
      this.slots.delete(`${route}:${slotId}`);
    } else {
      // Fallback: search by slotId alone (for backward compatibility)
      for (const [key, slot] of this.slots.entries()) {
        if (slot.id === slotId) {
          this.slots.delete(key);
          break;
        }
      }
    }
    
    // If in regular page mode and workbench is open, notify parent
    if (!this.isWorkbenchMode && typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'SLOT_UNREGISTER',
        slotId,
      }, '*');
    }
    
    this.notify();
  }

  get(slotId: string, route?: string): RegisteredSlot | undefined {
    if (route) {
      return this.slots.get(`${route}:${slotId}`);
    }
    // Fallback: search by slotId alone (for backward compatibility)
    for (const slot of this.slots.values()) {
      if (slot.id === slotId) {
        return slot;
      }
    }
    return undefined;
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

// Singleton instance with browser-global singleton for chunk deduplication
function getSlotRegistrySingleton(): SlotRegistry {
  if (typeof window === 'undefined') {
    // Server-side: return module instance
    return new SlotRegistry();
  }
  
  // Browser-side: use window singleton to ensure single instance across chunks
  if (!(window as any).__SLOT_REGISTRY__) {
    (window as any).__SLOT_REGISTRY__ = new SlotRegistry();
  }
  return (window as any).__SLOT_REGISTRY__;
}

export const slotRegistry = getSlotRegistrySingleton();
