import { isGalleryOrder } from './workbench-gallery-order';

export interface GalleryDraft {
  projectId: string;
  gallery: string[];
  baseGallery: string[];
  baseRevision: number;
  hiddenGallery: string[];
  visibility: Record<string, 'hide' | 'unhide'>;
}

export interface StoredGallery {
  gallery: string[];
  currentRevision: number;
  lastTransactionId?: string;
  hiddenGallery?: string[];
  visibilityRevision?: number;
  pendingDeployment?: { gallery: string[]; currentRevision: number; transactionId: string } | null;
}

export interface StagedGallery {
  projectId: string;
  gallery: string[];
  currentRevision: number;
  transactionId?: string;
  requiresDeployment: boolean;
  verified: boolean;
  hiddenGallery: string[];
  pendingVisibility: Record<string, 'hide' | 'unhide'>;
}

export interface GalleryDeployment {
  transactionIds: string[];
  commitSha?: string;
  confirmed: boolean;
}

export interface GalleryBatchTransport {
  read(projectId: string): Promise<StoredGallery>;
  write(draft: GalleryDraft): Promise<{ currentRevision: number; transactionId?: string; staged?: boolean }>;
  visibility(projectId: string, mediaId: string, operation: 'hide' | 'unhide'): Promise<{ visibilityRevision: number }>;
  deploy(transactionIds: string[]): Promise<{ commitSha?: string }>;
}

const equal = (a: readonly string[], b: readonly string[]) => JSON.stringify(a) === JSON.stringify(b);

export function createGalleryDraft(projectId: string, stored: StoredGallery): GalleryDraft {
  if (!projectId || !isGalleryOrder(stored.gallery) || !Number.isSafeInteger(stored.currentRevision)
    || stored.currentRevision < 0 || (stored.hiddenGallery !== undefined && !isGalleryOrder(stored.hiddenGallery))) {
    throw new Error('The current gallery could not be verified. Reload before editing.');
  }
  return { projectId, gallery: [...stored.gallery], baseGallery: [...stored.gallery],
    baseRevision: stored.currentRevision, hiddenGallery: [...(stored.hiddenGallery ?? [])], visibility: {} };
}

// Browser-local drafts only. The existing authenticated routes continue to own
// persistence, revisions, transaction claims, and deployment authorization.
export class WorkbenchGalleryBatch {
  readonly drafts = new Map<string, GalleryDraft>();
  readonly staged = new Map<string, StagedGallery>();
  deployment: GalleryDeployment | null = null;

  setDraft(draft: GalleryDraft) {
    if (this.staged.has(draft.projectId) || this.deployment) {
      throw new Error('This gallery is already saved. Finish publishing the saved batch before editing it again.');
    }
    if (equal(draft.gallery, draft.baseGallery) && Object.keys(draft.visibility).length === 0) {
      this.drafts.delete(draft.projectId);
    } else {
      this.drafts.set(draft.projectId, draft);
    }
  }

  cancelDrafts() {
    // Staged writes have already reached runtime authority and cannot be
    // canceled by deleting a browser draft. Keep their transaction IDs.
    this.drafts.clear();
  }

