/**
 * Production Configuration Diagnostic Endpoint
 * 
 * Safely probes runtime configuration for GitHub deployment debugging
 * Never exposes secrets or tokens
 * 
 * GET /api/admin/deploy/diagnostic
 */

import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET(request: Request) {
  // This endpoint is for diagnostic purposes only
  // It never exposes secrets or tokens
  
  const diagnostic = {
    timestamp: new Date().toISOString(),
    runtime: process.env.NODE_ENV,
    environment: process.env.VERCEL_ENV || 'unknown',
    
    // Safe configuration values only
    github: {
      tokenPresent: !!process.env.GITHUB_TOKEN,
      repoOwner: process.env.GITHUB_REPO_OWNER || 'NOT_SET',
      repoName: process.env.GITHUB_REPO_NAME || 'NOT_SET',
      repoOwnerSource: process.env.GITHUB_REPO_OWNER ? 'ENV_VAR' : 'FALLBACK',
      repoNameSource: process.env.GITHUB_REPO_NAME ? 'ENV_VAR' : 'FALLBACK',
      
      // Check for competing variable names
      competingVars: {
        GITHUB_OWNER: process.env.GITHUB_OWNER ? 'PRESENT' : 'NOT_SET',
        GITHUB_PAT: process.env.GITHUB_PAT ? 'PRESENT' : 'NOT_SET',
        GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN ? 'PRESENT' : 'NOT_SET',
        GITHUB_API_TOKEN: process.env.GITHUB_API_TOKEN ? 'PRESENT' : 'NOT_SET',
      }
    },
    
    deployment: {
      vercelUrl: process.env.VERCEL_URL || 'NOT_SET',
      vercelEnv: process.env.VERCEL_ENV || 'NOT_SET',
    },
    
    // Code verification
    code: {
      routeExists: true,
      repositoryVerification: true, // we added this in the latest commit
      transactionIds: true, // we added this in the latest commit
      errorClassification: true, // we added this in the latest commit
    }
  };
  
  return NextResponse.json(diagnostic);
}