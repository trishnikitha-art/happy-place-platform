import { passedGalleryDragThreshold, nearestGalleryIndex, reorderVisibleGallery, mergeVisibleGalleryOrder } from "../gallery-pointer-sort";

describe("gallery pointer sorting", () => {
  const rects = ["a", "b", "c", "d"].map((id, index) => ({ id, left: 20, top: index * 110, width: 100, height: 100 }));
  it("distinguishes a click from movement across the threshold", () => {
    expect(passedGalleryDragThreshold(3, 3)).toBe(false);
    expect(passedGalleryDragThreshold(6, 0)).toBe(true);
  });
  it("finds distant targets directly without depending on intermediate events", () => {
    expect(nearestGalleryIndex(rects, 70, 380)).toBe(3);
    expect(nearestGalleryIndex(rects, 70, 50)).toBe(0);
  });
  it("moves in both directions and keeps the input intact", () => {
    const ids = rects.map(rect => rect.id);
    expect(reorderVisibleGallery(ids, 0, 3)).toEqual(["b", "c", "d", "a"]);
    expect(reorderVisibleGallery(ids, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });
  it("retains hidden and unresolved IDs in a complete order", () => {
    expect(mergeVisibleGalleryOrder(["a", "hidden", "b", "unresolved", "c"], ["c", "a", "b"]))
      .toEqual(["c", "hidden", "a", "unresolved", "b"]);
    expect(mergeVisibleGalleryOrder(["a", "hidden", "b"], ["a", "a"]))
      .toEqual(["a", "hidden", "b"]);
  });
});
