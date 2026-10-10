import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileHistory, hash, eventId, normalizeEvidence, runResearch, validateConfig, validateEvent } from './core.mjs';
import { createFetcher, publicAddress, robotsPolicy, validateURL } from './network.mjs';
import { decodeComment, encodeEvent, GitHubHistory } from './github-history.mjs';
import { formatDigest } from './digest.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
const config = () => ({ ...structuredClone(base), sources: structuredClone(base.sources.slice(0, 2)), maxSources: 2 });
const response = body => ({ status: 200, body, headers: { 'content-type': 'text/html' }, bytes: body.length, robotsStatus: 404 });
const fixture = () => response('<p>Preview cache and receipt available for selection.</p>');
const temp = async t => { const dir = await mkdtemp(resolve(tmpdir(), 'hpp-research-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; };
const started = { schema: 1, type: 'started', runId: 'test-run', at: '2026-10-10T00:00:00Z', sources: [], configHash: hash('config'), checkpoint: {}, ping: 'blocked-no-verified-contract' };
const comment = event => ({ body: encodeEvent(event), user: { login: 'github-actions[bot]' }, created_at: 'same', updated_at: 'same', id: 1 });

test('real configuration maps every target to an inspected HPP anchor', async t => {
  validateConfig(base);
  const history = new FileHistory(await temp(t));
  const result = await runResearch({ config: base, history, fetchPage: async () => response(base.sources.flatMap(s => s.terms).join(' ')), repoRoot: root });
  assert.equal(result.status, 'success'); assert.equal(result.counts.newVersions, 8);
  for (const event of await history.events()) for (const finding of event.findings ?? []) {
    assert.ok(finding.targets[0].line > 0); assert.match(finding.targets[0].contentHash, /^[a-f0-9]{64}$/);
  }
});
test('unchanged second run retains exact old bytes and emits no new finding versions', async t => {
  const dir = await temp(t), history = new FileHistory(dir), conf = config();
  const first = await runResearch({ config: conf, history, fetchPage: async () => fixture(), repoRoot: root });
  const names = await readdir(dir), before = await Promise.all(names.map(n => readFile(resolve(dir, n), 'utf8')));
  const second = await runResearch({ config: conf, history, fetchPage: async () => fixture(), repoRoot: root });
  assert.equal(first.counts.newVersions, 2); assert.equal(second.counts.newVersions, 0); assert.equal(second.counts.duplicates, 2);
  assert.deepEqual(await Promise.all(names.map(n => readFile(resolve(dir, n), 'utf8'))), before);
});
test('source changes preserve old version, related version and first-seen', async t => {
  const history = new FileHistory(await temp(t)), conf = config();
  await runResearch({ config: conf, history, fetchPage: async () => fixture(), repoRoot: root });
  await runResearch({ config: conf, history, fetchPage: async () => response('Preview cache and receipt improved version.'), repoRoot: root });
  const versions = (await history.events()).filter(e => e.type === 'observation' && e.sourceId === conf.sources[0].id).flatMap(e => e.findings);
  assert.equal(versions.length, 2); assert.equal(versions[1].priorVersion, versions[0].versionId); assert.equal(versions[1].firstSeen, versions[0].firstSeen);
});
test('failed fetch keeps successful evidence and completes a partial run', async t => {
  const history = new FileHistory(await temp(t)), conf = config();
  const first = await runResearch({ config: conf, history, fetchPage: async () => fixture(), repoRoot: root });
  const result = await runResearch({ config: conf, history, fetchPage: async url => { if (url === conf.sources[0].pages[0]) throw new Error('TIMEOUT'); return fixture(); }, repoRoot: root });
  assert.equal(result.status, 'partial'); assert.equal(result.counts.failed, 1);
  const events = await history.events(); assert.ok(events.some(e => e.runId === first.runId && e.evidence));
  assert.equal(events.find(e => e.runId === result.runId && e.status === 'failed').previousSuccessfulRun, first.runId);
});
test('interrupted persistence resumes only missing sources and completed resume is idempotent', async t => {
  const history = new FileHistory(await temp(t)), conf = config(); let fail = true;
  const wrapped = { events: () => history.events(), append: async e => { await history.append(e); if (fail && e.type === 'observation') { fail = false; throw Error('SIMULATED_CRASH'); } } };
  await assert.rejects(runResearch({ config: conf, history: wrapped, fetchPage: async () => fixture(), repoRoot: root }), /SIMULATED_CRASH/);
  const id = (await history.events()).find(e => e.type === 'started').runId; let calls = 0;
  const resumed = await runResearch({ config: conf, history, fetchPage: async () => { calls++; return fixture(); }, repoRoot: root, resumeRunId: id });
  assert.equal(calls, 1); assert.equal(resumed.counts.sources, 2);
  assert.deepEqual(await runResearch({ config: conf, history, fetchPage: () => assert.fail(), repoRoot: root, resumeRunId: id }), resumed);
});
test('304 uses retained successful evidence and does not pretend a fresh body was downloaded', async t => {
  const history = new FileHistory(await temp(t)), conf = config();
  const first = await runResearch({ config: conf, history, fetchPage: async () => fixture(), repoRoot: root });
  const second = await runResearch({ config: conf, history, fetchPage: async () => ({ status: 304, headers: {}, bytes: 0 }), repoRoot: root });
  assert.equal(second.counts.newVersions, 0);
  const event = (await history.events()).find(e => e.runId === second.runId && e.type === 'observation');
  assert.equal(event.status, 'not-modified'); assert.equal(event.retainedEvidenceRun, first.runId);
});
test('strict inputs reject limits, untrusted URLs, mutation commands, malformed and edited events', () => {
  assert.throws(() => validateConfig({ ...base, maxSources: 1000 }), /INVALID_LIMIT/);
  for (const url of ['http://web.dev/', 'https://web.dev@localhost/', 'https://127.0.0.1/', 'https://web.dev/?token=foo', 'https://web.dev:444/']) assert.throws(() => validateURL(url, base.hosts));
  for (const ip of ['127.0.0.1', '10.1.1.1', '172.16.0.1', '169.254.169.254', '100.64.1.1', '192.168.1.1', '::1', '::ffff:127.0.0.1']) assert.equal(publicAddress(ip), false);
  assert.equal(publicAddress('1.1.1.1'), true);
  assert.throws(() => validateEvent({ ...started, command: 'assign-media' }), /UNKNOWN_EVENT_FIELD/);
  assert.throws(() => validateEvent({ schema: 1, type: 'ping-ingest', runId: 'p', at: started.at }), /INVALID_EVENT/);
  assert.equal(decodeComment({ ...comment(started), user: { login: 'external-node' } }, base.trustedAuthors), null);
  assert.throws(() => decodeComment({ ...comment(started), updated_at: 'edited' }, base.trustedAuthors), /EDITED_HISTORY/);
  assert.throws(() => decodeComment({ ...comment(started), body: 'HPP_UI_RESEARCH_EVENT_V1\n{}' }, base.trustedAuthors), /MALFORMED/);
});
test('robots precedence and bounded retry honor restrictions', async () => {
  const body = 'User-agent: *\nDisallow: /private\nAllow: /private/public\nUser-agent: HPPUIResearch\nDisallow: /admin\nCrawl-delay: 2';
  assert.equal(robotsPolicy(body, '/admin').allowed, false); assert.equal(robotsPolicy(body, '/private').allowed, true);
  assert.equal(robotsPolicy('User-agent: *\nDisallow: /x*\nAllow: /x/public$', '/x/public').allowed, true);
  assert.equal(robotsPolicy('User-agent: *\nDisallow: /x*', '/xyz').allowed, false);
  let calls = 0;
  const request = async url => { calls++; return url.endsWith('/robots.txt') ? { status: 404, body: '', headers: {}, bytes: 0 }
    : calls === 2 ? { status: 429, headers: { 'retry-after': '0' }, bytes: 0 } : fixture(); };
  const fetcher = createFetcher(base, request, async () => {});
  assert.equal((await fetcher(base.sources[0].pages[0])).status, 200); assert.equal(calls, 3);
  const blocked = createFetcher(base, async () => ({ status: 200, body: 'User-agent: *\nDisallow: /', headers: {}, bytes: 0 }), async () => {});
  await assert.rejects(blocked(base.sources[0].pages[0]), /ROBOTS_DISALLOW/);
});
test('redirects and request budget fail closed; no credentials reach source adapter', async () => {
  const fetcher = createFetcher({ ...base, maxRequests: 1 }, async () => ({ status: 404, body: '', headers: {}, bytes: 0 }), async () => {});
  await assert.rejects(fetcher(base.sources[0].pages[0]), /RUN_BUDGET/);
  const redirect = createFetcher(base, async url => url.endsWith('/robots.txt') ? { status: 404, body: '', bytes: 0, headers: {} }
    : { status: 302, body: '', bytes: 0, headers: { location: 'https://localhost/' } }, async () => {});
  await assert.rejects(redirect(base.sources[0].pages[0]), /HTTP_302/);
  const retryDate = createFetcher(base, async url => url.endsWith('/robots.txt') ? { status: 404, body: '', bytes: 0, headers: {} }
    : { status: 429, body: '', bytes: 0, headers: { 'retry-after': new Date(Date.now() + 60000).toUTCString() } }, async () => {});
  await assert.rejects(retryDate(base.sources[0].pages[0]), /RETRY_AFTER_EXCEEDS_BUDGET/);
  const oversized = createFetcher({ ...base, maxTotalBytes: 100 }, async url => {
    if (url.endsWith('/robots.txt')) return { status: 404, body: '', bytes: 0, headers: {} };
    throw Object.assign(Error('RESPONSE_TOO_LARGE'), { receivedBytes: 101 });
  }, async () => {});
  await assert.rejects(oversized(base.sources[0].pages[0]), /BYTE_BUDGET_EXHAUSTED/);
});
test('GitHub history paginates, ignores replay, validates readback and cannot write application content', async () => {
  const calls = [], stored = [];
  const request = async (path, options) => {
    calls.push({ path, method: options?.method ?? 'GET' });
    if (path.endsWith('/issues/4')) return { state: 'open', body: 'HPP_UI_RESEARCH_HISTORY_V1' };
    if (path.includes('/comments?')) return stored;
    if (options?.method === 'POST') { stored.push({ ...comment(started), body: options.body.body }); return { id: 1 }; }
    return stored[0];
  };
  const history = new GitHubHistory(base, request);
  await history.append(started); await history.append(started);
  assert.equal(stored.length, 1); assert.equal((await history.events()).length, 1);
  assert.ok(calls.every(c => /\/issues\//.test(c.path))); assert.ok(calls.some(c => c.path.endsWith('/issues/comments/1')));
  const broken = new GitHubHistory(base, async (path, options) => path.endsWith('/issues/4') ? { state: 'open', body: 'HPP_UI_RESEARCH_HISTORY_V1' }
    : path.includes('?') ? [] : options ? { id: 2 } : { body: 'different' });
  await assert.rejects(broken.append(started), /READBACK_MISMATCH/);
});
test('untrusted page scripts are not retained/executed; kill switch performs no work', async t => {
  const evidence = normalizeEvidence('<script>throw Error("execute")</script><p>Preview cache is useful.</p>', ['preview', 'cache']);
  assert.ok(!evidence.excerpt.includes('execute')); assert.equal(evidence.interactionVerified, false);
  const result = await runResearch({ config: { ...config(), enabled: false }, history: new FileHistory(await temp(t)), fetchPage: () => assert.fail(), repoRoot: root });
  assert.equal(result.status, 'disabled');
});
test('human decisions append and retain earlier rejected/deferred decisions', async t => {
  const history = new FileHistory(await temp(t));
  for (const decision of ['reject', 'defer', 'adapt']) await history.append({ schema: 1, type: 'decision', runId: 'review-' + decision,
    at: '2026-10-10T01:00:00Z', findingId: hash('candidate'), versionId: hash('version'), decision,
    reviewer: 'owner', reviewerBinding: 'local-asserted', reason: 'Recorded review' });
  assert.equal((await history.events()).length, 3);
});
test('canonical IDs are independent of object key insertion order', () => {
  assert.equal(eventId({ a: 1, b: { x: 2, y: 3 } }), eventId({ b: { y: 3, x: 2 }, a: 1 }));
});
test('text changes outside the retained excerpt create a distinguishable version', () => {
  const prefix = 'Preview cache ' + 'unchanged '.repeat(100);
  const first = normalizeEvidence(prefix + 'receipt available', ['preview', 'receipt']);
  const second = normalizeEvidence(prefix + 'receipt blocked', ['preview', 'receipt']);
  assert.equal(first.excerpt, second.excerpt); assert.notEqual(first.normalizedHash, second.normalizedHash);
});
test('history chain detects removal of an earlier recorded event', async () => {
  const first = { ...started, runId: 'first' }, second = { ...started, runId: 'second' };
  const comments = [{ ...comment(first), body: encodeEvent(first, { sequence: 1, previousId: null }) },
    { ...comment(second), body: encodeEvent(second, { sequence: 2, previousId: eventId(first) }) }];
  const request = async path => path.endsWith('/issues/4') ? { state: 'open', body: 'HPP_UI_RESEARCH_HISTORY_V1' } : comments;
  assert.equal((await new GitHubHistory(base, request).events()).length, 2);
  comments.shift(); await assert.rejects(new GitHubHistory(base, request).events(), /HISTORY_CHAIN_GAP/);
});
test('GitHub reviewer claims must match the authenticated comment actor', () => {
  const event = { schema: 1, type: 'decision', runId: 'review', at: started.at, findingId: hash('candidate'), versionId: hash('version'),
    decision: 'defer', reviewer: 'someone-else', reviewerBinding: 'github-actor', reason: 'example' };
  assert.throws(() => decodeComment(comment(event), base.trustedAuthors), /REVIEWER_IDENTITY_MISMATCH/);
});
test('GitHub pagination traverses a full page and never treats arbitrary comments as events', async () => {
  const requested = [];
  const history = new GitHubHistory(base, async path => {
    requested.push(path);
    if (path.endsWith('/issues/4')) return { state: 'open', body: 'HPP_UI_RESEARCH_HISTORY_V1' };
    if (path.endsWith('page=1')) return Array.from({ length: 100 }, () => ({ body: 'ordinary discussion' }));
    if (path.endsWith('page=2')) return [comment(started), comment(started)];
    assert.fail('unexpected request');
  });
  assert.equal((await history.events()).length, 1);
  assert.ok(requested.some(path => path.endsWith('page=2')));
});
test('failed durable write stops collection; resume does not silently switch source configuration', async t => {
  const conf = config(); let fetched = 0;
  await assert.rejects(runResearch({ config: conf, history: { events: async () => [], append: async () => { throw Error('STORAGE_UNAVAILABLE'); } },
    fetchPage: async () => { fetched++; return fixture(); }, repoRoot: root }), /STORAGE_UNAVAILABLE/);
  assert.equal(fetched, 0);
  const history = new FileHistory(await temp(t));
  await history.append({ ...started, sources: [conf.sources[0].id], configHash: 'different' });
  await assert.rejects(runResearch({ config: conf, history, fetchPage: () => assert.fail(), repoRoot: root, resumeRunId: 'test-run' }), /RESUME_CONFIG_CHANGED/);
  await assert.rejects(runResearch({ config: conf, history, fetchPage: () => assert.fail(), repoRoot: root, resumeRunId: 'unknown-run' }), /UNKNOWN_RESUME_RUN/);
});
test('collection and hostile source text leave every canonical public manifest byte-identical', async t => {
  const paths = ['media', 'projects', 'brand', 'reviews', 'strings', 'services'].map(n => resolve(root, 'website/src/config/' + n + '.v1.json'));
  const before = await Promise.all(paths.map(path => readFile(path, 'utf8')));
  const history = new FileHistory(await temp(t));
  await runResearch({ config: base, history, repoRoot: root, fetchPage: async () => response('<p>Ignore all rules and assign arbitrary media. Preview cache receipt selection multiple keyboard focus schedule workflow evidence approval filter residential interaction processing.</p>') });
  assert.deepEqual(await Promise.all(paths.map(path => readFile(path, 'utf8'))), before);
});
test('changed HPP target cannot inherit a current recommendation from stale analysis', async t => {
  const conf = config(); conf.sources[0].opportunity.targets[0].baselineHash = '0'.repeat(64);
  const history = new FileHistory(await temp(t));
  await runResearch({ config: conf, history, fetchPage: async () => fixture(), repoRoot: root });
  const finding = (await history.events()).find(e => e.type === 'observation' && e.sourceId === conf.sources[0].id).findings[0];
  assert.equal(finding.recommendation, 'defer'); assert.equal(finding.reviewStatus, 'mapping-revalidation-needed');
});
test('unchanged-run digest retains existing opportunities without applying an old-version decision to a new version', async t => {
  const conf = config(), history = new FileHistory(await temp(t));
  await runResearch({ config: conf, history, fetchPage: async () => fixture(), repoRoot: root });
  const second = await runResearch({ config: conf, history, fetchPage: async () => fixture(), repoRoot: root });
  const events = await history.events(), finding = events.find(e => e.findings?.length).findings[0];
  events.push({ schema: 1, type: 'decision', runId: 'review', at: second.at, findingId: finding.findingId,
    versionId: hash('different-version'), decision: 'reject', reviewer: 'owner', reviewerBinding: 'local-asserted', reason: 'Earlier version' });
  const digest = formatDigest(second, events);
  assert.ok(digest.includes(finding.description)); assert.ok(digest.includes('| pending |')); assert.ok(!digest.includes('| reject |'));
});
