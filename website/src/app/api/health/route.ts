import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    deploymentSha: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
  });
}