import { createGalleryDraft, WorkbenchGalleryBatch, type GalleryBatchTransport, type StoredGallery } from '../workbench-gallery-batch';
import { moveGalleryImage } from '../workbench-gallery-order';

function harness() {
  const stored = new Map<string, StoredGallery>([
    ['deck', { gallery: ['a', 'hidden', 'b', 'c'], currentRevision: 7, hiddenGallery: ['hidden'], visibilityRevision: 3 }],
    ['fence', { gallery: ['d', 'e', 'f'], currentRevision: 2, hiddenGallery: [], visibilityRevision: 0 }],
  ]);
  const transport: GalleryBatchTransport = {
    read: jest.fn(async projectId => structuredClone(stored.get(projectId)!)),
    write: jest.fn(async draft => {
      const current = stored.get(draft.projectId)!;
      if (current.currentRevision !== draft.baseRevision) throw new Error('409 concurrent modification');
      const currentRevision = current.currentRevision + 1;
      const transactionId = `tx-${draft.projectId}-${currentRevision}`;
      stored.set(draft.projectId, { ...current, gallery: [...draft.gallery], currentRevision, lastTransactionId: transactionId });
      return { currentRevision, transactionId, staged: true };
    }),
    visibility: jest.fn(async (projectId, mediaId, operation) => {
      const current = stored.get(projectId)!;
      const hiddenGallery = operation === 'hide' ? [...new Set([...(current.hiddenGallery ?? []), mediaId])]
        : current.hiddenGallery!.filter(id => id !== mediaId);
      const visibilityRevision = (current.visibilityRevision ?? 0) + 1;
      stored.set(projectId, { ...current, hiddenGallery, visibilityRevision });
      return { visibilityRevision };
    }),
    deploy: jest.fn(async () => ({ commitSha: 'commit-all-projects' })),
  };
  const batch = new WorkbenchGalleryBatch();
  const draft = (projectId: string) => createGalleryDraft(projectId, stored.get(projectId)!);
  return { batch, transport, stored, draft };
}

