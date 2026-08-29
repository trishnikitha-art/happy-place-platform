/**
 * Pergolas Drive Evidence Diagnostic
 *
 * EVIDENCE-PRODUCING DIAGNOSTIC
 *
 * Purpose: Establish live Google Drive evidence for Pergolas media lineage
 * before making any authority data changes.
 *
 * This script uses the existing authoritative Drive machinery to:
 * 1. Check Drive authentication status
 * 2. Discover My Drive and Shared Drives
 * 3. Search for Pergolas-related files by name
 * 4. Test whether application-style IDs (pergolas-001-hero, etc.) are real Drive file IDs
 *
 * CLASSIFICATION: READ-ONLY - No mutations, only evidence gathering
 */

const { driveDiscovery } = require('../src/lib/drive/drive-discovery');
const { isAuthenticated } = require('../src/lib/drive/oauth-manager');

async function main() {
  console.log('=== PERGOLAS DRIVE EVIDENCE DIAGNOSTIC ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  // Check authentication
  console.log('STEP 1: Check Drive authentication status');
  const authenticated = await isAuthenticated();
  console.log('Authenticated:', authenticated);
  console.log('');

  if (!authenticated) {
    console.log('ERROR: Not authenticated with Drive. Cannot proceed with live evidence gathering.');
    console.log('Please authenticate with Google Drive via the Workbench first.');
    process.exit(1);
  }

  // Discover Drive structure
  console.log('STEP 2: Discover Drive structure (My Drive + Shared Drives)');
  try {
    const structure = await driveDiscovery.discoverStructure();
    console.log('My Drive:', structure.myDrive);
    console.log('Shared Drives count:', structure.sharedDrives.length);
    structure.sharedDrives.forEach(drive => {
      console.log(`  - ${drive.name} (ID: ${drive.id})`);
    });
    console.log('');
  } catch (error) {
    console.error('ERROR: Failed to discover Drive structure:', error.message);
    process.exit(1);
  }

  // Search for Pergolas files by name
  console.log('STEP 3: Search for Pergolas-related files by name');
  const searchTerms = [
    'pergola',
    'Pergola',
    'PERGOLA',
    'HOMESERVICEPROJECTPERGOLAS',
  ];

  for (const term of searchTerms) {
    console.log(`Searching for: "${term}"`);
    try {
      const results = await driveDiscovery.searchFiles(term);
      console.log(`  Found ${results.length} files`);
      results.slice(0, 5).forEach(file => {
        console.log(`    - ${file.name} (ID: ${file.id}, MIME: ${file.mimeType})`);
      });
      if (results.length > 5) {
        console.log(`    ... and ${results.length - 5} more`);
      }
    } catch (error) {
      console.error(`  Search error:`, error.message);
    }
  }
  console.log('');

  // Test whether application-style IDs are real Drive file IDs
  console.log('STEP 4: Test whether application-style IDs are real Drive file IDs');
  const pergolasIds = [
    'pergolas-001-hero',
    'pergolas-001-before',
    'pergolas-001-after',
    'pergolas-001-construction',
    'pergolas-001-steel-frame',
    'pergolas-001-finished',
    'pergolas-001-master',
    'pergolas-001-variant-001',
  ];

  for (const id of pergolasIds) {
    console.log(`Testing ID: "${id}"`);
    try {
      const file = await driveDiscovery.getFile(id);
      if (file) {
        console.log(`  ✓ PROVEN: Real Drive file`);
        console.log(`    Name: ${file.name}`);
        console.log(`    MIME: ${file.mimeType}`);
        console.log(`    Size: ${file.size}`);
        console.log(`    Parent: ${file.parent}`);
      } else {
        console.log(`  ✗ NOT FOUND: Not a valid Drive file ID`);
      }
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
    }
  }
  console.log('');

  // Test known Drive-prefixed IDs from media.v1.json
  console.log('STEP 5: Test known Drive-prefixed IDs from media.v1.json');
  const knownDriveIds = [
    'drive-c266e5096e43',
    'drive-7a4b33c8b2bb',
  ];

  for (const id of knownDriveIds) {
    console.log(`Testing ID: "${id}"`);
    try {
      const file = await driveDiscovery.getFile(id);
      if (file) {
        console.log(`  ✓ PROVEN: Real Drive file`);
        console.log(`    Name: ${file.name}`);
        console.log(`    MIME: ${file.mimeType}`);
        console.log(`    Size: ${file.size}`);
        console.log(`    Parent: ${file.parent}`);
      } else {
        console.log(`  ✗ NOT FOUND: Not a valid Drive file ID`);
      }
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
    }
  }
  console.log('');

  console.log('=== DIAGNOSTIC COMPLETE ===');
}

main().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
