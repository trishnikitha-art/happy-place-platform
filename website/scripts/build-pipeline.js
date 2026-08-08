/**
 * Constitutional Build Pipeline Entry Point
 * 
 * Delegates to ConstitutionalBuildManager for orchestration.
 * 
 * Reference: CONSTITUTIONAL_GALLERY_RECONCILIATION_REPORT.md
 * - Section: CI Pipeline
 * - Section: Constitutional Authorities
 */

const { executeBuild } = require('./ConstitutionalBuildManager');

async function main() {
  try {
    await executeBuild();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Constitutional build failed');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