describe('Workbench explicit gallery batch', () => {
  it('accumulates many changes across projects without writes, then deploys both exactly once', async () => {
    const { batch, transport, draft } = harness();
    const deck = draft('deck');
    deck.gallery = moveGalleryImage(moveGalleryImage(deck.gallery, 'a', 'c'), 'c', 'b');
    batch.setDraft(deck);
    const fence = draft('fence');
    fence.gallery = ['f', 'd', 'e'];
    batch.setDraft(fence);
    expect(transport.write).not.toHaveBeenCalled();
    expect(transport.deploy).not.toHaveBeenCalled();
    expect(await batch.stage(transport, () => {})).toEqual([]);
    expect(transport.write).toHaveBeenNthCalledWith(1, expect.objectContaining({ projectId: 'deck', baseRevision: 7, gallery: ['hidden', 'c', 'b', 'a'] }));
    expect(transport.write).toHaveBeenNthCalledWith(2, expect.objectContaining({ projectId: 'fence', baseRevision: 2, gallery: ['f', 'd', 'e'] }));
    const deployment = await batch.requestDeployment(transport, () => {});
    expect(transport.deploy).toHaveBeenCalledWith(['tx-deck-8', 'tx-fence-3']);
    expect(await batch.requestDeployment(transport, () => {})).toBe(deployment);
    expect(transport.deploy).toHaveBeenCalledTimes(1);
    await batch.verifyStored(transport);
    batch.complete();
    expect(batch.drafts.size + batch.staged.size).toBe(0);
  });

  it('retains successful receipts and failed drafts after a partial conflict, then retries only the failed project', async () => {
    const { batch, transport, draft, stored } = harness();
    batch.setDraft({ ...draft('deck'), gallery: ['c', 'a', 'hidden', 'b'] });
    batch.setDraft({ ...draft('fence'), gallery: ['f', 'e', 'd'] });
    stored.get('fence')!.currentRevision = 3;
    expect(await batch.stage(transport, () => {})).toEqual(['fence: 409 concurrent modification']);
    expect(batch.drafts.has('fence')).toBe(true);
    expect(batch.drafts.has('deck')).toBe(false);
    expect(batch.staged.get('deck')!.transactionId).toBe('tx-deck-8');
    await expect(batch.requestDeployment(transport, () => {})).rejects.toThrow('every project');
    expect(transport.deploy).not.toHaveBeenCalled();
    // The owner deliberately reopens/rebases the conflicting project.
    batch.setDraft({ ...draft('fence'), gallery: ['f', 'e', 'd'] });
    expect(await batch.stage(transport, () => {})).toEqual([]);
    expect((transport.write as jest.Mock).mock.calls.filter(([value]) => value.projectId === 'deck')).toHaveLength(1);
    await batch.requestDeployment(transport, () => {});
    expect(transport.deploy).toHaveBeenCalledWith(['tx-deck-8', 'tx-fence-4']);
  });

  it('retains the original transaction through failed readback and never restages it on retry', async () => {
    const { batch, transport, draft } = harness();
    batch.setDraft({ ...draft('deck'), gallery: ['c', 'a', 'hidden', 'b'] });
    (transport.read as jest.Mock).mockRejectedValueOnce(new Error('read temporarily unavailable'));
    expect(await batch.stage(transport, () => {})).toEqual(['deck: read temporarily unavailable']);
    expect(batch.staged.get('deck')!.transactionId).toBe('tx-deck-8');
    expect(batch.drafts.has('deck')).toBe(true);
    expect(() => batch.setDraft(draft('deck'))).toThrow('already saved');
    expect(await batch.stage(transport, () => {})).toEqual([]);
    expect(transport.write).toHaveBeenCalledTimes(1);
    expect(batch.drafts.size).toBe(0);
  });

  it('does not issue a second deployment when the first response is lost after the request', async () => {
    const { batch, transport, draft } = harness();
    batch.setDraft({ ...draft('fence'), gallery: ['f', 'e', 'd'] });
    await batch.stage(transport, () => {});
    (transport.deploy as jest.Mock).mockRejectedValueOnce(new Error('connection lost after commit'));
    await expect(batch.requestDeployment(transport, () => {})).rejects.toThrow('connection lost');
    expect(batch.deployment).toEqual({ transactionIds: ['tx-fence-3'], confirmed: false });
    expect(await batch.requestDeployment(transport, () => {})).toBe(batch.deployment);
    expect(transport.deploy).toHaveBeenCalledTimes(1);
    expect(batch.staged.size).toBe(1);
  });

  it('keeps saved receipts when canceling other drafts and blocks edits during deployment', async () => {
    const { batch, transport, draft } = harness();
    batch.setDraft({ ...draft('deck'), gallery: ['c', 'a', 'hidden', 'b'] });
    await batch.stage(transport, () => {});
    batch.setDraft({ ...draft('fence'), gallery: ['f', 'e', 'd'] });
    batch.cancelDrafts();
    expect(batch.staged.size).toBe(1);
    expect(batch.drafts.size).toBe(0);
    await batch.requestDeployment(transport, () => {});
    expect(() => batch.setDraft({ ...draft('fence'), gallery: ['f', 'e', 'd'] })).toThrow('Finish publishing');
  });

  it('permits retrying an unconfirmed request only when every original receipt is proved recoverable', async () => {
    const { batch, transport, draft } = harness();
    batch.setDraft({ ...draft('deck'), gallery: ['c', 'a', 'hidden', 'b'] });
    batch.setDraft({ ...draft('fence'), gallery: ['f', 'e', 'd'] });
    await batch.stage(transport, () => {});
    (transport.deploy as jest.Mock).mockRejectedValueOnce(new Error('lost reply'));
    await expect(batch.requestDeployment(transport, () => {})).rejects.toThrow('lost reply');
    expect(batch.recoverUnconfirmedDeployment([])).toBe(false);
    expect(batch.recoverUnconfirmedDeployment([{ transactionId: 'tx-deck-8', state: 'prepared' }])).toBe(false);
    expect(batch.recoverUnconfirmedDeployment([
      { transactionId: 'tx-deck-8', state: 'prepared' }, { transactionId: 'tx-fence-3', state: 'committed' },
    ])).toBe(false);
    expect(batch.deployment).not.toBeNull();
    expect(batch.recoverUnconfirmedDeployment([
      { transactionId: 'tx-deck-8', state: 'prepared' }, { transactionId: 'tx-fence-3', state: 'failed' },
    ])).toBe(true);
    await batch.requestDeployment(transport, () => {});
    expect(transport.deploy).toHaveBeenLastCalledWith(['tx-deck-8', 'tx-fence-3']);
    expect(transport.write).toHaveBeenCalledTimes(2);
  });

  it('queues visibility alongside order, performs no writes until Save, and verifies the same authority', async () => {
    const { batch, transport, draft, stored } = harness();
    batch.setDraft({ ...draft('deck'), gallery: ['c', 'a', 'hidden', 'b'],
      hiddenGallery: ['hidden', 'a'], visibility: { a: 'hide' } });
    expect(transport.visibility).not.toHaveBeenCalled();
    expect(await batch.stage(transport, () => {})).toEqual([]);
    expect(transport.visibility).toHaveBeenCalledWith('deck', 'a', 'hide');
    expect(stored.get('deck')!.hiddenGallery).toEqual(['hidden', 'a']);
    await batch.verifyStored(transport);
    await batch.requestDeployment(transport, () => {});
    expect(transport.deploy).toHaveBeenCalledTimes(1);
  });

  it('recovers an already-applied receipt that still has a matching pending deployment pointer', async () => {
    const { batch, transport, draft, stored } = harness();
    batch.setDraft({ ...draft('fence'), gallery: ['f', 'e', 'd'] });
    (transport.write as jest.Mock).mockImplementationOnce(async () => {
      const saved = { ...stored.get('fence')!, gallery: ['f', 'e', 'd'], currentRevision: 3,
        lastTransactionId: 'previous-tx', pendingDeployment: { gallery: ['f', 'e', 'd'], currentRevision: 3, transactionId: 'previous-tx' } };
      stored.set('fence', saved);
      return { currentRevision: 3, transactionId: 'previous-tx', staged: false };
    });
    expect(await batch.stage(transport, () => {})).toEqual([]);
    await batch.requestDeployment(transport, () => {});
    expect(transport.deploy).toHaveBeenCalledWith(['previous-tx']);
  });

  it('rejects malformed authority and refuses to clear a superseded transaction', async () => {
    const { batch, transport, draft, stored } = harness();
    expect(() => createGalleryDraft('deck', { gallery: ['a', 'a'], currentRevision: 2 })).toThrow('verified');
    expect(() => createGalleryDraft('deck', { gallery: ['a'], currentRevision: NaN })).toThrow('verified');
    batch.setDraft({ ...draft('deck'), gallery: ['c', 'a', 'hidden', 'b'] });
    await batch.stage(transport, () => {});
    stored.get('deck')!.lastTransactionId = 'someone-else';
    await expect(batch.verifyStored(transport)).rejects.toThrow('retained');
    expect(batch.staged.size).toBe(1);
  });
});
