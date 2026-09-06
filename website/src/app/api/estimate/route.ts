import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuth, google } from "@/lib/google";
import type { EstimateRequest } from "@/types";
import { syncEstimateSubscriber } from "@/lib/kit";
import { logEvent } from "@/lib/events";

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

async function uploadPhotoToDrive(auth: any, base64Data: string, filename: string) {
  const drive = google.drive({ version: "v3", auth });
  
  // Convert base64 to buffer
  const base64DataClean = base64Data.includes('base64,') 
    ? base64Data.split('base64,')[1] 
    : base64Data;
  const buffer = Buffer.from(base64DataClean, 'base64');
  
  const fileMetadata = {
    name: filename,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'],
  };
  
  const media = {
    mimeType: 'image/jpeg',
    body: buffer,
  };
  
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id',
  });
  
  return response.data.id;
}

async function buildMultipartEmail(req: EstimateRequest, photoIds: string[]): Promise<string> {
  const boundary = 'boundary_' + Date.now();
  const ownerEmail = process.env.ESTIMATE_TO_EMAIL ?? "taylor@happyplacecarpentry.com";
  
  let email = [
    `To: ${ownerEmail}`,
    `Subject: New Estimate Request — ${(req.services ?? []).join(", ") || "General"} (${req.customer.name})`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    buildEmailBody(req, "Happy Place Carpentry"),
  ].join('\r\n');
  
  // Add photo attachments
  for (const photoId of photoIds) {
    email += `\r\n--${boundary}\r\n`;
    email += `Content-Type: image/jpeg\r\n`;
    email += `Content-Transfer-Encoding: base64\r\n`;
    email += `Content-ID: <${photoId}>\r\n`;
    email += `X-Attachment-Id: ${photoId}\r\n`;
    email += `\r\n`;
    // Note: For actual attachment, we'd need to fetch the file from Drive and encode it
    // For now, we'll just include the Drive ID reference
    email += `[Photo stored in Google Drive: ${photoId}]\r\n`;
  }
  
  email += `\r\n--${boundary}--`;
  
  return email;
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
    
    // Upload photos to Drive if present
    const photoIds: string[] = [];
    console.log(`[API] Processing ${req.photos?.length || 0} photos`);
    if (req.photos && req.photos.length > 0) {
      const uploadPromises = req.photos
        .filter((photo): photo is { name: string; data: string; size: number; file?: File } => 
          typeof photo.name === 'string' && typeof photo.data === 'string'
        )
        .map(async (photo) => {
          try {
            console.log(`[API] Uploading photo: ${photo.name}, size: ${photo.size} bytes`);
            const fileId = await uploadPhotoToDrive(auth, photo.data, photo.name);
            console.log(`[API] Photo uploaded successfully, Drive ID: ${fileId}`);
            return fileId;
          } catch (error) {
            console.error('[API] Failed to upload photo to Drive:', error);
            return null;
          }
        });
      
      const results = await Promise.all(uploadPromises);
      results.forEach((id) => {
        if (id) photoIds.push(id);
      });
    }
    console.log(`[API] Total photos uploaded to Drive: ${photoIds.length}`);
    
    // Build email with attachments
    const emailBody = await buildMultipartEmail(req, photoIds);
    const encoded = Buffer.from(emailBody).toString("base64url");
    
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    const kitResult = await syncEstimateSubscriber({
      email: req.customer.email,
      firstName: req.customer.name.split(" ")[0],
    });

    // Log HPP event
    const url = new URL(request.url);
    await logEvent("EstimateRequested", {
      email: req.customer.email,
      name: req.customer.name,
      phone: req.customer.phone,
      services: req.services,
      property: req.property,
      photosCount: photoIds.length,
    }, {
      acquisitionSource: "estimate_wizard",
      landingPage: request.url,
      referrer: request.headers.get("referer") || undefined,
      utmSource: url.searchParams.get("utm_source") || undefined,
      utmMedium: url.searchParams.get("utm_medium") || undefined,
      utmCampaign: url.searchParams.get("utm_campaign") || undefined,
      utmContent: url.searchParams.get("utm_content") || undefined,
      utmTerm: url.searchParams.get("utm_term") || undefined,
    });

    // Drive storage + Contacts are wired here in the same server boundary.
    return NextResponse.json({
      ok: true,
      transport: "api",
      photosUploaded: photoIds.length,
      kit: {
        synchronized: kitResult.success,
        subscriberId: kitResult.subscriber?.id,
        failure: kitResult.failure,
        operation: kitResult.failedOperation,
        suppressed: kitResult.suppressed,
      },
    });
  } catch (e) {
    console.error("estimate api failed", e);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
}
