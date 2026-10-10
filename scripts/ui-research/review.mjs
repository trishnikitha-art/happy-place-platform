import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { FileHistory, validateEvent } from './core.mjs';
import { GitHubHistory } from './github-history.mjs';

try {
  const [backend, destination, decisionFile] = process.argv.slice(2);
  if (!['files', 'github'].includes(backend) || !destination || !decisionFile) throw Error('REVIEW_ARGUMENTS_REQUIRED');
  const config = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
  const history = backend === 'github' ? new GitHubHistory(config) : new FileHistory(destination);
  const input = JSON.parse(await readFile(decisionFile, 'utf8'));
  const event = validateEvent({ ...input, schema: 1, type: 'decision', runId: randomUUID(), at: new Date().toISOString(),
    reviewerBinding: backend === 'github' ? 'github-actor' : 'local-asserted' });
  const events = await history.events();
  if (!events.some(e => e.type === 'observation' && e.findings?.some(f => f.findingId === event.findingId
    && f.versionId === event.versionId))) throw Error('UNKNOWN_FINDING_VERSION');
  await history.append(event);
  console.log(JSON.stringify({ status: 'review-recorded', findingId: event.findingId, runId: event.runId }));
} catch (error) {
  console.error(JSON.stringify({ status: 'error', error: /^[A-Z_0-9]+$/.test(error.message) ? error.message : 'REVIEW_FAILED' }));
  process.exitCode = 1;
}
