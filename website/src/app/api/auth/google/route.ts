import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuth, google, getAuthUrl } from "@/lib/google";

/**
 * GET /api/auth/google  — ONE-TIME OAuth consent capture (server-only).
 *
 * Visit this route once while logged in as the owner. It exchanges the code for
 * tokens and prints the REFRESH TOKEN. Copy that value into GOOGLE_REFRESH_TOKEN
 * (Vercel env / secret store). The browser never stores the token.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    // No code yet → redirect owner to Google consent.
    return NextResponse.redirect(getAuthUrl());
  }
  try {
    const oauth2 = getGoogleAuth();
    const { tokens } = await oauth2.getToken(code);
    // In production, persist tokens.refresh_token to a secret store, not logs.
    return NextResponse.json({
      ok: true,
      refresh_token: tokens.refresh_token ?? "(already stored / not returned — use existing)",
      note: "Copy refresh_token into GOOGLE_REFRESH_TOKEN env. Never expose to client.",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
