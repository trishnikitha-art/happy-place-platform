/**
 * Independent Google Sheets Adapter Test
 * 
 * This script tests the Google Sheets adapter directly without involving
 * the website or API. This isolates whether the issue is in the adapter
 * or in the website integration.
 */

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

console.log('=== INDEPENDENT ADAPTER TEST ===\n');
console.log('Environment Variables:');
console.log('  GOOGLE_CLIENT_ID present:', !!clientId);
console.log('  GOOGLE_CLIENT_SECRET present:', !!clientSecret);
console.log('  GOOGLE_REDIRECT_URI present:', !!redirectUri);
console.log('  GOOGLE_REFRESH_TOKEN present:', !!refreshToken);
console.log('  GOOGLE_REVIEWS_SHEET_ID present:', !!spreadsheetId);
console.log('  GOOGLE_REVIEWS_SHEET_ID value:', spreadsheetId);
console.log('  Expected spreadsheet ID: 1LBJBZTJDsq4ENECEWw6rkz67frg08gFZhqGs5e9xgMw');
console.log('  Spreadsheet ID match:', spreadsheetId === '1LBJBZTJDsq4ENECEWw6rkz67frg08gFZhqGs5e9xgMw');

if (!clientId || !clientSecret || !refreshToken || !spreadsheetId) {
  console.error('\n❌ Missing required environment variables');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
oauth2.setCredentials({ refresh_token: refreshToken });

const sheets = google.sheets({ version: 'v4', auth: oauth2 });

async function testAdapter() {
  try {
    console.log('\n=== STEP 1: VERIFY SPREADSHEET ACCESS ===');
    
    // First, try to read the spreadsheet to verify we can access it
    console.log('Attempting to read spreadsheet metadata...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });
    
    console.log('✅ Spreadsheet accessible');
    console.log('  Title:', spreadsheet.data.properties.title);
    console.log('  Sheets:', spreadsheet.data.sheets.map(s => s.properties.title).join(', '));
    
    console.log('\n=== STEP 2: VERIFY SHEET STRUCTURE ===');
    
    // Check if the target sheet exists
    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    const targetSheet = 'Reviews';
    const sheetExists = sheetNames.includes(targetSheet);
    
    console.log('  Target sheet name:', targetSheet);
    console.log('  Sheet exists:', sheetExists);
    console.log('  Available sheets:', sheetNames.join(', '));
    
    if (!sheetExists) {
      console.log('\n⚠️  Target sheet does not exist. Available sheets:', sheetNames.join(', '));
      console.log('Will attempt to write to first available sheet:', sheetNames[0]);
    }
    
    console.log('\n=== STEP 3: READ EXISTING DATA ===');
    
    // Try to read existing data
    const rangeToRead = sheetExists ? `${targetSheet}!A:Z` : `${sheetNames[0]}!A:Z`;
    console.log('Reading range:', rangeToRead);
    
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: rangeToRead,
    });
    
    const rows = readResponse.data.values || [];
    console.log('✅ Data read successfully');
    console.log('  Total rows:', rows.length);
    console.log('  Headers:', rows[0] ? rows[0].slice(0, 5).join(', ') + '...' : 'No headers');
    
    console.log('\n=== STEP 4: ATTEST APPEND ===');
    
    // Create a test row
    const testRow = [
      `test-${Date.now()}`,
      'manual',
      'pending',
      'FALSE',
      'FALSE',
      'Diagnostics Test',
      'DT',
      5,
      new Date().toISOString(),
      'Test Service',
      '',
      'Test City',
      'Test County',
      'Test Title',
      'This is a diagnostic test row to verify Sheets API access',
      '',
      '',
      '',
      '',
      'manual',
      '',
      '',
      '',
      'FALSE',
      50,
      'FALSE',
      'FALSE',
    ];
    
    const rangeToWrite = sheetExists ? `${targetSheet}!A:Z` : `${sheetNames[0]}!A:Z`;
    console.log('Writing to range:', rangeToWrite);
    console.log('Row length:', testRow.length);
    
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: rangeToWrite,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [testRow],
      },
    });
    
    console.log('✅ Append successful');
    console.log('  Response status:', appendResponse.status);
    console.log('  Updates:', appendResponse.data.updates);
    
    console.log('\n=== TEST COMPLETE: SUCCESS ===');
    console.log('The Google Sheets adapter is working correctly.');
    console.log('The issue is likely in the website integration or environment.');
    
  } catch (error) {
    console.log('\n=== TEST COMPLETE: FAILURE ===');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Error status:', error.status);
    
    if (error.response) {
      console.log('\nGoogle API Response:');
      console.log('  Status:', error.response.status);
      console.log('  StatusText:', error.response.statusText);
      console.log('  Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.errors) {
      console.log('\nGoogle API Errors:');
      error.errors.forEach((err, index) => {
        console.log(`  Error ${index}:`);
        console.log('    message:', err.message);
        console.log('    domain:', err.domain);
        console.log('    reason:', err.reason);
        console.log('    extendedHelp:', err.extendedHelp);
      });
    }
    
    console.log('\n❌ The Google Sheets adapter is failing.');
    console.log('This is a Google API configuration or permission issue.');
    process.exit(1);
  }
}

testAdapter();
