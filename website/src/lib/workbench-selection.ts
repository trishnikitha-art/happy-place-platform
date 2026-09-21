import type { RegisteredSlot } from './slot-registry';
import type { VisualAsset } from './visual-asset-registry';
import type { DriveFile } from './drive/drive-discovery';

interface Selection {
  selectedSlots: RegisteredSlot[];
  selectedAsset: VisualAsset | null;
  driveSelectedFile: DriveFile | null;
}

export function selectTarget<T extends Selection>(state: T, slot: RegisteredSlot, toggle = false): T {
  return {
    ...state,
    selectedSlots: toggle
      ? state.selectedSlots.some(s => s.id === slot.id)
        ? state.selectedSlots.filter(s => s.id !== slot.id)
        : [...state.selectedSlots, slot]
      : [slot],
  };
}

export function selectPublishedSource<T extends Selection>(state: T, asset: VisualAsset): T {
  return { ...state, selectedAsset: asset, driveSelectedFile: null };
}

export function selectDriveSource<T extends Selection>(state: T, file: DriveFile): T {
  return { ...state, driveSelectedFile: file, selectedAsset: null };
}
