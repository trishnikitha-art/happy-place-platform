#!/usr/bin/env node

/**
 * Test Projection Determinism
 * 
 * Runs projection generator twice and compares SHA256 hashes.
 * If hashes don't match, there's nondeterminism in the generator.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { forceRegenerateAllProjections } = require('./ProjectionManager.js');

const PROJECTION_PATH = path.resolve(__dirname, '../metadata/projection');

function calculateFileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getAllProjectionHashes() {
  const files = fs.readdirSync(PROJECTION_PATH).filter(f => f.endsWith('.json'));
  const hashes = {};
  for (const file of files) {
    hashes[file] = calculateFileHash(path.join(PROJECTION_PATH, file));
  }
  return hashes;
}

function compareHashes(hashes1, hashes2) {
  const differences = [];
  for (const file of Object.keys(hashes1)) {
    if (hashes1[file] !== hashes2[file]) {
      differences.push({
        file,
        hash1: hashes1[file],
        hash2: hashes2[file]
      });
    }
  }
  return differences;
}

console.log('Testing Projection Determinism');
console.log('===============================\n');

// First run
console.log('First generation...');
forceRegenerateAllProjections();
const hashes1 = getAllProjectionHashes();
console.log('Hashes:');
for (const [file, hash] of Object.entries(hashes1)) {
  console.log(`  ${file}: ${hash}`);
}

// Second run
console.log('\nSecond generation...');
forceRegenerateAllProjections();
const hashes2 = getAllProjectionHashes();
console.log('Hashes:');
for (const [file, hash] of Object.entries(hashes2)) {
  console.log(`  ${file}: ${hash}`);
}

// Compare
console.log('\nComparing hashes...');
const differences = compareHashes(hashes1, hashes2);

if (differences.length === 0) {
  console.log('✅ All hashes match - projections are deterministic');
  process.exit(0);
} else {
  console.log('❌ Hashes differ - projections are NOT deterministic:');
  for (const diff of differences) {
    console.log(`  ${diff.file}:`);
    console.log(`    Run 1: ${diff.hash1}`);
    console.log(`    Run 2: ${diff.hash2}`);
  }
  console.log('\nPossible causes:');
  console.log('  - Timestamps in generated data');
  console.log('  - Non-deterministic object/array ordering');
  console.log('  - Random values');
  process.exit(1);
}
