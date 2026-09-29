/**
 * Test Blob Store Boundary
 * 
 * Tests whether the current deployment can retrieve a known Blob object
 * to diagnose the 403 verification errors
 */

import { get, head } from '@vercel/blob';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testBlobAccess() {
  console.log('🔍 Testing Blob Store Boundary');
  console.log('='.repeat(50));
  
  // Known Blob URL from production media records
  const testBlobUrl = 'https://8zci9xnviilmi6qj.public.blob.vercel-storage.com/07c0eae184dc5a375f943a3ac2b67e95-original-07c0eae184dc.jpg';
  
  console.log('Test Blob URL:', testBlobUrl);
  
  try {
    const pkgPath = join(__dirname, '../node_modules/@vercel/blob/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    console.log('Vercel Blob version:', pkg.version);
  } catch (e) {
    console.log('Could not read @vercel/blob version');
  }
  
  // Check environment variables
  console.log('\nEnvironment check:');
  console.log('BLOB_READ_WRITE_TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'NOT SET');
  console.log('BLOB_STORE_ID:', process.env.BLOB_STORE_ID || 'NOT SET');
  
  try {
    console.log('\n--- Test 1: head() with full URL ---');
    const headResult = await head(testBlobUrl);
    console.log('head() success:', headResult);
    console.log('Head URL:', headResult.url);
    console.log('Size:', headResult.size);
    console.log('Content type:', headResult.contentType);
  } catch (error) {
    console.error('head() failed:', error.message);
    console.error('Error details:', error);
  }
  
  try {
    console.log('\n--- Test 2: get() with full URL ---');
    const getResult = await get(testBlobUrl, { access: 'public' });
    console.log('get() success:', !!getResult);
    console.log('Status code:', getResult?.statusCode);
    console.log('Has stream:', !!getResult?.stream);
  } catch (error) {
    console.error('get() failed:', error.message);
    console.error('Error details:', error);
  }
  
  try {
    console.log('\n--- Test 3: get() with pathname only ---');
    const url = new URL(testBlobUrl);
    const pathname = url.pathname;
    console.log('Pathname:', pathname);
    const getPathResult = await get(pathname, { access: 'public' });
    console.log('get(pathname) success:', !!getPathResult);
    console.log('Status code:', getPathResult?.statusCode);
  } catch (error) {
    console.error('get(pathname) failed:', error.message);
    console.error('Error details:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log('This test helps identify:');
  console.log('- Whether the Blob store is accessible');
  console.log('- Whether credentials are configured');
  console.log('- Which retrieval method works');
}

testBlobAccess().catch(console.error);
