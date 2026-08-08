/**
 * Constitutional Authority Scanner
 * 
 * Recursively searches the repository for duplicate authorities.
 * 
 * Constitutional Rule: Search before create. Eliminate duplicates before extending.
 * 
 * Reference: CONSTITUTIONAL_GALLERY_RECONCILIATION_REPORT.md
 * - Section: Constitutional Authorities
 * - Section: Authority Hierarchy
 */

const fs = require('fs');
const path = require('path');
const { CONSTITUTIONAL_AUTHORITIES } = require('./AuthorityResolver');

const BASE_PATH = path.resolve(__dirname, '../..');

/**
 * Known duplicate patterns to detect
 * Constitutional: Scoring artifacts are constitutional evidence, not duplicates
 */
const DUPLICATE_PATTERNS = {
  projectionGenerator: [
    'projection-generator',
    'ProjectionGenerator',
    'gallery-generator',
    'hero-generator',
    'service-generator',
    'media-generator'
  ],
  projectionAdapter: [
    'projection-adapter',
    'ProjectionAdapter',
    'gallery-adapter',
    'media-adapter',
    'config-adapter'
  ],
  constitutionalVerification: [
    'constitutional-verification',
    'ConstitutionalVerification',
    'verification',
    'validator',
    'hash-verification'
  ],
  ranking: [
    'ranking',
    'score-engine',
    'ranking-engine',
    'selection'
  ]
};

/**
 * Recursively scan directory for files matching patterns
 */
function scanDirectory(dirPath, patterns, results = []) {
  if (!fs.existsSync(dirPath)) return results;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  // Derive canonical paths from AuthorityResolver (constitutional: single source of truth)
  const canonicalPaths = Object.values(CONSTITUTIONAL_AUTHORITIES).map(a => a.path.replace(/\\/g, '/'));
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const normalizedPath = fullPath.replace(/\\/g, '/');
    
    // Skip canonical constitutional authorities
    const isCanonical = canonicalPaths.some(canonical => normalizedPath.includes(canonical));
    if (isCanonical) continue;
    
    if (entry.isDirectory()) {
      // Skip node_modules, .git, .next, package, generated
      const skipDirs = ['node_modules', '.git', '.next', 'package', 'generated', 'dist', 'build'];
      if (!skipDirs.includes(entry.name)) {
        scanDirectory(fullPath, patterns, results);
      }
    } else if (entry.isFile()) {
      // Skip documentation files
      if (entry.name.endsWith('.md')) continue;
      
      // Skip test files
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
      
      const fileName = entry.name.toLowerCase();
      
      for (const pattern of patterns) {
        if (fileName.includes(pattern.toLowerCase())) {
          results.push({
            path: fullPath,
            fileName: entry.name,
            matchedPattern: pattern
          });
          break;
        }
      }
    }
  }
  
  return results;
}

/**
 * Scan for duplicate authorities
 */
function findDuplicateAuthorities() {
  console.log('Scanning for duplicate authorities...');
  console.log('=====================================\n');
  
  const duplicates = {};
  
  for (const [authorityName, patterns] of Object.entries(DUPLICATE_PATTERNS)) {
    const results = scanDirectory(BASE_PATH, patterns);
    
    if (results.length > 1) {
      duplicates[authorityName] = results;
    }
  }
  
  return duplicates;
}

/**
 * Classify duplicates for reconciliation
 */
