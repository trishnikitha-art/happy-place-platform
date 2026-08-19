/**
 * Redis Diagnostic Endpoint
 * 
 * Tests Redis connectivity and persistence without exposing credentials.
 * Protected by Workbench authentication.
 * 
 * GET /api/admin/diagnostic/redis
 * 
 * Performs:
 * - Check environment variable presence
 * - Redis SET with diagnostic key
 * - Redis GET of diagnostic key
 * - Value comparison
 * - Redis DELETE of diagnostic key
 * 
 * Returns only safe information (no credentials, URLs, or tokens).
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { Redis } from "@upstash/redis";

export async function GET(request: Request) {
  const requestId = `redis-diag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[REDIS_DIAGNOSTIC] REQUEST_RECEIVED', { requestId });

  // TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    // Proceed without authentication
  } else {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Workbench authentication required" },
        { status: 401 }
      );
    }
  }

  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    
    const urlPresent = !!url;
    const tokenPresent = !!token;
    const host = url ? new URL(url).hostname : 'none';
    
    console.log('[REDIS_DIAGNOSTIC] ENV_CHECK', {
      requestId,
      urlPresent,
      tokenPresent,
      host,
    });
    
    if (!url || !token) {
      return NextResponse.json({
        requestId,
        urlPresent,
        tokenPresent,
        host,
        setSucceeded: false,
        getSucceeded: false,
        readbackMatches: false,
        error: 'Missing required environment variables'
      });
    }
    
    // Test Redis operations
    const diagnosticKey = `__diagnostic:redis:${requestId}`;
    const diagnosticValue = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[REDIS_DIAGNOSTIC] SET_TEST', {
      requestId,
      key: diagnosticKey,
      value: diagnosticValue,
    });
    
    const redis = new Redis({ url, token });
    
    // SET
    await redis.set(diagnosticKey, diagnosticValue);
    const setSucceeded = true;
    
    console.log('[REDIS_DIAGNOSTIC] GET_TEST', {
      requestId,
      key: diagnosticKey,
    });
    
    // GET
    const readback = await redis.get(diagnosticKey);
    const getSucceeded = readback !== null;
    const readbackMatches = readback === diagnosticValue;
    
    console.log('[REDIS_DIAGNOSTIC] COMPARISON', {
      requestId,
      writtenValue: diagnosticValue,
      readbackValue: readback,
      match: readbackMatches,
    });
    
    // DELETE
    await redis.del(diagnosticKey);
    
    console.log('[REDIS_DIAGNOSTIC] CLEANUP_SUCCESS', {
      requestId,
      key: diagnosticKey,
    });
    
    return NextResponse.json({
      requestId,
      urlPresent,
      tokenPresent,
      host,
      setSucceeded,
      getSucceeded,
      readbackMatches,
    });
    
  } catch (error) {
    console.error('[REDIS_DIAGNOSTIC] ERROR', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json({
      requestId,
      urlPresent: !!process.env.KV_REST_API_URL,
      tokenPresent: !!process.env.KV_REST_API_TOKEN,
      host: process.env.KV_REST_API_URL ? new URL(process.env.KV_REST_API_URL).hostname : 'none',
      setSucceeded: false,
      getSucceeded: false,
      readbackMatches: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
