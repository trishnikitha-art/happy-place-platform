import { prepareAssignmentTargets, resolveAssignmentKey } from '@/lib/workbench-assignment-contract';
import { selectTarget, selectPublishedSource, selectDriveSource } from '@/lib/workbench-selection';
import type { RegisteredSlot } from '@/lib/slot-registry';
import type { VisualAsset } from '@/lib/visual-asset-registry';
import type { DriveFile } from '@/lib/drive/drive-discovery';

const a = { id: 'hero-background', currentMediaId: 'old' } as RegisteredSlot;
const b = { id: 'homepage-service-card-slot-decks', currentMediaId: 'other' } as RegisteredSlot;
const asset = { id: 'new', filename: 'replacement.jpg' } as VisualAsset;
const drive = { id: 'drive-file', name: 'Drive source.jpg' } as DriveFile;
const initial = { selectedSlots: [a, b], selectedAsset: asset, driveSelectedFile: null as DriveFile | null };

describe('Independent source and target selection', () => {
  it('preserves all targets when switching between Drive and published sources', () => {
    const fromDrive = selectDriveSource(initial, drive);
    expect(fromDrive.selectedSlots).toBe(initial.selectedSlots);
    expect(fromDrive.selectedAsset).toBeNull();
    expect(fromDrive.driveSelectedFile).toBe(drive);
    const local = selectPublishedSource(fromDrive, asset);
    expect(local.selectedSlots).toBe(initial.selectedSlots);
    expect(local.selectedAsset).toBe(asset);
    expect(local.driveSelectedFile).toBeNull();
  });
  it('preserves the source when a target with a different current image is selected', () => {
    const selected = selectTarget(initial, a);
    expect(selected.selectedSlots).toEqual([a]);
    expect(selected.selectedAsset).toBe(asset);
    const withDrive = selectTarget(selectDriveSource(initial, drive), b);
    expect(withDrive.driveSelectedFile).toBe(drive);
    expect(withDrive.selectedAsset).toBeNull();
  });
  it('toggles targets without changing source or mutating prior state', () => {
    const selected = selectTarget(initial, a, true);
    expect(selected.selectedSlots).toEqual([b]);
    expect(selected.selectedAsset).toBe(asset);
    expect(initial.selectedSlots).toEqual([a, b]);
    expect(selectTarget(selected, a, true).selectedSlots).toEqual([b, a]);
  });
});

describe('Assignment preparation contract', () => {
  const request = { slotIds: [a.id, b.id], slotRevisions: [
    { slotId: a.id, expectedRevision: 5 }, { slotId: b.id, expectedRevision: 0 },
  ] };
  it('resolves exactly the canonical public authority keys', () => {
    expect(prepareAssignmentTargets(request).map(t => t.serviceSlug)).toEqual(['brand-hero-background', 'decks']);
    expect(resolveAssignmentKey('homepage-service-card-slot-drywall')).toBe('drywall');
    expect(resolveAssignmentKey('service-card-decks')).toBeNull();
    expect(resolveAssignmentKey('decks')).toBeNull();
    expect(resolveAssignmentKey('invented-slot')).toBeNull();
  });
  it.each([undefined, null, '5', 'not-a-number', -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    'rejects invalid expected revision %s', expectedRevision => {
      expect(() => prepareAssignmentTargets({ slotId: a.id, expectedRevision })).toThrow();
    },
  );
  it('rejects duplicate targets and duplicate or unrelated revision entries', () => {
    expect(() => prepareAssignmentTargets({ ...request, slotIds: [a.id, a.id] })).toThrow();
    expect(() => prepareAssignmentTargets({ ...request, slotRevisions: [request.slotRevisions[0], request.slotRevisions[0]] })).toThrow();
    expect(() => prepareAssignmentTargets({ ...request, slotRevisions: [{ slotId: 'unknown', expectedRevision: 0 }, request.slotRevisions[1]] })).toThrow();
  });
  it('rejects empty, oversized, and unknown target sets', () => {
    expect(() => prepareAssignmentTargets({ slotIds: [], slotRevisions: [] })).toThrow();
    expect(() => prepareAssignmentTargets({ slotIds: Array(65).fill(a.id) })).toThrow();
    expect(() => prepareAssignmentTargets({ slotId: 'missing', expectedRevision: 0 })).toThrow();
  });
  it('accepts explicit create revision zero, including single-slot callers', () => {
    expect(prepareAssignmentTargets({ slotId: a.id, expectedRevision: 0 })[0].expectedRevision).toBe(0);
  });
});
