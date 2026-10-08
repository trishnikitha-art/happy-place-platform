import { parseDropJson, readGalleryReorder, readWorkbenchAsset } from '@/lib/workbench-drop-protocol';

const asset = { source: 'local', assetId: 'photo', iframeGeneration: 7 };
const drive = { source: 'google-drive', fileId: 'file', fileName: 'Photo.jpg', mimeType: 'image/jpeg', iframeGeneration: 7 };
const target = { projectId: 'project', mediaId: 'target', slotId: 'our-work-gallery::project::target', generation: 7 };
const reorder = { type: 'GALLERY_REORDER', projectId: 'project', sourceMediaId: 'source', sourceSlotId: 'our-work-gallery::project::source', iframeGeneration: 7 };

it.each([asset, drive])('accepts the complete current-generation asset payload', payload => {
  expect(readWorkbenchAsset(payload, 7)).toEqual(payload);
});

it.each([null, [], 'photo', {}, { ...asset, assetId: ' ' }, { ...asset, assetId: 'drive-file' },
  { ...asset, source: 'unknown' }, { ...asset, iframeGeneration: 6 }, { ...asset, iframeGeneration: undefined },
  { ...drive, fileId: null }, { ...drive, fileName: '' }, { ...drive, mimeType: undefined },
  { ...drive, mimeType: 'text/html' }])('rejects malformed or stale asset payload %#', payload => {
  expect(readWorkbenchAsset(payload, 7)).toBeNull();
});

it('rejects an operation before the parent initializes a generation', () => {
  expect(readWorkbenchAsset(asset, null)).toBeNull();
  expect(readGalleryReorder(reorder, { ...target, generation: null })).toBeNull();
});

it('never turns malformed JSON or a raw string into an asset ID', () => {
  expect(parseDropJson('{')).toBeNull();
  expect(readWorkbenchAsset(parseDropJson('photo'), 7)).toBeNull();
  expect(readWorkbenchAsset(parseDropJson('"photo"'), 7)).toBeNull();
});

it('accepts only a distinct same-project reorder with matching source and target slots', () => {
  expect(readGalleryReorder(reorder, target)).toEqual(reorder);
});

it.each([{ ...reorder, projectId: 'other' }, { ...reorder, type: 'ASSET_ASSIGNMENT' },
  { ...reorder, sourceMediaId: 'target', sourceSlotId: target.slotId },
  { ...reorder, sourceSlotId: 'our-work-gallery::other::source' },
  { ...reorder, iframeGeneration: 6 }, { ...reorder, sourceMediaId: null }])('rejects invalid reorder %#', payload => {
  expect(readGalleryReorder(payload, target)).toBeNull();
});
