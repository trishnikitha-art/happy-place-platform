/**
 * Admin Brand Hero API Endpoint
 * 
 * Updates the homepage hero mediaId in brand.v1.json
 * 
 * POST /api/admin/brand/hero
 * Body: { mediaId: string }
 */

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mediaId } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: "mediaId is required" },
        { status: 400 }
      );
    }

    // Read brand.v1.json
    const brandPath = join(process.cwd(), "src/config/brand.v1.json");
    const brandData = JSON.parse(readFileSync(brandPath, "utf-8"));

    // Update homepageHero mediaId
    brandData.homepageHero.mediaId = mediaId;
    brandData.generatedAt = new Date().toISOString();

    // Write back
    writeFileSync(brandPath, JSON.stringify(brandData, null, 2));

    return NextResponse.json({ success: true, mediaId });
  } catch (error) {
    console.error("Error updating brand hero:", error);
    return NextResponse.json(
      { error: "Failed to update brand hero" },
      { status: 500 }
    );
  }
}
