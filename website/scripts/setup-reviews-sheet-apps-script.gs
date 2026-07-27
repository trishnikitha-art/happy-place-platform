/**
 * Google Apps Script for Setting Up Reviews Sheet
 * 
 * INSTRUCTIONS:
 * 1. Create a new Google Sheet at https://sheets.google.com
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire script
 * 5. Click Run → setupReviewsSheet
 * 6. Authorize the script when prompted
 * 7. The sheet will be configured with the proper structure
 * 8. Copy the spreadsheet ID from the URL (the part between /d/ and /edit)
 * 9. Add it to your .env.local as GOOGLE_REVIEWS_SHEET_ID=<your-sheet-id>
 */

function setupReviewsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Rename the spreadsheet if it's still "Untitled"
  if (spreadsheet.getName() === 'Untitled spreadsheet') {
    spreadsheet.rename('Happy Place Carpentry Reviews');
  }
  
  // Get or create the Reviews sheet
  let sheet = spreadsheet.getSheetByName('Reviews');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Reviews');
  }
  
  // Clear existing content
  sheet.clear();
  
  // Define headers matching the Review model structure
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
  
  // Add headers to the first row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  
  // Format the header row
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#E8E8E8');
  headerRange.setHorizontalAlignment('center');
  
  // Set column widths
  const columnWidths = [
    200,  // id
    100,  // provider
    100,  // status
    80,   // featured
    80,   // verified
    150,  // reviewerName
    100,  // reviewerInitials
    80,   // rating
    150,  // date
    120,  // service
    150,  // projectId
    120,  // city
    120,  // county
    200,  // title
    400,  // body
    150,  // ownerResponseAuthor
    400,  // ownerResponseBody
    150,  // ownerResponseDate
    200,  // googleReviewId
    100,  // syncStatus
    150,  // importedAt
    150,  // lastSynced
    300,  // originalUrl
    80,   // highlight
    100,  // featuredWeight
    80,   // heroEligible
    100,  // homepageEligible
  ];
  
  for (let i = 0; i < columnWidths.length; i++) {
    sheet.setColumnWidth(i + 1, columnWidths[i]);
  }
  
  // Freeze the header row
  sheet.setFrozenRows(1);
  
  // Add data validation for status column
  const statusRange = sheet.getRange(2, 3, sheet.getMaxRows() - 1, 1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .setAllowValid(true, false)
    .setValues([['submitted'], ['pending'], ['approved'], ['rejected'], ['published'], ['featured'], ['archived']])
    .build();
  statusRange.setDataValidation(statusRule);
  
  // Add data validation for provider column
  const providerRange = sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1);
  const providerRule = SpreadsheetApp.newDataValidation()
    .setAllowValid(true, false)
    .setValues([['manual'], ['google'], ['crm'], ['imported'], ['form']])
    .build();
  providerRange.setDataValidation(providerRule);
  
  // Add data validation for rating column
  const ratingRange = sheet.getRange(2, 8, sheet.getMaxRows() - 1, 1);
  const ratingRule = SpreadsheetApp.newDataValidation()
    .setAllowValid(true, false)
    .setValues([['1'], ['2'], ['3'], ['4'], ['5']])
    .build();
  ratingRange.setDataValidation(ratingRule);
  
  // Protect the header row
  const protection = sheet.protect().setDescription('Header Row Protection');
  protection.removeEditors(protection.getEditors());
  protection.addEditor(spreadsheet.getOwner());
  
  // Log success message
  console.log('✓ Reviews sheet setup complete');
  console.log('✓ Headers added');
  console.log('✓ Column widths set');
  console.log('✓ Header row formatted and frozen');
  console.log('✓ Data validation added for status, provider, and rating columns');
  console.log('✓ Header row protected');
  
  // Show the spreadsheet ID
  const spreadsheetId = spreadsheet.getId();
  console.log('\nSpreadsheet ID: ' + spreadsheetId);
  console.log('Add this to your .env.local file:');
  console.log('GOOGLE_REVIEWS_SHEET_ID=' + spreadsheetId);
  
  // Show a toast notification
  SpreadsheetApp.getActive().toast('Reviews sheet setup complete! Check the console for the spreadsheet ID.', 'Setup Complete');
}

// Alternative function to just get the spreadsheet ID without modifying anything
function getSpreadsheetId() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = spreadsheet.getId();
  console.log('Spreadsheet ID: ' + spreadsheetId);
  SpreadsheetApp.getActive().toast('Spreadsheet ID: ' + spreadsheetId, 'Sheet ID');
  return spreadsheetId;
}
