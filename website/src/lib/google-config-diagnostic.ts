/**
 * Google Sheets Configuration Diagnostic
 * 
 * Import this file to check Google Sheets configuration status
 * Usage: import { getGoogleConfigDiagnostic } from '@/lib/google-config-diagnostic';
 */

export function getGoogleConfigDiagnostic() {
  return {
    // Environment Variables Status
    env: {
      GOOGLE_REVIEWS_SHEET_ID: {
        present: !!process.env.GOOGLE_REVIEWS_SHEET_ID,
        value: process.env.GOOGLE_REVIEWS_SHEET_ID ? `${process.env.GOOGLE_REVIEWS_SHEET_ID.substring(0, 8)}...` : 'missing',
        expected: '1LBJBZTJDsq4ENECEWw6rkz67frg08gFZhqGs5e9xgMw',
      },
      GOOGLE_CLIENT_ID: {
        present: !!process.env.GOOGLE_CLIENT_ID,
        value: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 8)}...` : 'missing',
      },
      GOOGLE_CLIENT_SECRET: {
        present: !!process.env.GOOGLE_CLIENT_SECRET,
        value: process.env.GOOGLE_CLIENT_SECRET ? '*** present ***' : 'missing',
      },
      GOOGLE_REFRESH_TOKEN: {
        present: !!process.env.GOOGLE_REFRESH_TOKEN,
        value: process.env.GOOGLE_REFRESH_TOKEN ? '*** present ***' : 'missing',
      },
      GOOGLE_REDIRECT_URI: {
        present: !!process.env.GOOGLE_REDIRECT_URI,
        value: process.env.GOOGLE_REDIRECT_URI || 'default (localhost)',
        note: 'Should be your Vercel domain, not localhost',
      },
    },
    
    // Environment Detection
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not on Vercel',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
    },
    
    // Configuration Summary
    summary: {
      allRequiredPresent: !!(
        process.env.GOOGLE_REVIEWS_SHEET_ID &&
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REFRESH_TOKEN
      ),
      readyForSheets: !!(
        process.env.GOOGLE_REVIEWS_SHEET_ID &&
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REFRESH_TOKEN
      ),
      issues: [] as string[],
    },
  };
}

// Add issues to summary
const diagnostic = getGoogleConfigDiagnostic();
if (!diagnostic.env.GOOGLE_REVIEWS_SHEET_ID.present) {
  diagnostic.summary.issues.push('GOOGLE_REVIEWS_SHEET_ID is missing');
}
if (!diagnostic.env.GOOGLE_CLIENT_ID.present) {
  diagnostic.summary.issues.push('GOOGLE_CLIENT_ID is missing');
}
if (!diagnostic.env.GOOGLE_CLIENT_SECRET.present) {
  diagnostic.summary.issues.push('GOOGLE_CLIENT_SECRET is missing');
}
if (!diagnostic.env.GOOGLE_REFRESH_TOKEN.present) {
  diagnostic.summary.issues.push('GOOGLE_REFRESH_TOKEN is missing');
}
if (diagnostic.env.GOOGLE_REDIRECT_URI.value?.includes('localhost')) {
  diagnostic.summary.issues.push('GOOGLE_REDIRECT_URI is set to localhost - should be Vercel domain');
}
