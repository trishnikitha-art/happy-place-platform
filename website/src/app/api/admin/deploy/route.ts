/**
 * Admin Deployment Trigger API Endpoint
 * 
 * Triggers a Vercel production deployment after Workbench changes are accepted
 * 
 * POST /api/admin/deploy
 * Body: { reason?: string }
 * 
 * Requires Workbench authentication.
 * Uses Vercel Deployments API to trigger production deployment.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";

export const runtime = 'nodejs';

export async function POST(request: Request) {
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
    const body = await request.json();
    const { reason = "Workbench media changes accepted" } = body;

    console.log('[DEPLOY TRIGGER] REQUEST_RECEIVED', { reason });

    // Check for Vercel credentials
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !vercelProjectId) {
      console.log('[DEPLOY TRIGGER] MISSING_CREDENTIALS', { 
        hasToken: !!vercelToken, 
        hasProjectId: !!vercelProjectId 
      });
      return NextResponse.json(
        { 
          error: "Vercel deployment credentials not configured",
          message: "Set VERCEL_TOKEN and VERCEL_PROJECT_ID environment variables to enable automatic deployment"
        },
        { status: 503 }
      );
    }

    // Trigger Vercel production deployment using Deployments API
    const vercelApiUrl = `https://api.vercel.com/v13/deployments`;
    
    console.log('[DEPLOY TRIGGER] CALLING_VERCEL_API', { projectId: vercelProjectId });

    const vercelResponse = await fetch(vercelApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: vercelProjectId,
        target: 'production',
        metadata: {
          reason,
          triggeredBy: 'workbench',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    console.log('[DEPLOY TRIGGER] VERCEL_RESPONSE', { 
      status: vercelResponse.status,
      ok: vercelResponse.ok 
    });

    if (!vercelResponse.ok) {
      const errorText = await vercelResponse.text();
      console.error('[DEPLOY TRIGGER] VERCEL_ERROR', { 
        status: vercelResponse.status, 
        error: errorText 
      });
      return NextResponse.json(
        { 
          error: "Failed to trigger Vercel deployment",
          details: errorText
        },
        { status: vercelResponse.status }
      );
    }

    const deploymentData = await vercelResponse.json();
    
    console.log('[DEPLOY TRIGGER] SUCCESS', { 
      deploymentId: deploymentData.id,
      deploymentUrl: deploymentData.url,
      state: deploymentData.state
    });

    return NextResponse.json({ 
      success: true,
      deploymentId: deploymentData.id,
      deploymentUrl: deploymentData.url,
      state: deploymentData.state,
      message: "Production deployment triggered successfully"
    });

  } catch (error) {
    console.error('[DEPLOY TRIGGER] ERROR', error);
    return NextResponse.json(
      { 
        error: "Failed to trigger deployment",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
