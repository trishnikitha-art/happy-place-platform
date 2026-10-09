/** Adapted from the historical media branch. GET/SCAN/HEAD only; never repairs authority. */
import { Redis } from '@upstash/redis';
import { getKvNamespace } from '../src/lib/environment';
import { identifyStorageProvider } from '../src/lib/media-storage-evidence';
import { collectMediaReferences } from '../src/lib/media-inventory';
import { probeR2Object } from '../src/lib/r2-storage';
import projects from '../src/config/projects.v1.json';
import manifest from '../src/config/media.v1.json';
import { writeFile } from 'node:fs/promises';

async function main() {
  const url = process.env.PRODUCTION_KV_REST_API_URL;
  const token = process.env.PRODUCTION_KV_REST_API_READ_ONLY_TOKEN;
  if (!url || !token || process.env.VERCEL_ENV !== 'production' || process.env.TEST_NAMESPACE ||
      getKvNamespace() !== 'hpp:production:') {
    throw new Error('Explicit production environment and dedicated read-only Redis credentials required');
  }
  const namespace = 'hpp:production:';
  const redis = new Redis({ url, token });
  async function scan(pattern: string) {
    const found = new Set<string>();
    let cursor: number | string = 0;
    do {
      const [next, keys] = await redis.scan(cursor, { match: namespace + pattern, count: 100 });
      cursor = next;
      keys.forEach(key => found.add(key));
    } while (String(cursor) !== '0');
    return [...found].sort();
  }
  function parse(value: unknown): Record<string, unknown> | null {
    try {
      const decoded = typeof value === 'string' ? JSON.parse(value) : value;
      return decoded && typeof decoded === 'object' && !Array.isArray(decoded) ? decoded : null;
    } catch { return null; }
  }
  const references = new Map<string, Set<string>>();
  collectMediaReferences(projects, 'committed-project-catalog', references);
  for (const pattern of ['service-card-assignment:*', 'workbench-runtime-gallery:*', 'workbench-visibility-gallery:*']) {
    for (const key of await scan(pattern)) {
      collectMediaReferences(parse(await redis.get(key)), key.slice(namespace.length), references);
    }
  }
  const staticIds = new Set(manifest.media.map(media => media.id));
  const records: Array<Record<string, unknown>> = [];
  for (const key of await scan('media:*')) {
    const id = key.slice((namespace + 'media:').length);
    const media = parse(await redis.get(key));
    const variants = parse(media?.variants);
    const evidence = identifyStorageProvider({
      source: typeof media?.source === 'string' ? media.source : undefined,
      lifecycleState: typeof media?.lifecycleState === 'string' ? media.lifecycleState : undefined,
      storage: typeof media?.storage === 'string' ? media.storage : undefined,
      variants: { original: typeof variants?.original === 'string' ? variants.original : undefined },
    });
    const originalObject = evidence.provider === 'r2' && evidence.key
      ? (await probeR2Object(evidence.key)).outcome : 'NOT_CHECKED';
    records.push({ id, recordPresent: !!media, recordIdMatches: media?.id === id,
      lifecycleState: media?.lifecycleState ?? null, declaredStorage: media?.storage ?? null,
      ...evidence, originalObject, staticManifestIdentity: staticIds.has(id),
      referencedBy: [...(references.get(id) || [])].sort(), unreferencedCandidate: !references.has(id) });
  }
  const counts: Record<string, number> = {};
  records.forEach(record => {
    const category = String(record.provider) + ':' + String(record.originalObject);
    counts[category] = (counts[category] || 0) + 1;
  });
  const report = { readOnly: true, generatedAt: new Date().toISOString(), namespace,
    uniqueRecordCount: records.length, counts, records,
    verificationScope: 'All media keys plus committed project and live assignment references; R2 original HEAD only',
    publiclyComplete: 'NOT_AUDITED', persistedByteHashes: 'NOT_AUDITED', requiredRenditions: 'NOT_AUDITED',
    unreferencedCandidatesAreNotDeletionProof: true };
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2), 'utf8');
  else console.log(JSON.stringify(report, null, 2));
}
main().catch(() => {
  console.error('Read-only production media inventory failed; no authority records changed. Check environment and access.');
  process.exitCode = 1;
});
