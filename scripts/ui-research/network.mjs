import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0))
      || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
  }
  // Fail closed for IPv6, including mapped private IPv4. This public-document adapter uses IPv4 only.
  return false;
}

export function validateURL(value, hosts) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash
    || u.search || !hosts.includes(u.hostname) || isIP(u.hostname)) throw new Error('URL_NOT_ALLOWED');
  return u;
}

export async function getPublic(url, { hosts, maxBytes = 1048576, timeoutMs = 15000, headers = {} }) {
  const u = validateURL(url, hosts);
  const addresses = await Promise.race([lookup(u.hostname, { all: true, family: 4 }),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('DNS_TIMEOUT')), timeoutMs); timer.unref(); })]);
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('PRIVATE_ADDRESS');
  const address = addresses[0].address;
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const fail = error => { error.receivedBytes = bytes; reject(error); };
    const req = https.get(u, {
      headers: { 'User-Agent': 'HPPUIResearch/1.0 (+https://github.com/trishnikitha-art/happy-place-platform)',
        Accept: 'text/html,text/plain;q=0.9', 'Accept-Encoding': 'identity', ...headers },
      lookup: (_host, options, done) => options.all
        ? done(null, [{ address, family: 4 }]) : done(null, address, 4),
    }, res => {
      const chunks = [];
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > maxBytes) { res.destroy(new Error('RESPONSE_TOO_LARGE')); return; }
        chunks.push(chunk);
      });
      res.on('error', fail);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'), bytes }));
    });
    const timer = setTimeout(() => req.destroy(new Error('TIMEOUT')), timeoutMs);
    req.on('close', () => clearTimeout(timer));
    req.on('error', fail);
  });
}

export function robotsPolicy(body, path, agent = 'hppuiresearch') {
  const groups = []; let group = null;
  for (const line of body.split(/\r?\n/)) {
    const match = line.replace(/#.*/, '').trim().match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase(), value = match[2].trim();
    if (key === 'user-agent') {
      if (!group || group.rules.length || group.delay !== undefined) {
        group = { agents: [], rules: [] }; groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if (group && (key === 'allow' || key === 'disallow') && value) {
      group.rules.push({ allow: key === 'allow', path: value });
    } else if (group && key === 'crawl-delay' && /^\d+(\.\d+)?$/.test(value)) group.delay = Number(value);
  }
  const specificity = g => Math.max(-1, ...g.agents.map(a => a === '*' ? 0 : agent.includes(a) ? a.length : -1));
  const best = Math.max(0, ...groups.map(specificity));
  const applicable = groups.filter(g => specificity(g) === best);
  const rules = applicable.flatMap(g => g.rules).filter(r => {
    const escaped = r.path.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped).test(path);
  }).sort((a, b) => b.path.replace(/[\*$]/g, '').length - a.path.replace(/[\*$]/g, '').length
    || Number(b.allow) - Number(a.allow));
  return { allowed: !rules.length || rules[0].allow,
    delayMs: Math.max(1000, ...applicable.map(g => (g.delay ?? 0) * 1000)) };
}

export function createFetcher(config, request = getPublic, pause = sleep) {
  const robots = new Map(), lastRequest = new Map();
  let requests = 0, bytes = 0;
  const started = Date.now();
  const boundedRequest = async (url, headers = {}, delayMs = 1000) => {
    const host = new URL(url).hostname;
    if (Date.now() - started > config.maxRunMs || requests >= config.maxRequests) throw new Error('RUN_BUDGET_EXHAUSTED');
    if (delayMs > 10000) throw new Error('CRAWL_DELAY_EXCEEDS_BUDGET');
    await pause(Math.max(0, (lastRequest.get(host) ?? 0) + delayMs - Date.now()));
    const remaining = config.maxRunMs - (Date.now() - started);
    if (remaining <= 0 || bytes >= config.maxTotalBytes) throw new Error('RUN_BUDGET_EXHAUSTED');
    requests++; lastRequest.set(host, Date.now());
    let result;
    try {
      result = await request(url, { hosts: config.hosts, maxBytes: Math.min(config.maxBytes, config.maxTotalBytes - bytes),
        timeoutMs: Math.min(config.timeoutMs, remaining), headers });
    } catch (error) {
      bytes += error.receivedBytes ?? 0;
      if (bytes >= config.maxTotalBytes) throw new Error('BYTE_BUDGET_EXHAUSTED');
      throw error;
    }
    bytes += result.bytes ?? 0;
    if (bytes > config.maxTotalBytes) throw new Error('BYTE_BUDGET_EXHAUSTED');
    return result;
  };
  return async (url, prior) => {
    const u = validateURL(url, config.hosts);
    if (!robots.has(u.origin)) {
      const r = await boundedRequest(u.origin + '/robots.txt');
      if (r.status === 200) robots.set(u.origin, { body: r.body, status: r.status });
      else if (r.status === 404) robots.set(u.origin, { body: '', status: r.status });
      else throw new Error('ROBOTS_UNAVAILABLE_' + r.status);
    }
    const record = robots.get(u.origin), policy = robotsPolicy(record.body, u.pathname);
    if (!policy.allowed) throw new Error('ROBOTS_DISALLOW');
    let result;
    for (let attempt = 0; attempt <= config.retries; attempt++) {
      result = await boundedRequest(url, prior?.etag ? { 'If-None-Match': prior.etag } : {}, policy.delayMs);
      if (![429, 502, 503, 504].includes(result.status) || attempt === config.retries) break;
      const retry = result.headers['retry-after'];
      const delay = retry && /^\d+$/.test(retry) ? Number(retry) * 1000
        : retry && Number.isFinite(Date.parse(retry)) ? Math.max(0, Date.parse(retry) - Date.now()) : 1000 * 2 ** attempt;
      if (delay > 10000) throw new Error('RETRY_AFTER_EXCEEDS_BUDGET');
      await pause(delay);
    }
    // Never follow redirects, including redirects to private or authenticated endpoints.
    if (result.status !== 200 && !(result.status === 304 && prior)) throw new Error('HTTP_' + result.status);
    if (result.status === 200 && !/text\/(html|plain)|application\/xhtml\+xml/.test(result.headers['content-type'] ?? '')) throw new Error('CONTENT_TYPE_NOT_ALLOWED');
    return { ...result, robotsStatus: record.status };
  };
}
