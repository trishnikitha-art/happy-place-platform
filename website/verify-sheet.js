const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const spreadsheetId = process.env.GOOGLE_REVIEWS_SHEET_ID;

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
oauth2.setCredentials({ refresh_token: refreshToken });

const sheets = google.sheets({ version: 'v4', auth: oauth2 });

async function verifySheet() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Reviews!A:Z',
    });

    const rows = response.data.values || [];
    console.log('=== SHEET VERIFICATION ===\n');
    console.log('Total rows:', rows.length);
    
    if (rows.length > 0) {
      console.log('\nHeaders:');
      console.log(rows[0].slice(0, 5).join(', ') + '...');
    }
    
    if (rows.length > 1) {
      console.log('\nLatest review:');
      console.log(rows[1].slice(0, 5).join(', ') + '...');
      console.log('\n✓ Review successfully written to Google Sheet');
    } else {
      console.log('\n⚠ No reviews found in sheet (only headers)');
    }

  } catch (error) {
    console.error('Error verifying sheet:', error.message);
    if (error.code === 403) {
      console.log('\nNOTE: Google Sheets API may need to be enabled.');
    }
  }
}

verifySheet();
