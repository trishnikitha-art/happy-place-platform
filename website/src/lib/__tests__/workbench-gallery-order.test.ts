import { isGalleryOrder, moveGalleryImage, orderResolvedGallery, parseGalleryReorder } from '../workbench-gallery-order';

describe('Workbench gallery handoff', () => {
  const request = { projectId: 'deck', sourceSlotId: 'our-work-gallery::deck::a', sourceMediaId: 'a',
    targetSlotId: 'our-work-gallery::deck::c', targetMediaId: 'c' };

  it('rejects foreign project IDs, spoofed media IDs and non-string slots before queueing', () => {
    expect(parseGalleryReorder(request)).toEqual(request);
    expect(parseGalleryReorder({ ...request, targetSlotId: 'our-work-gallery::fence::c' })).toBeNull();
    expect(parseGalleryReorder({ ...request, sourceMediaId: 'different' })).toBeNull();
    expect(parseGalleryReorder({ ...request, sourceSlotId: {} })).toBeNull();
    expect(parseGalleryReorder(null)).toBeNull();
  });

  it('accumulates moves in both directions without dropping hidden media', () => {
    const base = ['a', 'hidden', 'b', 'c'];
    const first = moveGalleryImage(base, 'a', 'c');
    expect(first).toEqual(['hidden', 'b', 'c', 'a']);
    expect(moveGalleryImage(first, 'c', 'b')).toEqual(['hidden', 'c', 'b', 'a']);
    expect(base).toEqual(['a', 'hidden', 'b', 'c']);
    expect(() => moveGalleryImage(base, 'missing', 'b')).toThrow('no longer');
  });

  it('previews only resolved media, preserving unknown IDs without introducing an image', () => {
    const resolved = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(orderResolvedGallery(resolved, ['hidden', 'c', 'b', 'a', 'unresolved'])).toEqual([{ id: 'c' }, { id: 'b' }, { id: 'a' }]);
    expect(resolved.map(item => item.id)).toEqual(['a', 'b', 'c']);
    expect(isGalleryOrder(['a', 'a'])).toBe(false);
    expect(isGalleryOrder(['a', 42])).toBe(false);
  });
});
