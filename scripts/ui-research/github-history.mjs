import { eventId, legacyEventId, validateEvent } from './core.mjs';
import { sleep } from './network.mjs';

export const marker = 'HPP_UI_RESEARCH_EVENT_V1';
export function encodeEvent(event, chain = {}) {
  validateEvent(event);
  return marker + '\n\n```json\n' + JSON.stringify({ id: eventId(event), ...chain, event }, null, 2) + '\n```';
}
export function decodeComment(comment, trustedAuthors) {
  return decodeEnvelope(comment, trustedAuthors)?.event ?? null;
}
export function decodeEnvelope(comment, trustedAuthors) {
  if (typeof comment.body !== 'string' || !comment.body.startsWith(marker)) return null;
  if (!trustedAuthors.includes(comment.user?.login)) return null;
  if (comment.updated_at !== comment.created_at) throw new Error('EDITED_HISTORY_EVENT');
  if (comment.body.length > 60000) throw new Error('HISTORY_EVENT_TOO_LARGE');
  const match = comment.body.match(/^HPP_UI_RESEARCH_EVENT_V1\n\n```json\n([\s\S]+)\n```$/);
  if (!match) throw new Error('MALFORMED_HISTORY_EVENT');
  const record = JSON.parse(match[1]);
  validateEvent(record.event);
  if (record.id !== eventId(record.event) && record.id !== legacyEventId(record.event)) throw new Error('HISTORY_HASH_MISMATCH');
  if (record.event.type === 'decision' && (record.event.reviewerBinding !== 'github-actor'
    || record.event.reviewer !== comment.user.login)) throw new Error('REVIEWER_IDENTITY_MISMATCH');
  return record;
}

export async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_AUTH_REQUIRED');
  // Token goes only to fixed GitHub API origin. Redirects cannot forward authentication.
  let response;
  const method = options.method ?? 'GET';
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await fetch('https://api.github.com' + path, { method, redirect: 'error',
    signal: AbortSignal.timeout(15000), headers: { Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json', 'User-Agent': 'HPPUIResearch' },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    if (response.ok) break;
    const retry = response.headers.get('retry-after');
    const limited = response.status === 429 || (response.status === 403 && (retry || response.headers.get('x-ratelimit-remaining') === '0'));
    const delay = retry && /^\d+$/.test(retry) ? Number(retry) * 1000
      : retry && Number.isFinite(Date.parse(retry)) ? Math.max(0, Date.parse(retry) - Date.now())
        : limited && response.headers.get('x-ratelimit-reset') ? Math.max(0, Number(response.headers.get('x-ratelimit-reset')) * 1000 - Date.now()) : 1000;
    if (limited && delay > 10000) { await response.body?.cancel(); throw new Error('GITHUB_RATE_LIMIT_EXCEEDS_BUDGET'); }
    if (method !== 'GET' || attempt || !(limited || response.status >= 500)) break;
    await response.body?.cancel(); await sleep(Math.min(10000, delay));
  }
  if (!response.ok) { await response.body?.cancel(); throw new Error('GITHUB_HTTP_' + response.status); }
  const reader = response.body.getReader(), chunks = []; let length = 0;
  while (true) {
    const result = await reader.read(); if (result.done) break;
    length += result.value.length;
    if (length > 8000000) { await reader.cancel(); throw new Error('GITHUB_RESPONSE_TOO_LARGE'); }
    chunks.push(Buffer.from(result.value));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export class GitHubHistory {
  constructor(config, request = githubRequest) {
    const issue = config.historyIssue;
    if (config.repository !== 'trishnikitha-art/happy-place-platform'
      || !Number.isSafeInteger(issue) || issue < 1) throw new Error('HISTORY_ISSUE_REQUIRED');
    this.path = '/repos/' + config.repository + '/issues/' + issue;
    this.authors = config.trustedAuthors; this.request = request; this.cache = null; this.tip = null; this.sequence = 0;
  }
  async events() {
    if (this.cache) return [...this.cache];
    const issue = await this.request(this.path);
    if (issue.state !== 'open' || issue.pull_request || !issue.body?.includes('HPP_UI_RESEARCH_HISTORY_V1')) throw new Error('HISTORY_ISSUE_DISABLED_OR_INVALID');
    const events = [], seen = new Set(); let chained = false, tip = null;
    for (let page = 1; page <= 50; page++) {
      const comments = await this.request(this.path + '/comments?per_page=100&page=' + page);
      if (!Array.isArray(comments)) throw new Error('INVALID_GITHUB_RESPONSE');
      for (const comment of comments) {
        const record = decodeEnvelope(comment, this.authors);
        if (!record) continue;
        const event = record.event;
        if (record.sequence !== undefined) {
          if (record.sequence !== events.length + 1 || record.previousId !== tip) throw new Error('HISTORY_CHAIN_GAP');
          chained = true;
        } else if (chained) throw new Error('HISTORY_CHAIN_REQUIRED');
        if (!seen.has(eventId(event))) { seen.add(eventId(event)); events.push(event); tip = eventId(event); }
      }
      if (comments.length < 100) { this.tip = tip; this.sequence = events.length;
        this.cache = events.sort((a, b) => a.at.localeCompare(b.at) || a.runId.localeCompare(b.runId)); return [...this.cache]; }
    }
    throw new Error('HISTORY_PAGINATION_LIMIT');
  }
  async append(event) {
    validateEvent(event);
    if ((await this.events()).some(e => eventId(e) === eventId(event))) return;
    if (event.type === 'decision') {
      const actor = await this.request('/user');
      if (actor.login !== event.reviewer || event.reviewerBinding !== 'github-actor') throw new Error('REVIEWER_IDENTITY_MISMATCH');
    }
    const body = encodeEvent(event, { sequence: this.sequence + 1, previousId: this.tip });
    const posted = await this.request(this.path + '/comments', { method: 'POST', body: { body } });
    // Read persisted bytes, rather than declaring success because POST returned.
    if (!Number.isSafeInteger(posted.id)) throw new Error('INVALID_GITHUB_RECEIPT');
    const readback = await this.request('/repos/trishnikitha-art/happy-place-platform/issues/comments/' + posted.id);
    if (readback.body !== body || !decodeComment(readback, this.authors)) throw new Error('GITHUB_READBACK_MISMATCH');
    this.cache.push(event); this.sequence++; this.tip = eventId(event);
  }
}
