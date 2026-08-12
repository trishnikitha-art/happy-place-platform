/**
 * Admin Brand Portrait API Endpoint
 * 
 * Updates the owner portrait mediaId in brand.v1.json
 * 
 * POST /api/admin/brand/portrait
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

    // Update ownerPortrait mediaId
    brandData.ownerPortrait.mediaId = mediaId;
    brandData.generatedAt = new Date().toISOString();

    // Write back
    writeFileSync(brandPath, JSON.stringify(brandData, null, 2));

    return NextResponse.json({ success: true, mediaId });
  } catch (error) {
    console.error("Error updating brand portrait:", error);
    return NextResponse.json(
      { error: "Failed to update brand portrait" },
      { status: 500 }
    );
  }
}