function classifyDuplicates(duplicates) {
  const classification = {
    promote: [],
    absorb: [],
    archive: [],
    delete: []
  };
  
  // Derive canonical paths from AuthorityResolver (constitutional: single source of truth)
  const canonicalAuthorities = Object.values(CONSTITUTIONAL_AUTHORITIES).map(a => a.path.replace(/\\/g, '/'));
  
  for (const [authorityName, files] of Object.entries(duplicates)) {
    for (const file of files) {
      // Normalize path for comparison (handle Windows backslashes)
      const normalizedPath = file.path.replace(/\\/g, '/');
      const isCanonical = canonicalAuthorities.some(canonical => normalizedPath.includes(canonical));
      
      if (isCanonical) {
        classification.promote.push({
          authority: authorityName,
          file: file.path,
          reason: 'Canonical constitutional authority'
        });
      } else if (file.path.includes('node_modules')) {
        classification.archive.push({
          authority: authorityName,
          file: file.path,
          reason: 'Third-party dependency'
        });
      } else if (file.path.includes('.next')) {
        classification.archive.push({
          authority: authorityName,
          file: file.path,
          reason: 'Build artifact'
        });
      } else if (file.path.includes('image-qa')) {
        classification.archive.push({
          authority: authorityName,
          file: file.path,
          reason: 'Image QA utility (separate domain)'
        });
      } else if (file.path.includes('compiler')) {
        classification.archive.push({
          authority: authorityName,
          file: file.path,
          reason: 'Compiler utility (separate domain)'
        });
      } else {
        classification.delete.push({
          authority: authorityName,
          file: file.path,
          reason: 'Duplicate implementation'
        });
      }
    }
  }
  
  return classification;
}

/**
 * Emit reconciliation report
 */
function emitReconciliationReport(duplicates, classification) {
  console.log('Duplicate Authority Scan Results');
  console.log('=================================\n');
  
  if (Object.keys(duplicates).length === 0) {
    console.log('✅ No duplicate authorities found');
    return;
  }
  
  console.log(`⚠️  Found duplicate authorities in ${Object.keys(duplicates).length} categories\n`);
  
  for (const [authorityName, files] of Object.entries(duplicates)) {
    console.log(`${authorityName}:`);
    for (const file of files) {
      console.log(`  - ${file.path}`);
    }
    console.log();
  }
  
  console.log('Classification:');
  console.log('==============\n');
  
  if (classification.promote.length > 0) {
    console.log('Promote (Canonical):');
    for (const item of classification.promote) {
      console.log(`  + ${item.file}`);
      console.log(`    Reason: ${item.reason}`);
    }
    console.log();
  }
  
  if (classification.absorb.length > 0) {
    console.log('Absorb (Merge):');
    for (const item of classification.absorb) {
      console.log(`  ~ ${item.file}`);
      console.log(`    Reason: ${item.reason}`);
    }
    console.log();
  }
  
  if (classification.archive.length > 0) {
    console.log('Archive (Keep but ignore):');
    for (const item of classification.archive) {
      console.log(`  ! ${item.file}`);
      console.log(`    Reason: ${item.reason}`);
    }
    console.log();
  }
  
  if (classification.delete.length > 0) {
    console.log('Delete (Remove):');
    for (const item of classification.delete) {
      console.log(`  - ${item.file}`);
      console.log(`    Reason: ${item.reason}`);
    }
    console.log();
  }
}

/**
 * Main scan function
 */
function scan() {
  const duplicates = findDuplicateAuthorities();
  const classification = classifyDuplicates(duplicates);
  emitReconciliationReport(duplicates, classification);
  
  const hasDuplicates = Object.keys(duplicates).length > 0;
  const hasUnclassifiedDuplicates = classification.delete.length > 0;
  
  return {
    hasDuplicates,
    hasUnclassifiedDuplicates,
    duplicates,
    classification
  };
}

/**
 * Verify constitutional authorities exist
 */
function verifyConstitutionalAuthorities() {
  console.log('Verifying constitutional authorities...');
  console.log('=====================================\n');
  
  const missing = [];
  
  for (const [name, authority] of Object.entries(CONSTITUTIONAL_AUTHORITIES)) {
    if (fs.existsSync(authority.path)) {
      console.log(`✅ ${name}: ${authority.path}`);
    } else {
      console.log(`❌ ${name}: ${authority.path} (missing)`);
      missing.push(name);
    }
  }
  
  console.log();
  
  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = {
  scan,
  findDuplicateAuthorities,
  classifyDuplicates,
  emitReconciliationReport,
  verifyConstitutionalAuthorities
};