  async stage(transport: GalleryBatchTransport, changed: () => void): Promise<string[]> {
    const failures: string[] = [];
    // Snapshot project IDs, then process serially. A failed project must not
    // erase another project's successful write or create a separate deploy.
    const projectIds = [...new Set([...this.staged.keys(), ...this.drafts.keys()])];
    for (const projectId of projectIds) {
      try {
        let staged = this.staged.get(projectId);
        if (!staged) {
          const draft = this.drafts.get(projectId)!;
          const result = equal(draft.gallery, draft.baseGallery)
            ? { currentRevision: draft.baseRevision, staged: false }
            : await transport.write(draft);
          if (!Number.isSafeInteger(result.currentRevision) || result.currentRevision < 0
            || (result.transactionId !== undefined && (typeof result.transactionId !== 'string' || !result.transactionId))
            || (result.staged && !result.transactionId)) {
            throw new Error('Save response could not be verified. Check the current gallery before retrying.');
          }
          staged = { projectId, gallery: [...draft.gallery], currentRevision: result.currentRevision,
            transactionId: result.transactionId, requiresDeployment: !!result.staged,
            verified: false, hiddenGallery: [...draft.hiddenGallery], pendingVisibility: { ...draft.visibility } };
          // Retain the receipt before readback. Retrying a read failure must
          // verify the original transaction, rather than write/deploy it twice.
          this.staged.set(projectId, staged);
          changed();
        }

        let stored = await transport.read(projectId);
        if (stored.currentRevision !== staged.currentRevision || !equal(stored.gallery, staged.gallery)
          || (staged.transactionId && stored.lastTransactionId !== staged.transactionId)) {
          throw new Error('The saved order or transaction could not be verified. The save receipt was retained.');
        }
        // A lost write response can be retried as ALREADY_APPLIED. The live
        // pending pointer still proves that original receipt awaits deployment.
        const pending = stored.pendingDeployment;
        if (pending && pending.transactionId === staged.transactionId
          && pending.currentRevision === staged.currentRevision
          && equal(pending.gallery, staged.gallery)) staged.requiresDeployment = true;
        for (const [mediaId, operation] of Object.entries(staged.pendingVisibility)) {
          const result = await transport.visibility(projectId, mediaId, operation);
          stored = await transport.read(projectId);
          const hidden = stored.hiddenGallery?.includes(mediaId) ?? false;
          if (!Number.isSafeInteger(result.visibilityRevision) || stored.visibilityRevision !== result.visibilityRevision
            || hidden !== (operation === 'hide')) {
            throw new Error('The saved photo visibility could not be verified. Your remaining changes were retained.');
          }
          delete staged.pendingVisibility[mediaId];
          staged.hiddenGallery = [...(stored.hiddenGallery ?? [])];
          changed();
        }
        staged.verified = true;
        this.drafts.delete(projectId);
        changed();
      } catch (error) {
        failures.push(`${projectId}: ${error instanceof Error ? error.message : 'Could not save this gallery.'}`);
      }
    }
    return failures;
  }

  async requestDeployment(transport: GalleryBatchTransport, changed: () => void): Promise<GalleryDeployment | null> {
    if (this.drafts.size || [...this.staged.values()].some(value => !value.verified)) {
      throw new Error('Finish saving and verifying every project before publishing the batch.');
    }
    if (this.deployment) return this.deployment;
    const transactionIds = [...new Set([...this.staged.values()]
      .filter(value => value.requiresDeployment && value.transactionId).map(value => value.transactionId!))];
    if (!transactionIds.length) return null;
    // Record the attempt before sending. If the connection is lost after the
    // server commits, another click cannot create a second deployment.
    this.deployment = { transactionIds, confirmed: false };
    changed();
    const result = await transport.deploy(transactionIds);
    if (typeof result.commitSha !== 'string' || !result.commitSha) {
      throw new Error('Deployment was requested, but its commit could not be confirmed. Use deployment recovery to check it.');
    }
    this.deployment.commitSha = result.commitSha;
    changed();
    return this.deployment;
  }

  async verifyStored(transport: GalleryBatchTransport): Promise<void> {
    for (const staged of this.staged.values()) {
      const stored = await transport.read(staged.projectId);
      if (stored.currentRevision !== staged.currentRevision || !equal(stored.gallery, staged.gallery)
        || (staged.transactionId && stored.lastTransactionId !== staged.transactionId)
        || !equal([...(stored.hiddenGallery ?? [])].sort(), [...staged.hiddenGallery].sort())) {
        throw new Error(`${staged.projectId}: saved gallery changed before verification. The batch receipt was retained.`);
      }
    }
  }

  recoverUnconfirmedDeployment(transactions: Array<{ transactionId: string; state: string }>): boolean {
    if (!this.deployment || this.deployment.commitSha) return false;
    // Only the existing recovery endpoint's prepared/failed receipts prove a
    // fresh claim is possible. An absent receipt may already be committed; it
    // must never be treated as permission to send another deployment request.
    const recoverable = this.deployment.transactionIds.every(id => transactions.some(transaction =>
      transaction && transaction.transactionId === id && ['prepared', 'failed'].includes(transaction.state)));
    if (recoverable) this.deployment = null;
    return recoverable;
  }

  complete() {
    this.staged.clear();
    this.deployment = null;
  }
}
