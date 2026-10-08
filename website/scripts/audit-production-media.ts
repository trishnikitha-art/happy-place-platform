/** Read-only inventory. No repair, quarantine, initialization or Redis writes. */
import { Redis } from '@upstash/redis';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getKvNamespace } from '../src/lib/environment';
import { hasPublicMediaStructure, isPubliclyComplete } from '../src/lib/media-contracts';
import { getR2ObjectKey } from '../src/lib/r2-storage';
import type { Media } from '../src/types/media';
import projects from '../src/config/projects.v1.json';
import { writeFile } from 'node:fs/promises';

async function main() {
  const url = process.env.PRODUCTION_KV_REST_API_URL;
  const token = process.env.PRODUCTION_KV_REST_API_READ_ONLY_TOKEN;
  if (!url || !token || process.env.VERCEL_ENV !== 'production' || process.env.TEST_NAMESPACE) {
    throw new Error('Explicit production environment and dedicated read-only Redis credentials required');
  }
  const namespace = getKvNamespace();
  if (namespace !== 'hpp:production:') throw new Error('Unexpected production namespace');
  const redis = new Redis({ url, token });
  async function scan(pattern: string) {
    const found = new Set<string>();
    let cursor: number | string = 0;
    do {
      const [next, keys] = await redis.scan(cursor, { match: `${namespace}${pattern}`, count: 100 });
      cursor = next;
      keys.forEach(key => found.add(key));
    } while (String(cursor) !== '0');
    return [...found].sort();
  }
  const parse = (value: unknown): any => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return null; }
  };

  // Collect live assignments plus committed project references, without using
  // application getters that might initialize or filter authority records.
  const referenced = new Set<string>();
  const collectReferences = (value: any, field = ''): void => {
    if (typeof value === 'string' && ['mediaId', 'currentMediaId', 'gallery', 'hiddenGallery', 'hero', 'before', 'after'].includes(field)) referenced.add(value);
    else if (Array.isArray(value)) value.forEach(entry => collectReferences(entry, field));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => collectReferences(entry, key));
  };
  collectReferences(projects);
  for (const pattern of ['service-card-assignment:*', 'workbench-runtime-gallery:*', 'workbench-visibility-gallery:*']) {
    for (const key of await scan(pattern)) collectReferences(parse(await redis.get(key)));
  }

  const configured = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'].every(key => !!process.env[key]);
  const s3 = configured ? new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } }) : null;
  const records: Array<Record<string, unknown>> = [];
  for (const key of await scan('media:*')) {
    const id = key.slice(`${namespace}media:`.length);
    const media = parse(await redis.get(key)) as Media | null;
    let classification = 'ambiguous';
    let originalObject: string | number = 'not-checked';
    let complete = false;
    if (!media || media.id !== id) classification = 'ambiguous';
    else if (media.source === 'google-drive' || media.lifecycleState === 'source_reference' || id.startsWith('drive-')) classification = 'drive-reference';
    else if ((media.storage as string) === 'blob') classification = 'legacy-blob';
    else if (media.storage === 'static') {
      complete = await isPubliclyComplete(media);
      classification = complete ? 'static-evidence' : 'ambiguous';
    } else if (media.storage === 'r2') {
      const objectKey = media.variants?.original ? getR2ObjectKey(media.variants.original) : null;
      if (!s3 || !objectKey) originalObject = 'configuration-or-url-unverified';
      else {
        try {
          await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: objectKey }), { abortSignal: AbortSignal.timeout(5000) });
          originalObject = 200;
          complete = await isPubliclyComplete(media);
          classification = complete ? 'valid-r2' : 'ambiguous';
        } catch (error: any) {
          originalObject = error?.$metadata?.httpStatusCode ?? 'transport-error';
          classification = originalObject === 404 ? 'missing-r2' : 'ambiguous';
        }
      }
    }
    records.push({ id, classification, orphanCandidate: !referenced.has(id),
      lifecycleState: media?.lifecycleState ?? null, storage: media?.storage ?? null,
      structureValid: !!media && hasPublicMediaStructure(media), publiclyComplete: complete,
      originalObject, contentByteMatch: 'not-audited' });
  }
  const counts: Record<string, number> = {};
  records.forEach(record => { const key = String(record.classification); counts[key] = (counts[key] ?? 0) + 1; });
  const report = { readOnly: true, namespace, uniqueRecordCount: records.length, counts,
    orphanCandidatesAreNotDeletionProof: true, records };
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2), 'utf8');
  else console.log(JSON.stringify(report, null, 2));
}

main().catch(() => { console.error('Read-only production media inventory failed; no records changed. Check configured access and environment.'); process.exitCode = 1; });
