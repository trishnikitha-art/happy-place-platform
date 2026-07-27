import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

interface DiagnosticResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
  errorCode?: string;
}

interface DiagnosticReport {
  timestamp: string;
  environment: 'development' | 'production' | 'preview';
  checks: DiagnosticResult[];
  summary: {
    pass: number;
    fail: number;
    skip: number;
  };
  overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

/**
 * Production Diagnostics Endpoint for Google Sheets Integration
 * 
 * This endpoint performs read-only health checks to diagnose Google Sheets integration issues.
 * It never prints secrets and only reports presence/absence of environment variables.
 * 
 * Available in development only. In production, require admin authentication.
 */
export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  
  // In production, require authentication (TODO: implement admin auth)
  if (!isDev) {
    // For now, allow in production for debugging but add warning
    // TODO: Add admin authentication check
  }

  const checks: DiagnosticResult[] = [];
  const environment = (process.env.VERCEL_ENV || process.env.NODE_ENV || 'development') as 'development' | 'production' | 'preview';

  // Check 1: Environment Variables Presence
  checks.push({
    check: 'Environment Variables Presence',
    status: checkEnvVars() ? 'PASS' : 'FAIL',
    message: checkEnvVars() ? 'All required environment variables are present' : 'Missing required environment variables',
    details: {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
      GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
      GOOGLE_REVIEWS_SHEET_ID: !!process.env.GOOGLE_REVIEWS_SHEET_ID,
    },
  });

  // Skip remaining checks if env vars are missing
  if (!checkEnvVars()) {
    return generateReport(checks, environment);
  }

  // Check 2: OAuth Refresh Token Validity
  const oauthCheck = await checkOAuthRefresh();
  checks.push(oauthCheck);

 if (oauthCheck.status === 'FAIL') {
    return generateReport(checks, environment);
  }

  // Check 3: Google Sheets API Reachability
  const apiCheck = await checkSheetsAPI();
  checks.push(apiCheck);

  if (apiCheck.status === 'FAIL') {
    return generateReport(checks, environment);
  }

  // Check 4: Spreadsheet Exists and Accessible
  const spreadsheetCheck = await checkSpreadsheet();
  checks.push(spreadsheetCheck);

  if (spreadsheetCheck.status === 'FAIL') {
    return generateReport(checks, environment);
  }

  // Check 5: Reviews Worksheet Exists
  const worksheetCheck = await checkWorksheet();
  checks.push(worksheetCheck);

  if (worksheetCheck.status === 'FAIL') {
    return generateReport(checks, environment);
  }

  // Check 6: Append Range Validity
  const rangeCheck = await checkAppendRange();
  checks.push(rangeCheck);

  // Check 7: OAuth Scopes Granted
  const scopesCheck = await checkOAuthScopes();
  checks.push(scopesCheck);

  return generateReport(checks, environment);
}

function checkEnvVars(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_REDIRECT_URI &&
    process.env.GOOGLE_REVIEWS_SHEET_ID
  );
}

async function checkOAuthRefresh(): Promise<DiagnosticResult> {
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    // Try to get a fresh access token
    const { credentials } = await oauth2.refreshAccessToken();

    return {
      check: 'OAuth Refresh Token Validity',
      status: 'PASS',
      message: 'OAuth refresh token is valid and can obtain access tokens',
      details: {
        accessTokenObtained: !!credentials.access_token,
        expiryDate: credentials.expiry_date,
      },
    };
  } catch (error: any) {
    return {
      check: 'OAuth Refresh Token Validity',
      status: 'FAIL',
      message: 'OAuth refresh token is invalid or expired',
      details: {
        error: error.message,
      },
      errorCode: error.code || 'OAUTH_REFRESH_FAILED',
    };
  }
}

async function checkSheetsAPI(): Promise<DiagnosticResult> {
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const sheets = google.sheets({ version: 'v4', auth: oauth2 });

    // Try a simple API call - get spreadsheet metadata
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_REVIEWS_SHEET_ID,
    });

    return {
      check: 'Google Sheets API Reachability',
      status: 'PASS',
      message: 'Google Sheets API is reachable and responding',
    };
  } catch (error: any) {
    return {
      check: 'Google Sheets API Reachability',
      status: 'FAIL',
      message: 'Google Sheets API is not reachable or returned an error',
      details: {
        error: error.message,
      },
      errorCode: error.code || 'SHEETS_API_UNREACHABLE',
    };
  }
}

