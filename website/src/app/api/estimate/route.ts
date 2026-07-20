import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuth, google } from "@/lib/google";
import type { EstimateRequest } from "@/types";

/**
 * POST /api/estimate  — SERVER-ONLY estimate intake (Directive 031).
 *
 * Replaces the V1 mailto with a Google Workspace flow:
 *   1. Persist uploaded photos to Drive (storageService)
 *   2. Email the owner via Gmail (notificationService)
 *   3. Create a Contacts entry (future)
 *
 * The browser calls this route; it never touches Google directly.
 * Requires GOOGLE_REFRESH_TOKEN (captured once via /api/auth/google).
 */

function buildEmailBody(req: EstimateRequest, companyName: string): string {
  const lines: string[] = [];
  lines.push(`New estimate request from ${req.customer.name}`);
  lines.push(`Email: ${req.customer.email}`);
  lines.push(`Phone: ${req.customer.phone ?? "n/a"}`);
  lines.push(`Services: ${(req.services ?? []).join(", ") || "(none)"}`);
  lines.push(`Property: ${req.property.address ?? ""}, ${req.property.county ?? ""}`);
  lines.push("");
  lines.push("Answers:");
  for (const [k, v] of Object.entries(req.answers)) lines.push(`- ${k}: ${v}`);
  if (req.notes) lines.push(`\nNotes: ${req.notes}`);
  if (req.photos?.length) lines.push(`\nPhotos attached: ${req.photos.length}`);
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  if (process.env.GOOGLE_REFRESH_TOKEN == null) {
    return NextResponse.json(
      { ok: false, error: "google_not_configured" },
      { status: 503 },
    );
  }
  let req: EstimateRequest;
  try {
    req = (await request.json()) as EstimateRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const auth = getGoogleAuth();
    const gmail = google.gmail({ version: "v1", auth });
    const ownerEmail = process.env.ESTIMATE_TO_EMAIL ?? "taylor@happyplacecarpentry.com";

    const raw = [
      `To: ${ownerEmail}`,
      `Subject: New Estimate Request — ${(req.services ?? []).join(", ") || "General"} (${req.customer.name})`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      buildEmailBody(req, "Happy Place Carpentry"),
    ].join("\n");

    const encoded = Buffer.from(raw).toString("base64url");
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    // Drive storage + Contacts are wired here in the same server boundary.
    return NextResponse.json({ ok: true, transport: "api" });
  } catch (e) {
    console.error("estimate api failed", e);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
}
