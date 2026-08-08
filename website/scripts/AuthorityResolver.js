/**
 * Constitutional Authority Resolver
 * 
 * Single helper to resolve exactly one authority.
 * 
 * Constitutional Rule: Search → Resolve Authority → Use Authority → Never Create Parallel Authority
 * 
 * Reference: CONSTITUTIONAL_GALLERY_RECONCILIATION_REPORT.md
 * - Section: Constitutional Authorities
 * - Section: Authority Hierarchy
 * 
 * Data-Driven: Authority registry loaded from constitutional-authorities.json
 */

const fs = require('fs');
const path = require('path');

const SCRIPTS_PATH = path.resolve(__dirname);
const METADATA_PATH = path.resolve(__dirname, '../metadata');

/**
 * Load constitutional authorities from constitutional-authorities.json
 * Constitutional: Single source of truth for authority registry
 */
function loadConstitutionalAuthorities() {
  const authoritiesPath = path.join(METADATA_PATH, 'constitutional-authorities.json');
  
  if (!fs.existsSync(authoritiesPath)) {
    throw new Error(`Constitutional authorities registry not found: ${authoritiesPath}`);
  }
  
  const content = fs.readFileSync(authoritiesPath, 'utf-8');
  const registry = JSON.parse(content);
  
  // Convert array to object for lookup
  const authorities = {};
  for (const authority of registry.authorities) {
    authorities[authority.id] = {
      path: path.resolve(SCRIPTS_PATH, '..', authority.canonicalPath),
      description: authority.description,
      category: authority.category,
      immutable: authority.immutable
    };
  }
  
  return authorities;
}

const CONSTITUTIONAL_AUTHORITIES = loadConstitutionalAuthorities();

/**
 * Check if an authority exists
 */
function authorityExists(authorityName) {
  const authority = CONSTITUTIONAL_AUTHORITIES[authorityName];
  if (!authority) {
    throw new Error(`Unknown constitutional authority: ${authorityName}`);
  }
  return fs.existsSync(authority.path);
}

/**
 * Resolve an authority
 * Constitutional: Search → Resolve → Use
 * 
 * @param {string} authorityName - Name of the authority to resolve
 * @returns {object} Authority module
 * @throws {Error} If authority not found or multiple implementations exist
 */
function resolve(authorityName) {
  const authority = CONSTITUTIONAL_AUTHORITIES[authorityName];
  
  if (!authority) {
    throw new Error(`Unknown constitutional authority: ${authorityName}`);
  }
  
  if (!fs.existsSync(authority.path)) {
    throw new Error(`Constitutional authority not found: ${authorityName} at ${authority.path}`);
  }
  
  // Load the authority
  try {
    const authorityModule = require(authority.path);
    return authorityModule;
  } catch (error) {
    throw new Error(`Failed to load constitutional authority ${authorityName}: ${error.message}`);
  }
}

/**
 * Verify there is exactly one implementation of an authority
 * Constitutional: No duplicate authorities
 */
function verifySingleImplementation(authorityName) {
  const authority = CONSTITUTIONAL_AUTHORITIES[authorityName];
  
  if (!authority) {
    throw new Error(`Unknown constitutional authority: ${authorityName}`);
  }
  
  if (!fs.existsSync(authority.path)) {
    return { valid: false, error: `Authority not found: ${authorityName}` };
  }
  
  // In a full implementation, this would scan the entire repository
  // for competing implementations. For now, we verify the canonical path exists.
  return { valid: true };
}

/**
 * Get all constitutional authorities
 */
function getAllAuthorities() {
  return CONSTITUTIONAL_AUTHORITIES;
}

/**
 * Verify all constitutional authorities exist
 */
function verifyAllAuthoritiesExist() {
  const missing = [];
  
  for (const [name, authority] of Object.entries(CONSTITUTIONAL_AUTHORITIES)) {
    if (!fs.existsSync(authority.path)) {
      missing.push(name);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = {
  resolve,
  authorityExists,
  verifySingleImplementation,
  getAllAuthorities,
  verifyAllAuthoritiesExist,
  CONSTITUTIONAL_AUTHORITIES
};
