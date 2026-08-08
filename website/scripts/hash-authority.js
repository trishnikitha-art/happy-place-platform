/**
 * Constitutional Hash Authority
 * 
 * Single authority for all hash calculations in the system.
 * 
 * Constitutional Rule: One hash implementation, used everywhere.
 * Eliminates duplication and ensures consistent hashing across:
 * - Projection Generator
 * - Constitutional Verification
 * - Canonical Graph Generator
 * - Witness Generator
 * 
 * Reference: CONSTITUTIONAL_GALLERY_RECONCILIATION_REPORT.md
 * - Section: Constitutional Authorities
 * - Section: Hash Integrity
 */

const crypto = require('crypto');

/**
 * Calculate SHA256 hash of a string
 * 
 * @param {string} data - String to hash
 * @returns {string} Hexadecimal hash
 */
function calculateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Calculate SHA256 hash of an object
 * Object is stringified before hashing for determinism
 * 
 * @param {object} data - Object to hash
 * @returns {string} Hexadecimal hash
 */
function calculateObjectHash(data) {
  const str = JSON.stringify(data);
  return calculateHash(str);
}

/**
 * Calculate hash with prefix
 * 
 * @param {string} data - String to hash
 * @param {string} prefix - Hash prefix (e.g., 'sha256:')
 * @returns {string} Prefixed hash
 */
function calculateHashWithPrefix(data, prefix = 'sha256:') {
  return prefix + calculateHash(data);
}

/**
 * Calculate object hash with prefix
 * 
 * @param {object} data - Object to hash
 * @param {string} prefix - Hash prefix (e.g., 'sha256:')
 * @returns {string} Prefixed hash
 */
function calculateObjectHashWithPrefix(data, prefix = 'sha256:') {
  return prefix + calculateObjectHash(data);
}

module.exports = {
  calculateHash,
  calculateObjectHash,
  calculateHashWithPrefix,
  calculateObjectHashWithPrefix
};
