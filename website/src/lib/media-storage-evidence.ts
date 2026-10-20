import { getR2PublicOrigin } from './r2-public-origin';

export type StorageProvider = 'static' | 'legacy-blob' | 'r2' | 'drive-reference' | 'unknown';

const VERCEL_BLOB_HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.public\.blob\.vercel-storage\.com$/i;

/**
 * Accept only canonical public Vercel Blob URLs. This is also the boundary
 * used before any network probe so a media record cannot turn verification
 * into an arbitrary URL fetch.
 */
export function isAllowedVercelBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        url.search || url.hash || !VERCEL_BLOB_HOST.test(url.hostname) || url.pathname === '/') {
      return false;
    }

    const path = decodeURIComponent(url.pathname);
    return !path.includes('\\') && !/[\u0000-\u001f\u007f]/.test(path) &&
      !path.split('/').some(segment => segment === '.' || segment === '..');
  } catch {
    return false;
  }
}

/** Legacy Blob upload keys include the first 12 characters of the source SHA-256. */
export function legacyBlobOriginalMatchesHash(originalUrl: string, contentHash: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(contentHash) || !isAllowedVercelBlobUrl(originalUrl)) return false;
  try {
    const pathname = decodeURIComponent(new URL(originalUrl).pathname);
    const filename = pathname.slice(pathname.lastIndexOf('/') + 1);
    return filename.includes(`-${contentHash.slice(0, 12)}.`);
  } catch {
    return false;
  }
}

/** Return the complete physical URL set for a well-shaped legacy Blob record. */
export function getLegacyBlobRenditionUrls(variants?: {
  original?: string;
  thumbnail?: string;
  webp?: string;
  avif?: string;
  web?: string;
  blur?: string;
  responsive?: Array<{ webp?: string; avif?: string }>;
}): string[] | null {
  if (!variants?.original || !variants.thumbnail || !variants.webp || !variants.blur || !Array.isArray(variants.responsive)) return null;
  if (variants.responsive.some(entry => !entry?.webp || !entry?.avif)) return null;
  const inlineBlur = /^data:image\/(?:avif|jpeg|png|webp);base64,[A-Za-z0-9+/]*={0,2}$/i.test(variants.blur);
  const remoteBlur = isAllowedVercelBlobUrl(variants.blur);
  if (!inlineBlur && !remoteBlur) return null;
  const urls = [...new Set([
    variants.original,
    variants.thumbnail,
    variants.webp,
    ...(remoteBlur ? [variants.blur] : []),
    ...(variants.avif ? [variants.avif] : []),
    ...(variants.web ? [variants.web] : []),
    ...variants.responsive.flatMap(entry => [entry.webp!, entry.avif!]),
  ])];
  return urls.every(isAllowedVercelBlobUrl) ? urls : null;
}

export function identifyStorageProvider(media: { source?: string; lifecycleState?: string; storage?: string;
  variants?: { original?: string } }): { provider: StorageProvider; key?: string; reason?: string } {
  if (media.source === 'google-drive' || media.lifecycleState === 'source_reference') return { provider: 'drive-reference' };
  const original = media.variants?.original;
  if (typeof original !== 'string' || !original) return { provider: 'unknown', reason: 'MISSING_ORIGINAL_URL' };
  if (original.startsWith('/images/') && !original.includes('..') && !original.includes('?') && !original.includes('#')) {
    if (media.storage && media.storage !== 'static') return { provider: 'unknown', reason: 'STORAGE_URL_MISMATCH' };
    return { provider: 'static' };
  }
  try {
    const url = new URL(original);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return { provider: 'unknown', reason: 'INVALID_PUBLIC_URL' };
    if (isAllowedVercelBlobUrl(original)) {
      if (media.storage && media.storage !== 'blob') return { provider: 'unknown', reason: 'STORAGE_URL_MISMATCH' };
      return { provider: 'legacy-blob' };
    }
    const origin = getR2PublicOrigin();
    if (!origin) return { provider: 'unknown', reason: 'PUBLIC_ORIGIN_NOT_CONFIGURED' };
    if (url.origin === origin.origin && url.pathname !== '/') {
      if (media.storage && media.storage !== 'r2') return { provider: 'unknown', reason: 'STORAGE_URL_MISMATCH' };
      return { provider: 'r2', key: decodeURIComponent(url.pathname.slice(1)) };
    }
    return { provider: 'unknown', reason: 'UNRECOGNIZED_PUBLIC_ORIGIN' };
  } catch { return { provider: 'unknown', reason: 'INVALID_URL_OR_ORIGIN_CONFIGURATION' }; }
}

export type R2ObjectProbe = { outcome: 'EXISTS' | 'NOT_FOUND' | 'AUTH_FAILURE' | 'NOT_CONFIGURED' | 'TRANSPORT_ERROR' | 'INVALID_KEY' };
export function classifyR2ProbeError(error: unknown): R2ObjectProbe {
  const failure = error as { name?: string; $metadata?: { httpStatusCode?: number } } | null;
  const status = failure?.$metadata?.httpStatusCode;
  if (status === 404 || failure?.name === 'NotFound' || failure?.name === 'NoSuchKey') return { outcome: 'NOT_FOUND' };
  if (status === 401 || status === 403 || failure?.name === 'AccessDenied' ||
      failure?.name === 'InvalidAccessKeyId' || failure?.name === 'SignatureDoesNotMatch') return { outcome: 'AUTH_FAILURE' };
  return { outcome: 'TRANSPORT_ERROR' };
}
