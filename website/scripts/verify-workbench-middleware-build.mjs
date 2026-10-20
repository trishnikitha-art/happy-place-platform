import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const manifestPath = path.join(process.cwd(), '.next', 'server', 'functions-config-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const middleware = manifest.functions?.['/_middleware'];

assert.equal(middleware?.runtime, 'nodejs', 'Workbench middleware must use the Node.js runtime in the production build');
assert.ok(
  middleware?.matchers?.some(matcher => matcher.originalSource === '/workbench/:path*'),
  'Production middleware manifest must retain the /workbench/:path* matcher',
);

console.log('Verified production middleware runtime and Workbench matcher.');
