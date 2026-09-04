/**
 * Standalone bootstrap execution script
 * Reads media.v1.main.json, uploads to Blob, writes to KV
 * For one-time migration from static to Blob-backed authority
 */

import { Redis } from '@upstash/redis';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Configuration
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_REST_API__KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API__KV_REST_API_TOKEN;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error('KV credentials not configured');
  process.exit(1);
}

if (!BLOB_TOKEN) {
  console.error('BLOB credentials not configured');
  process.exit(1);
}

const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

// Load media manifest
const manifestPath = join(process.cwd(), 'src/config/media.v1.main.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

console.log(`Loaded ${manifest.media.length} media records from media.v1.main.json\n`);

async function uploadToBlob(buffer, filename, contentType) {
  const response = await fetch('https://blob.vercel-storage.com', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BLOB_TOKEN}`,
      'Content-Type': contentType,
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`Blob upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return { url: data.url, uploadedAt: new Date().toISOString() };
}

async function bootstrapMedia() {
  let bootstrapped = 0;
  let skipped = 0;
  let failed = 0;
  const errors = {};

  for (const media of manifest.media) {
    try {
      // Check if already in KV
      const existing = await redis.get(`hpp:production:media:${media.id}`);
      if (existing) {
        skipped++;
        console.log(`SKIPPED: ${media.id} (already in KV)`);
        continue;
      }

      const originalUrl = media.variants?.original || '';

      // Skip Blob URLs
      if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
        console.log(`SKIPPED: ${media.id} (already has Blob URL)`);
        skipped++;
        continue;
      }

      // Read source file
      const normalizedPath = originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`;
      const sourcePath = join(process.cwd(), 'public', normalizedPath);

      if (!existsSync(sourcePath)) {
        failed++;
        errors[media.id] = `Source file not found: ${sourcePath}`;
        console.error(`FAILED: ${media.id} - ${errors[media.id]}`);
        continue;
      }

      const sourceBytes = readFileSync(sourcePath);
      const contentHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');

      console.log(`PROCESSING: ${media.id} (${media.filename})`);
      console.log(`  Content hash: ${contentHash.substring(0, 16)}...`);

      // Upload to Blob
      const originalExt = media.filename.split('.').pop() || 'webp';
      const blobUpload = await uploadToBlob(sourceBytes, `${media.id}-original.${originalExt}`, `image/${originalExt}`);
      console.log(`  Blob URL: ${blobUpload.url}`);

      // Generate thumbnail
      const image = sharp(sourceBytes);
      const thumbBuffer = await image.resize(480).webp({ quality: 70 }).toBuffer();
      const thumbUpload = await uploadToBlob(thumbBuffer, `${media.id}-thumb.webp`, 'image/webp');

      // Update media record
      const updatedMedia = {
        ...media,
        contentHash,
        variants: {
          ...media.variants,
          original: blobUpload.url,
          web: blobUpload.url,
          webp: blobUpload.url,
          thumbnail: thumbUpload.url,
        },
      };

      // Write to KV
      await redis.set(`hpp:production:media:${media.id}`, JSON.stringify(updatedMedia));
      console.log(`  Written to KV\n`);

      bootstrapped++;

    } catch (error) {
      failed++;
      errors[media.id] = error.message;
      console.error(`FAILED: ${media.id} - ${error.message}`);
    }
  }

  console.log('\n=== BOOTSTRAP COMPLETE ===');
  console.log(`Total: ${manifest.media.length}`);
  console.log(`Bootstrapped: ${bootstrapped}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nErrors:');
    console.log(errors);
  }
}

bootstrapMedia().catch(console.error);
