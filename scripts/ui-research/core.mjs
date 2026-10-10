import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { validateURL } from './network.mjs';

export const hash = value => createHash('sha256').update(value).digest('hex');
export function canonicalJSON(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).filter(key => value[key] !== undefined).sort()
    .map(key => JSON.stringify(key) + ':' + canonicalJSON(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const eventId = event => hash(canonicalJSON(event));
export const legacyEventId = event => hash(JSON.stringify(event));
const safeId = value => typeof value === 'string' && /^[a-z0-9-]{1,100}$/.test(value);
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
export function validateEvent(event) {
  if (!plain(event) || event.schema !== 1 || !safeId(event.runId)
    || !['started', 'observation', 'completed', 'decision'].includes(event.type)
    || !Number.isFinite(Date.parse(event.at)) || JSON.stringify(event).length > 55000) throw new Error('INVALID_EVENT');
  const allowed = {
    started: ['configHash', 'sources', 'sourceInventory', 'checkpoint', 'ping'],
    observation: ['sourceId', 'status', 'url', 'pageIndex', 'freshness', 'evidence', 'etag', 'robotsStatus', 'bytes', 'retainedEvidenceRun', 'findings', 'checkpoint', 'error', 'previousSuccessfulRun'],
    completed: ['status', 'counts', 'checkpoint', 'opportunities', 'failures', 'ping'],
    decision: ['findingId', 'versionId', 'decision', 'reviewer', 'reviewerBinding', 'reason'],
  };
  if (Object.keys(event).some(key => !['schema', 'type', 'runId', 'at', ...allowed[event.type]].includes(key))) throw new Error('UNKNOWN_EVENT_FIELD');
  if (event.type === 'observation') {
    if (!safeId(event.sourceId) || !['retrieved', 'not-modified', 'failed'].includes(event.status)) throw new Error('INVALID_OBSERVATION');
    if (event.status !== 'failed' && (!plain(event.evidence) || !/^[a-f0-9]{64}$/.test(event.evidence.contentHash)
      || typeof event.evidence.excerpt !== 'string' || event.evidence.excerpt.split(/\s+/).length > 25
      || !Array.isArray(event.findings))) throw new Error('INVALID_EVIDENCE');
    if (event.status !== 'failed' && (!/^[a-f0-9]{64}$/.test(event.evidence.normalizedHash)
      || !Array.isArray(event.evidence.observedTerms) || event.evidence.observedTerms.some(t => typeof t !== 'string' || t.length > 80)
      || (event.etag !== null && event.etag !== undefined && (typeof event.etag !== 'string' || event.etag.length > 300 || /[\r\n]/.test(event.etag)))
      || event.findings.some(f => !plain(f) || !/^[a-f0-9]{64}$/.test(f.findingId) || !/^[a-f0-9]{64}$/.test(f.versionId)))) throw new Error('INVALID_OBSERVATION_FIELDS');
  }
  if (event.type === 'decision' && (!/^[a-f0-9]{64}$/.test(event.findingId)
    || !/^[a-f0-9]{64}$/.test(event.versionId) || !['local-asserted', 'github-actor'].includes(event.reviewerBinding)
    || !['adopt', 'adapt', 'defer', 'reject'].includes(event.decision)
    || typeof event.reviewer !== 'string' || !event.reviewer || event.reviewer.length > 100
    || typeof event.reason !== 'string' || event.reason.length > 1000)) throw new Error('INVALID_DECISION');
  return event;
}

export class FileHistory {
  constructor(directory) { this.directory = resolve(directory); }
  async events() {
    await mkdir(this.directory, { recursive: true });
    const names = (await readdir(this.directory)).filter(n => /^[a-f0-9]{64}\.json$/.test(n)).sort();
    const events = [];
    for (const name of names) {
      const event = validateEvent(JSON.parse(await readFile(resolve(this.directory, name), 'utf8')));
      if (name !== eventId(event) + '.json' && name !== legacyEventId(event) + '.json') throw new Error('HISTORY_HASH_MISMATCH');
      events.push(event);
    }
    this.seen = new Set(events.map(eventId));
    return events.sort((a, b) => a.at.localeCompare(b.at) || a.runId.localeCompare(b.runId));
  }
  async append(event) {
    validateEvent(event);
    await mkdir(this.directory, { recursive: true });
    if (!this.seen) await this.events();
    if (this.seen.has(eventId(event))) return;
    if (legacyEventId(event) !== eventId(event)) {
      try { const old = JSON.parse(await readFile(resolve(this.directory, legacyEventId(event) + '.json'), 'utf8'));
        if (eventId(old) !== eventId(event)) throw new Error('HISTORY_HASH_MISMATCH');
        return;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    try { await writeFile(resolve(this.directory, eventId(event) + '.json'), JSON.stringify(event, null, 2) + '\n', { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    this.seen.add(eventId(event));
  }
}

export function validateConfig(config) {
  if (!plain(config) || config.schema !== 1 || typeof config.enabled !== 'boolean'
    || !Array.isArray(config.sources) || config.sources.length < 1 || config.sources.length > 32
    || !Array.isArray(config.hosts) || config.hosts.length > 32) throw new Error('INVALID_CONFIG');
  const limits = { maxSources: [1, 12], maxRequests: [1, 48], maxBytes: [100, 1048576],
    maxTotalBytes: [100, 12582912], timeoutMs: [100, 20000], maxRunMs: [1000, 300000], retries: [0, 2] };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max) throw new Error('INVALID_LIMIT_' + key);
  }
  const ids = new Set();
  for (const source of config.sources) {
    if (!safeId(source.id) || ids.has(source.id) || !Array.isArray(source.pages)
      || source.pages.length < 1 || source.pages.length > 2 || !Array.isArray(source.terms)
      || source.terms.length < 1 || source.terms.some(t => typeof t !== 'string' || !t || t.length > 80)
      || !plain(source.opportunity) || !Array.isArray(source.opportunity.targets)) throw new Error('INVALID_SOURCE');
    ids.add(source.id);
    source.pages.forEach(url => validateURL(url, config.hosts));
    for (const target of source.opportunity.targets) {
      if (typeof target.path !== 'string' || !target.path.startsWith('website/src/')
        || target.path.includes('..') || typeof target.anchor !== 'string' || !target.anchor) throw new Error('INVALID_TARGET');
      if (target.baselineHash !== undefined && !/^[a-f0-9]{64}$/.test(target.baselineHash)) throw new Error('INVALID_TARGET_BASELINE');
    }
    for (const value of Object.values(source.opportunity.scores ?? {})) {
      if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('INVALID_SCORE');
    }
  }
  return config;
}

export function pageText(body) {
  return body.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, m => ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[m])
    .replace(/&#(\d+);/g, (_, n) => +n <= 0x10ffff ? String.fromCodePoint(+n) : ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeEvidence(body, terms) {
  const text = pageText(body), lower = text.toLowerCase();
  const matched = terms.filter(term => lower.includes(term.toLowerCase()));
  // A small retained excerpt plus complete-response hash; never archive whole copyrighted pages, scripts, or assets.
  const index = matched.length ? lower.indexOf(matched[0].toLowerCase()) : 0;
  const excerpt = text.slice(Math.max(0, index - 40)).split(/\s+/).slice(0, 25).join(' ');
  return { contentHash: hash(body), excerpt, observedTerms: matched,
    normalizedHash: hash(text), normalization: 'normalized-document-text-v2', confidence: 'document-text-only',
    screenshot: null, interactionVerified: false, responsiveVerified: false };
}

export async function mapTargets(repoRoot, targets) {
  const root = resolve(repoRoot), result = [];
  for (const target of targets) {
    const file = resolve(root, target.path), rel = relative(root, file);
    if (rel.startsWith('..') || resolve(file) === root) throw new Error('TARGET_OUTSIDE_REPOSITORY');
    const body = await readFile(file, 'utf8');
    const index = body.indexOf(target.anchor);
    if (index < 0) throw new Error('TARGET_ANCHOR_MISSING');
    result.push({ ...target, line: body.slice(0, index).split('\n').length, contentHash: hash(body),
      driftDetected: target.baselineHash ? target.baselineHash !== hash(body) : false });
  }
  return result;
}

export function makeFinding(source, evidence, targets, previous, runId, at) {
  if (evidence.observedTerms.length < Math.min(2, source.terms.length)) return null;
  const findingId = hash(source.id + ':' + source.opportunity.id);
  const analysisHash = hash(canonicalJSON({ opportunity: source.opportunity, targets }));
  const versionId = hash(findingId + evidence.normalizedHash + analysisHash);
  const prior = previous.filter(e => e.type === 'observation').flatMap(e => e.findings ?? [])
    .filter(f => f.findingId === findingId);
  const exact = prior.find(f => f.versionId === versionId);
  if (exact) return { findingId, versionId, duplicateOf: versionId };
  const scores = source.opportunity.scores;
  const score = Math.round(20 * ((scores.usability + scores.business + scores.accessibility + scores.performance
    + scores.fit + scores.visual) / 6) - 3 * scores.effort);
  return { findingId, versionId, sourceId: source.id, sourceUrls: source.pages, runId, firstSeen: prior[0]?.firstSeen ?? at, lastSeen: at,
    priorVersion: prior.at(-1)?.versionId ?? null, category: source.category, description: source.opportunity.description,
    observation: 'Retrieved document contains: ' + evidence.observedTerms.join(', '),
    inferredBenefit: source.opportunity.benefit, targets, analysisHash, scores, score,
    accessibility: source.opportunity.accessibility, responsive: source.opportunity.responsive,
    performance: source.opportunity.performance, security: source.opportunity.security,
    comparison: source.opportunity.comparison, recommendation: targets.some(t => t.driftDetected) ? 'defer' : source.opportunity.recommendation,
    rationale: source.opportunity.rationale, validation: source.opportunity.validation,
    recommendationConfidence: targets.some(t => t.driftDetected) ? 'mapping-stale-needs-review' : 'reviewer-hypothesis',
    reviewStatus: targets.some(t => t.driftDetected) ? 'mapping-revalidation-needed' : 'pending', decision: null };
}

export async function runResearch({ config, history, fetchPage, repoRoot, resumeRunId, clock = () => new Date().toISOString() }) {
  validateConfig(config);
  if (!config.enabled) return { status: 'disabled' };
  let previous = await history.events();
  const runId = resumeRunId ?? randomUUID();
  if (!safeId(runId)) throw new Error('INVALID_RUN_ID');
  const completed = previous.find(e => e.runId === runId && e.type === 'completed');
  if (completed) return completed;
  const started = previous.find(e => e.runId === runId && e.type === 'started');
  if (resumeRunId && !started) throw new Error('UNKNOWN_RESUME_RUN');
  const last = previous.filter(e => e.type === 'completed').at(-1);
  const offset = started?.checkpoint?.sourceIndex ?? last?.checkpoint?.nextSourceIndex ?? 0;
  const selected = started?.sources ?? Array.from({ length: Math.min(config.maxSources, config.sources.length) },
    (_, i) => config.sources[(offset + i) % config.sources.length].id);
  const configHash = hash(canonicalJSON(config));
  if (started && started.configHash !== configHash) throw new Error('RESUME_CONFIG_CHANGED');
  if (!started) await history.append({ schema: 1, type: 'started', runId, at: clock(), configHash,
    sources: selected, sourceInventory: selected.map(id => { const source = config.sources.find(s => s.id === id);
      return { id, pages: source.pages, category: source.category }; }),
    checkpoint: { sourceIndex: offset }, ping: 'blocked-no-verified-contract' });
  for (const id of selected) {
    if (previous.some(e => e.runId === runId && e.type === 'observation' && e.sourceId === id)) continue;
    const source = config.sources.find(s => s.id === id);
    const allPrior = previous.filter(e => e.type === 'observation' && e.sourceId === id);
    const successful = allPrior.filter(e => e.status !== 'failed').at(-1);
    const pageIndex = ((allPrior.at(-1)?.pageIndex ?? -1) + 1) % source.pages.length;
    const url = source.pages[pageIndex];
    const prior = allPrior.filter(e => e.status !== 'failed' && e.url === url).at(-1) ?? null;
    const at = clock(); let event;
    try {
      const response = await fetchPage(url, prior);
      const evidence = response.status === 304 ? prior.evidence : normalizeEvidence(response.body, source.terms);
      const targets = await mapTargets(repoRoot, source.opportunity.targets);
      const finding = makeFinding(source, evidence, targets, previous, runId, at);
      event = { schema: 1, type: 'observation', runId, sourceId: id, at, url, pageIndex,
        status: response.status === 304 ? 'not-modified' : 'retrieved',
        freshness: response.status === 304 ? 'origin-revalidated' : 'retrieved-now',
        evidence, etag: typeof response.headers.etag === 'string' && response.headers.etag.length <= 300 && !/[\r\n]/.test(response.headers.etag)
          ? response.headers.etag : response.status === 304 ? prior?.etag ?? null : null, robotsStatus: response.robotsStatus,
        bytes: response.bytes, retainedEvidenceRun: response.status === 304 ? prior.runId : runId,
        findings: finding ? [finding] : [], checkpoint: { completedSource: id } };
    } catch (error) {
      // Error text can include attacker-controlled URLs/response bodies; only fixed error codes reach research logs.
      const code = /^[A-Z_0-9]+$/.test(error.message) ? error.message : 'FETCH_OR_MAPPING_FAILED';
      event = { schema: 1, type: 'observation', runId, sourceId: id, at, url, pageIndex,
        status: 'failed', error: code, previousSuccessfulRun: successful?.runId ?? null,
        findings: [], checkpoint: { completedSource: id } };
    }
    // Persist before moving to the next source. A failed durable write aborts, never becomes a fetch failure.
    await history.append(event); previous.push(event);
  }
  const observations = previous.filter(e => e.runId === runId && e.type === 'observation');
  const findings = observations.flatMap(e => e.findings);
  const result = { schema: 1, type: 'completed', runId, at: clock(),
    status: observations.every(e => e.status !== 'failed') ? 'success' : observations.some(e => e.status !== 'failed') ? 'partial' : 'failed',
    counts: { sources: observations.length, retrieved: observations.filter(e => e.status !== 'failed').length,
      failed: observations.filter(e => e.status === 'failed').length, newVersions: findings.filter(f => !f.duplicateOf).length,
      duplicates: findings.filter(f => f.duplicateOf).length },
    checkpoint: { nextSourceIndex: (offset + selected.length) % config.sources.length },
    opportunities: findings.filter(f => !f.duplicateOf).sort((a, b) => b.score - a.score).map(f => ({ findingId: f.findingId,
      score: f.score, description: f.description, recommendation: f.recommendation, target: f.targets[0].path })),
    failures: observations.filter(e => e.status === 'failed').map(e => ({ sourceId: e.sourceId, error: e.error })),
    ping: 'blocked-no-verified-contract' };
  await history.append(result);
  return result;
}
