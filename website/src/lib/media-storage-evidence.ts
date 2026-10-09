import { getR2PublicOrigin } from './r2-public-origin';

export type StorageProvider = 'static' | 'legacy-blob' | 'r2' | 'drive-reference' | 'unknown';
export function identifyStorageProvider(media: { source?: string; lifecycleState?: string; storage?: string;
  variants?: { original?: string } }): { provider: StorageProvider; key?: string; reason?: string } {
  if (media.source === 'google-drive' || media.lifecycleState === 'source_reference') return { provider: 'drive-reference' };
  const original = media.variants?.original;
  if (typeof original !== 'string' || !original) return { provider: 'unknown', reason: 'MISSING_ORIGINAL_URL' };
  if (original.startsWith('/images/') && !original.includes('..') && !original.includes('?') && !original.includes('#')) {
    return { provider: 'static' };
  }
  try {
    const url = new URL(original);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return { provider: 'unknown', reason: 'INVALID_PUBLIC_URL' };
    if (url.hostname.endsWith('.public.blob.vercel-storage.com') && !url.port) return { provider: 'legacy-blob' };
    const origin = getR2PublicOrigin();
    if (!origin) return { provider: 'unknown', reason: 'PUBLIC_ORIGIN_NOT_CONFIGURED' };
    if (url.origin === origin.origin && url.pathname !== '/') {
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
