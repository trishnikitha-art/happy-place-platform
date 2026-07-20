import { google } from "googleapis";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/**
 * SERVER-ONLY Google client (Directive 031 guardrail).
 *
 * This module MUST NOT be imported by any client component. It reads
 * GOOGLE_CLIENT_SECRET from the server environment and is only ever used inside
 * Route Handlers. The browser never sees a Google token or secret.
 *
 * Token storage: the OAuth refresh token is persisted server-side (a secret
 * store / env). For this MVP test account we read it from GOOGLE_REFRESH_TOKEN.
 * In production, store it in Vercel's encrypted env / a secret manager.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing server env ${name}`);
  return v;
}

/** Build an authenticated OAuth2 client from server env (secret never leaves server). */
export function getGoogleAuth(): OAuth2Client {
  const oauth2 = new google.auth.OAuth2(
    required("GOOGLE_CLIENT_ID"),
    required("GOOGLE_CLIENT_SECRET"),
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback",
  );
  const refresh = process.env.GOOGLE_REFRESH_TOKEN;
  if (refresh) oauth2.setCredentials({ refresh_token: refresh });
  return oauth2;
}

/** Scopes requested — least privilege (Directive 031). */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/contacts",
];

/** The OAuth consent URL the owner visits once to grant + capture a refresh token. */
export function getAuthUrl(): string {
  const oauth2 = new google.auth.OAuth2(
    required("GOOGLE_CLIENT_ID"),
    required("GOOGLE_CLIENT_SECRET"),
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback",
  );
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}

export { google };
