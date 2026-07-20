/**
 * Google auth surface (P4 — configure now, wire later).
 * All credentials come from environment variables ONLY — never hard-coded.
 * Scopes are requested up front so later features (Sheets, Gmail, Drive,
 * Business Profile) don't require a re-consent migration.
 */
export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string; // stored securely; enables server-to-server calls
  redirectUri: string;
}

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",        // Customers/Projects/Quotes/Reviews/... sheets
  "https://www.googleapis.com/auth/gmail.send",          // estimate + review emails
  "https://www.googleapis.com/auth/drive.readonly",       // optional photo syncing
  "https://www.googleapis.com/auth/businessprofile",      // Google Business Profile (where available)
] as const;

export type GoogleService = "sheets" | "gmail" | "drive" | "businessProfile";

/** Reads config from env. Returns null if not yet configured (safe no-op). */
export function getGoogleAuthConfig(): GoogleAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return {
    clientId,
    clientSecret,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    redirectUri,
  };
}