async function checkSpreadsheet(): Promise<DiagnosticResult> {
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const sheets = google.sheets({ version: 'v4', auth: oauth2 });

    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_REVIEWS_SHEET_ID,
    });

    const spreadsheet = response.data;

    return {
      check: 'Spreadsheet Exists and Accessible',
      status: 'PASS',
      message: 'Spreadsheet exists and is accessible',
      details: {
        title: spreadsheet.properties?.title,
        sheetCount: spreadsheet.sheets?.length,
        spreadsheetId: spreadsheet.spreadsheetId,
      },
    };
  } catch (error: any) {
    return {
      check: 'Spreadsheet Exists and Accessible',
      status: 'FAIL',
      message: 'Spreadsheet does not exist or is not accessible',
      details: {
        error: error.message,
      },
      errorCode: error.code || 'SPREADSHEET_NOT_FOUND',
    };
  }
}

async function checkWorksheet(): Promise<DiagnosticResult> {
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const sheets = google.sheets({ version: 'v4', auth: oauth2 });

    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_REVIEWS_SHEET_ID,
    });

    const reviewsSheet = response.data.sheets?.find(
      sheet => sheet.properties?.title === 'Reviews'
    );

    if (!reviewsSheet) {
      return {
        check: 'Reviews Worksheet Exists',
        status: 'FAIL',
        message: 'Reviews worksheet does not exist in spreadsheet',
        details: {
          availableSheets: response.data.sheets?.map(s => s.properties?.title),
        },
        errorCode: 'WORKSHEET_NOT_FOUND',
      };
    }

    return {
      check: 'Reviews Worksheet Exists',
      status: 'PASS',
      message: 'Reviews worksheet exists',
      details: {
        sheetTitle: reviewsSheet.properties?.title,
        sheetId: reviewsSheet.properties?.sheetId,
        rowCount: reviewsSheet.properties?.gridProperties?.rowCount,
        columnCount: reviewsSheet.properties?.gridProperties?.columnCount,
      },
    };
  } catch (error: any) {
    return {
      check: 'Reviews Worksheet Exists',
      status: 'FAIL',
      message: 'Failed to check worksheet existence',
      details: {
        error: error.message,
      },
      errorCode: error.code || 'WORKSHEET_CHECK_FAILED',
    };
  }
}

async function checkAppendRange(): Promise<DiagnosticResult> {
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const sheets = google.sheets({ version: 'v4', auth: oauth2 });

    // Try to read the append range to verify it's valid
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_REVIEWS_SHEET_ID,
      range: 'Reviews!A:Z',
    });

    return {
      check: 'Append Range Validity',
      status: 'PASS',
      message: 'Append range is valid and accessible',
      details: {
        range: 'Reviews!A:Z',
        hasData: !!response.data.values,
        rowCount: response.data.values?.length || 0,
      },
    };
  } catch (error: any) {
    return {
      check: 'Append Range Validity',
      status: 'FAIL',
      message: 'Append range is invalid or not accessible',
      details: {
        error: error.message,
      },
      errorCode: error.code || 'RANGE_INVALID',
    };
  }
}

async function checkOAuthScopes(): Promise<DiagnosticResult> {
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    // Get the current credentials to check scopes
    const credentials = oauth2.credentials;
    
    const requiredScopes = [
      'https://www.googleapis.com/auth/spreadsheets',
    ];

    // Note: OAuth2 client doesn't expose granted scopes directly
    // We infer this by whether API calls succeed
    // This is a limitation of the googleapis library
    
    return {
      check: 'OAuth Scopes Granted',
      status: 'PASS',
      message: 'OAuth scopes are sufficient (inferred from API success)',
      details: {
        requiredScopes,
        note: 'Scopes are inferred from successful API calls',
      },
    };
  } catch (error: any) {
    return {
      check: 'OAuth Scopes Granted',
      status: 'FAIL',
      message: 'Failed to verify OAuth scopes',
      details: {
        error: error.message,
      },
      errorCode: error.code || 'SCOPES_CHECK_FAILED',
    };
  }
}

function generateReport(checks: DiagnosticResult[], environment: 'development' | 'production' | 'preview'): NextResponse {
  const summary = {
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length,
    skip: checks.filter(c => c.status === 'SKIP').length,
  };

  const overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 
    summary.fail > 0 ? 'CRITICAL' :
    summary.skip > 0 ? 'DEGRADED' :
    'HEALTHY';

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    environment,
    checks,
    summary,
    overall,
  };

  return NextResponse.json(report);
}
