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
    // SECURITY: Never expose refresh_token to client
    // This route does NOT persist the refresh token - it only displays it for manual copy
    // The user must manually copy the refresh token to GOOGLE_REFRESH_TOKEN environment variable
    return NextResponse.json({
      ok: true,
      refresh_token_provided: !!tokens.refresh_token,
      note: "Refresh token was provided by Google. Copy it manually to GOOGLE_REFRESH_TOKEN environment variable. This route does not persist tokens automatically.",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
