/** Optional browser hints. Missing support is unknown, never proof of a fast device. */
export interface NetworkHints {
  saveData: boolean;
  effectiveType?: string;
  deviceMemory?: number;
}

export interface NetworkHintsSource {
  connection?: {
    readonly saveData?: boolean;
    readonly effectiveType?: string;
    addEventListener?: (type: 'change', listener: () => void) => void;
    removeEventListener?: (type: 'change', listener: () => void) => void;
  };
  readonly deviceMemory?: number;
}

function browserHintsSource(): NetworkHintsSource | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator as Navigator & NetworkHintsSource;
}

export function getNetworkHints(source: NetworkHintsSource | undefined = browserHintsSource()): NetworkHints {
  return {
    saveData: source?.connection?.saveData === true,
    effectiveType: source?.connection?.effectiveType,
    deviceMemory: source?.deviceMemory,
  };
}

/** Shared opt-out for optional work; memory is checked independently of connection support. */
export function isConstrainedDevice(hints: NetworkHints = getNetworkHints()): boolean {
  return hints.saveData || hints.effectiveType === '2g' || hints.effectiveType === 'slow-2g' ||
    (typeof hints.deviceMemory === 'number' && hints.deviceMemory > 0 && hints.deviceMemory < 2);
}

export function subscribeToNetworkHints(onChange: () => void, source = browserHintsSource()): () => void {
  const connection = source?.connection;
  connection?.addEventListener?.('change', onChange);
  return () => connection?.removeEventListener?.('change', onChange);
}
