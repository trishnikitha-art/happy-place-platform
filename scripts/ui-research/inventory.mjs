import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { hash } from './core.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
async function files(directory) {
  const result = [];
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(entry.name) || entry.name.startsWith('.env')) continue;
    const path = directory + '/' + entry.name;
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}
export async function inventory() {
  const groups = {};
  for (const directory of ['website/src/app', 'website/src/components', 'website/src/lib', 'website/src/automation', 'website/scripts', 'docs', 'constitution', 'photo-intake', '.github/workflows']) {
    groups[directory] = await files(directory);
  }
  const manifests = {};
  for (const name of ['media', 'projects', 'brand', 'reviews', 'strings', 'services']) {
    const path = 'website/src/config/' + name + '.v1.json', body = await readFile(resolve(root, path), 'utf8');
    const object = JSON.parse(body);
    manifests[path] = { sha256: hash(body), keys: Object.keys(object), arrays: Object.fromEntries(Object.entries(object)
      .filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])) };
  }
  const sourceFiles = Object.values(groups).flat().filter(p => /\.(tsx?|m?js|cjs|json|ya?ml)$/.test(p));
  const fileHashes = {};
  // Fingerprint code/config, not photo bytes or environment files. No private contents are retained.
  for (const path of sourceFiles) fileHashes[path] = hash(await readFile(resolve(root, path)));
  return { schema: 1, observedAt: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    routes: groups['website/src/app'].filter(p => p.endsWith('/page.tsx')),
    apis: groups['website/src/app'].filter(p => p.endsWith('/route.ts')),
    groups, manifests, fileHashes, storage: ['Git canonical manifests and docs', 'Redis/KV runtime authority', 'R2 materialized media', 'Blob legacy storage'],
    scheduler: ['GitHub Actions CI/deploy/read-only audit', 'Vercel metrics daily cron (invocation not established)'],
    researchOwner: 'docs/research/ui + GitHub issue 4', skillsBeforeThisChange: 'No project SKILL.md found',
    missingHistoricalPaths: ['photo-intake/manifest.schema.json (referenced by old AGENTS.md, absent)'] };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw Error('EXPLICIT_OUTPUT_REQUIRED');
    const output = resolve(process.argv[2]);
    if (!relative(root, output).replace(/\\/g, '/').startsWith('docs/research/ui/')) throw Error('INVENTORY_OUTPUT_NOT_ALLOWED');
    const result = await inventory();
    await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output: relative(root, output), routes: result.routes.length, apis: result.apis.length,
      files: Object.keys(result.fileHashes).length, manifests: result.manifests }));
  } catch (error) { console.error(JSON.stringify({ error: /^[A-Z_]+$/.test(error.message) ? error.message : 'INVENTORY_FAILED' })); process.exitCode = 1; }
}
