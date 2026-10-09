import type { Media } from '@/types/media';

/** The public delivery origin is configuration, never the R2 S3 API endpoint. */
export function getR2PublicOrigin(value = process.env.R2_PUBLIC_BASE_URL): URL | null {
  if (!value) return null;
  const origin = new URL(value);
  if (origin.protocol !== 'https:' || origin.username || origin.password ||
      origin.port || origin.pathname !== '/' || origin.search || origin.hash ||
      origin.hostname.includes('*') || origin.hostname === 'cloudflarestorage.com' ||
      origin.hostname.endsWith('.cloudflarestorage.com')) {
    throw new Error('R2_PUBLIC_BASE_URL must be a dedicated HTTPS public origin');
  }
  return origin;
}

/** Extract only the flat content-addressed keys produced by uploadToR2. */
function renditionKey(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !/^\/[a-f0-9]{64}-original\.[a-z0-9]+$/.test(url.pathname)) {
    throw new Error('Invalid content-addressed R2 rendition');
  }
  return url.pathname.slice(1);
}

/**
 * Presentation only. Call after the authoritative public materialization gate.
 * Physical proof uses the existing bucket keys, not the URL's historical host.
 * Neither this projection nor an origin change writes media or assignments.
 */
export function projectVerifiedR2Media(media: Media): Media {
  const origin = getR2PublicOrigin();
  if (!origin || media.storage !== 'r2' || media.lifecycleState !== 'published' ||
      media.source !== 'local' || media.drive || media.id.startsWith('drive-') ||
      !media.contentHash || !media.variants?.original) {
    throw new Error('R2 presentation requires a published asset and public origin');
  }
  const originalKey = renditionKey(media.variants.original);
  if (!originalKey.startsWith(`${media.contentHash}-original.`)) {
    throw new Error('R2 original key does not match the materialized source hash');
  }

  const variants = { ...media.variants };
  for (const name of ['original', 'web', 'webp', 'avif', 'thumbnail', 'blur'] as const) {
    const value = variants[name];
    if (value) variants[name] = new URL(renditionKey(value), origin).href;
  }
  variants.responsive = media.variants.responsive?.map(entry => ({
    ...entry,
    webp: new URL(renditionKey(entry.webp), origin).href,
    avif: new URL(renditionKey(entry.avif), origin).href,
  }));
  return { ...media, variants };
}
