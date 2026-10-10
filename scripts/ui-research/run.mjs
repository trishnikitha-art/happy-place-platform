import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { FileHistory, runResearch, validateConfig } from './core.mjs';
import { createFetcher } from './network.mjs';
import { GitHubHistory } from './github-history.mjs';
import { formatDigest } from './digest.mjs';

const args = process.argv.slice(2);
const value = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
try {
  if (args.length % 2 || args.some((arg, i) => i % 2 === 0 && !['--store', '--resume', '--backend'].includes(arg))) throw new Error('UNKNOWN_ARGUMENT');
  const config = validateConfig(JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8')));
  const backend = value('--backend') ?? 'files';
  if (!['files', 'github'].includes(backend)) throw new Error('INVALID_BACKEND');
  if (backend === 'files' && !value('--store')) throw new Error('EXPLICIT_STORE_REQUIRED');
  const directory = resolve(value('--store') ?? process.env.RUNNER_TEMP ?? '.');
  const history = backend === 'github' ? new GitHubHistory(config) : new FileHistory(directory);
  const result = await runResearch({ config, history, fetchPage: createFetcher(config), repoRoot, resumeRunId: value('--resume') });
  await mkdir(directory, { recursive: true });
  if (result.runId) {
    const digest = formatDigest(result, await history.events());
    try { await writeFile(resolve(directory, result.runId + '-digest.md'), digest, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  console.log(JSON.stringify({ runId: result.runId, status: result.status, counts: result.counts, failures: result.failures }));
  if (result.status === 'failed' || result.status === 'partial') process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ status: 'error', error: /^[A-Z_0-9]+$/.test(error.message) ? error.message : 'RESEARCH_EXECUTION_FAILED' }));
  process.exitCode = 1;
}
