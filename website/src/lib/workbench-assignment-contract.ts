// Shared by the editor, authority reader, and both assignment routes.
const SERVICE_SLUGS = new Set([
  'painting', 'repairs', 'restoration', 'fences', 'decks', 'pergolas',
  'kitchen-remodeling', 'bathroom-remodeling', 'built-ins', 'outdoor-living', 'misc', 'drywall',
]);

export const MAX_ASSIGNMENT_TARGETS = 64;

export function resolveAssignmentKey(slotId: unknown): string | null {
  if (typeof slotId !== 'string') return null;
  if (slotId === 'hero-background') return 'brand-hero-background';
  if (slotId === 'homepage-owner-portrait-slot') return 'brand-portrait-homepage';
  const prefix = 'homepage-service-card-slot-';
  if (!slotId.startsWith(prefix)) return null;
  const slug = slotId.slice(prefix.length);
  return SERVICE_SLUGS.has(slug) ? slug : null;
}

export interface AssignmentTarget {
  slotId: string;
  serviceSlug: string;
  expectedRevision: number;
}

export class AssignmentBatchError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AssignmentBatchError';
  }
}

export function isAssignmentRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER;
}

export function prepareAssignmentTargets(input: {
  slotId?: unknown; slotIds?: unknown; expectedRevision?: unknown; slotRevisions?: unknown;
}): AssignmentTarget[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AssignmentBatchError('INVALID_REQUEST', 'An assignment object is required.');
  }
  const ids = input.slotIds === undefined ? [input.slotId] : input.slotIds;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ASSIGNMENT_TARGETS) {
    throw new AssignmentBatchError('INVALID_TARGETS', `Select 1 to ${MAX_ASSIGNMENT_TARGETS} slots.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new AssignmentBatchError('DUPLICATE_TARGET', 'Each target slot must appear exactly once.');
  }
  const revisions = input.slotIds === undefined
    ? [{ slotId: input.slotId, expectedRevision: input.expectedRevision }]
    : input.slotRevisions;
  if (!Array.isArray(revisions) || revisions.length !== ids.length ||
      revisions.some(r => !r || !ids.includes(r.slotId)) ||
      new Set(revisions.map(r => r.slotId)).size !== ids.length) {
    throw new AssignmentBatchError('SLOT_REVISIONS_REQUIRED', 'Provide exactly one revision for every target.');
  }
  return ids.map(slotId => {
    const serviceSlug = resolveAssignmentKey(slotId);
    if (!serviceSlug) throw new AssignmentBatchError('INVALID_TARGET_SLOT', `Slot '${String(slotId)}' is not writable.`);
    const expectedRevision = revisions.find(r => r.slotId === slotId).expectedRevision;
    if (!isAssignmentRevision(expectedRevision)) {
      throw new AssignmentBatchError('INVALID_REVISION', `Slot '${slotId}' requires a nonnegative integer revision.`);
    }
    return { slotId, serviceSlug, expectedRevision };
  });
}
