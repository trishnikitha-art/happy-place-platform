/**
 * Sharp Health Check Endpoint
 * 
 * Verifies Sharp is correctly loaded and functional in production
 * Used to validate PATCH A: deterministic Sharp runtime
 * 
 * GET /api/admin/sharp-health
 */

import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    runtime: process.env.NODE_ENV,
    environment: process.env.VERCEL_ENV || 'unknown',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    sharp: {
      loaded: false,
      version: null,
      platforms: null,
      formats: null,
      cache: null,
      concurrency: null,
      error: null as string | null
    },
    test: {
      canLoad: false,
      canResize: false,
      canConvert: false,
      error: null as string | null
    }
  };

  try {
    // Attempt to load Sharp
    const sharp = require('sharp');
    
    diagnostic.sharp.loaded = true;
    diagnostic.sharp.version = sharp.versions;
    diagnostic.sharp.platforms = sharp.platforms;
    diagnostic.sharp.formats = sharp.format;
    diagnostic.sharp.cache = sharp.cache;
    diagnostic.sharp.concurrency = sharp.concurrency;

    // Test 1: Can load Sharp
    diagnostic.test.canLoad = true;

    // Test 2: Can resize (basic operation)
    try {
      const testBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const testImage = sharp(testBuffer);
      const resized = await testImage.resize(10, 10).toBuffer();
      diagnostic.test.canResize = true;
    } catch (error) {
      diagnostic.test.canResize = false;
      diagnostic.test.error = error instanceof Error ? error.message : String(error);
    }

    // Test 3: Can convert format
    try {
      const testBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const testImage = sharp(testBuffer);
      const converted = await testImage.png().toBuffer();
      diagnostic.test.canConvert = true;
    } catch (error) {
      diagnostic.test.canConvert = false;
      if (!diagnostic.test.error) {
        diagnostic.test.error = error instanceof Error ? error.message : String(error);
      }
    }

  } catch (error) {
    diagnostic.sharp.error = error instanceof Error ? error.message : String(error);
    diagnostic.test.error = error instanceof Error ? error.message : String(error);
  }

  const status = diagnostic.sharp.loaded && diagnostic.test.canResize && diagnostic.test.canConvert ? 200 : 503;

  return NextResponse.json(diagnostic, { status });
}