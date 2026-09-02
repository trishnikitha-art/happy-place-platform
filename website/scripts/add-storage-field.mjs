/**
 * Add storage: 'static' field to all media records
 * Distinguishes static /public/images/ files from Blob-materialized assets
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const mediaPath = join(process.cwd(), 'src/config/media.v1.main.json');
const data = JSON.parse(readFileSync(mediaPath, 'utf8'));

console.log(`Processing ${data.media.length} media records...`);

let updated = 0;
for (const media of data.media) {
  if (media.lifecycleState === 'published' && media.source === 'local' && !media.storage) {
    media.storage = 'static';
    updated++;
  }
}

writeFileSync(mediaPath, JSON.stringify(data, null, 2));
console.log(`✓ Added storage: 'static' to ${updated} published local records`);
console.log(`Total media: ${data.media.length}`);
