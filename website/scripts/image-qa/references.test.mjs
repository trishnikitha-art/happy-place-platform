import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectImageReferences, isBlockingViolation } from './references.mjs';

test('reads JSON media variants, including original/avif and nested responsive assets', () => {
  const refs = collectImageReferences({ media: [{ variants: { original: '/images/a.jpg', avif: '/images/a.avif',
    responsive: ['/images/a-320.webp', '/images/a.jpg'] } }], logo: '/brand/logo.svg' });
  assert.deepEqual([...refs], ['/images/a.jpg', '/images/a.avif', '/images/a-320.webp', '/brand/logo.svg']);
});
test('excludes remote images, routes and non-image strings from filesystem checks', () => {
  assert.equal(collectImageReferences(['https://example.test/a.jpg', '/services/a', 'a.jpg', null]).size, 0);
});
test('explicit warnings stay visible but errors and unknown severities block release', () => {
  assert.equal(isBlockingViolation({ severity: 'warning' }), false);
  assert.equal(isBlockingViolation({ severity: 'error' }), true);
  assert.equal(isBlockingViolation({}), true);
});
