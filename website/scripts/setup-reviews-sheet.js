/**
 * Setup Script for Google Sheets Reviews Integration
 * 
 * This script creates a Google Sheet with the proper structure for storing reviews.
 * 
 * Usage: node scripts/setup-reviews-sheet.js
 * 
 * Required environment variables in .env.local:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REFRESH_TOKEN
 */

const { google } = require('googleapis');

// Read environment variables from .env.local
function loadEnv() {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found.');
    console.error('Please create it with your Google credentials.');
    console.error('See .env.example for the required format.');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      // Remove quotes if present
      envVars[key] = value.replace(/^["']|["']$/g, '');
    }
  });
  
  return envVars;
}

const env = loadEnv();

// Required environment variables
const REQUIRED_ENV_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(varName => !env[varName]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease configure these in your .env.local file.');
    console.error('See .env.example for the required format.');
    process.exit(1);
  }
}

function getGoogleAuth() {
  const oauth2 = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );
  
  const refresh = env.GOOGLE_REFRESH_TOKEN;
  if (refresh) {
    oauth2.setCredentials({ refresh_token: refresh });
  }
  
  return oauth2;
}

async function createReviewsSheet() {
  console.log('Creating Google Sheet for reviews...\n');
  
  validateEnv();
  
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    // Create a new spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'Happy Place Carpentry Reviews',
        },
        sheets: [
          {
            properties: {
              title: 'Reviews',
            },
          },
        ],
      },
    });
    
    const spreadsheetId = createResponse.data.spreadsheetId;
    const spreadsheetUrl = createResponse.data.spreadsheetUrl;
    
    console.log('✓ Created spreadsheet');
    console.log(`  Spreadsheet ID: ${spreadsheetId}`);
    console.log(`  URL: ${spreadsheetUrl}\n`);
    
    // Add headers to the Reviews sheet
    const headers = [
      'id',
      'provider',
      'status',
      'featured',
      'verified',
      'reviewerName',
      'reviewerInitials',
      'rating',
      'date',
      'service',
      'projectId',
      'city',
      'county',
      'title',
      'body',
      'ownerResponseAuthor',
      'ownerResponseBody',
      'ownerResponseDate',
      'googleReviewId',
      'syncStatus',
      'importedAt',
      'lastSynced',
      'originalUrl',
      'highlight',
      'featuredWeight',
      'heroEligible',
      'homepageEligible',
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Reviews!A1:AA1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });
    
    console.log('✓ Added headers to Reviews sheet');
    
    // Format the header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 27,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9,
                  },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 27,
              },
              properties: {
                pixelSize: 150,
              },
              fields: 'pixelSize',
            },
          },
        ],
      },
    });
    
    console.log('✓ Formatted header row\n');
    
    console.log('Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Add this to your .env.local file:');
    console.log(`   GOOGLE_REVIEWS_SHEET_ID=${spreadsheetId}`);
    console.log('2. Restart your development server');
    console.log('3. Test the review submission form');
    console.log('\nThe spreadsheet is accessible at:');
    console.log(spreadsheetUrl);
    
  } catch (error) {
    console.error('Failed to create spreadsheet:', error.message);
    if (error.code === 401) {
      console.error('\nAuthentication failed. Please check your Google credentials.');
      console.error('You may need to re-authorize by visiting /api/auth/google');
    } else if (error.code === 403) {
      console.error('\nPermission denied. Ensure your OAuth client has access to Google Sheets API.');
    }
    process.exit(1);
  }
}

// Run the setup
createReviewsSheet().catch(console.error);
