/**
 * Forensic Media JSON Inventory
 *
 * READ-ONLY evidence collection of all media-related JSON files.
 * Generates machine-readable inventory of structure, fields, and metadata.
 */

import { readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

const JSON_FILES = [
  // Current Authorities
  'src/config/media.v1.json',
  'src/config/projects.v1.json',
  'src/config/brand.v1.json',
  'src/config/manifest.v1.json',
  'src/config/gallery-presets.v1.json',

  // Constitutional Authorities
  'metadata/canonical-media-graph.json',
  'metadata/constitutional-authorities.json',
  'metadata/constitutional-scoring.json',

  // Projections
  '.generated/hero-projection.json',
  '.generated/gallery-projection.json',
  '.generated/service-projection.json',

  // Historical/Legacy
  'archive/legacy-runtime/media.v1.json',
  'archive/legacy-runtime/projects.v1.json',
  'archive/legacy-runtime/canonical-media-graph.json',
  'archive/legacy-runtime/canonical-media.json',
  'archive/legacy-runtime/canonical-projects.json',
  'archive/legacy-runtime/canonical-services.json',
  'archive/legacy-gallery/gallery.json',
  'archive/legacy-gallery/gallery.manifest.json',
  'archive/legacy-gallery/gallery-presets.v1.json',

  // Historical Analysis
  'archive/historical-analysis/MediaInventory.json',
  'archive/historical-analysis/image-inventory.json',

  // Generated/Drive
  'generated/drive-mapping-final.json',
  'generated/drive-mapping-table.json',
  'generated/golden-manifest.json',
  'generated/production-image-identities.json',
  'generated/enhanced-version-analysis.json',
];

function getFileMetadata(filePath) {
  try {
    const stats = statSync(filePath);
    return {
      size_bytes: stats.size,
      last_modified: stats.mtime.toISOString(),
    };
  } catch (error) {
    return {
      size_bytes: null,
      last_modified: null,
      error: error.message,
    };
  }
}

function extractIdentityFields(obj, keys = new Set()) {
  if (!obj || typeof obj !== 'object') return keys;
  
  const identityPatterns = [
    'id', 'mediaId', 'artifactId', 'assetId', 'canonicalId', 
    'uuid', 'stableId', 'fileId', 'sourceFileId', 'project_id', 
    'hero_image_id', 'driveId'
  ];
  
  for (const key in obj) {
    if (identityPatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
      keys.add(key);
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractIdentityFields(obj[key], keys);
    }
  }
  
  return keys;
}

function extractHashFields(obj, keys = new Set()) {
  if (!obj || typeof obj !== 'object') return keys;
  
  const hashPatterns = [
    'sha256', 'sha512', 'contentHash', 'checksum', 'galleryHash', 
    'generatedHash', 'inputHash', 'hash'
  ];
  
  for (const key in obj) {
    if (hashPatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
      keys.add(key);
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractHashFields(obj[key], keys);
    }
  }
  
  return keys;
}

function extractFilenameFields(obj, keys = new Set()) {
  if (!obj || typeof obj !== 'object') return keys;
  
  const filenamePatterns = [
    'filename', 'name', 'original_filename', 'file', 'sourceFile'
  ];
  
  for (const key in obj) {
    if (filenamePatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
      keys.add(key);
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractFilenameFields(obj[key], keys);
    }
  }
  
  return keys;
}

function hasVariants(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  const variantPatterns = ['variant', 'web', 'webp', 'avif', 'thumbnail', 'blur', 'original'];
  
  for (const key in obj) {
    if (variantPatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasVariants(obj[key])) return true;
    }
  }
  
  return false;
}

function hasProvenance(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  const provenancePatterns = ['provenance', 'importedAt', 'createdAt', 'updatedAt', 'uploadedAt', 'acquiredAt'];
  
  for (const key in obj) {
    if (provenancePatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasProvenance(obj[key])) return true;
    }
  }
  
  return false;
}

function hasDriveReferences(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  const drivePatterns = ['driveId', 'driveFolder', 'drivePath', 'driveModifiedAt', 'shared_drive_path'];
  
  for (const key in obj) {
    if (drivePatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasDriveReferences(obj[key])) return true;
    }
  }
  
  return false;
}

function hasProjectReferences(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  const projectPatterns = ['project', 'projectId', 'hero', 'gallery', 'before', 'after'];
  
  for (const key in obj) {
    if (projectPatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasProjectReferences(obj[key])) return true;
    }
  }
  
  return false;
}

function hasServiceReferences(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  const servicePatterns = ['service', 'category', 'serviceId'];
  
  for (const key in obj) {
    if (servicePatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasServiceReferences(obj[key])) return true;
    }
  }
  
  return false;
}

function generateInventory() {
  const inventory = {
    inventory_timestamp: new Date().toISOString(),
    files_inventoried: JSON_FILES.length,
    files: []
  };

  for (const filePath of JSON_FILES) {
    try {
      const metadata = getFileMetadata(filePath);
      const content = readFileSync(filePath, 'utf-8');
      // Remove UTF-8 BOM if present
      const contentNormalized = content.replace(/^\uFEFF/, '');
      const json = JSON.parse(contentNormalized);
      
      const identityFields = extractIdentityFields(json);
      const hashFields = extractHashFields(json);
      const filenameFields = extractFilenameFields(json);
      
      let recordCount = 0;
      let schemaType = 'object';
      let allKeys = new Set();
      
      if (Array.isArray(json)) {
        schemaType = 'array';
        recordCount = json.length;
        json.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(key => allKeys.add(key));
          }
        });
      } else if (typeof json === 'object' && json !== null) {
        schemaType = 'object';
        recordCount = 1;
        Object.keys(json).forEach(key => allKeys.add(key));
      }
      
      inventory.files.push({
        path: filePath,
        size_bytes: metadata.size_bytes,
        last_modified: metadata.last_modified,
        schema_version: json.version || json.generatedAt || null,
        authority_claim: json.authority || json.generatedBy || null,
        record_count: recordCount,
        schema_type: schemaType,
        keys: Array.from(allKeys),
        identity_fields: Array.from(identityFields),
        hash_fields: Array.from(hashFields),
        filename_fields: Array.from(filenameFields),
        has_variants: hasVariants(json),
        has_provenance: hasProvenance(json),
        has_drive_references: hasDriveReferences(json),
        has_project_references: hasProjectReferences(json),
        has_service_references: hasServiceReferences(json),
        sample_record: Array.isArray(json) && json.length > 0 ? json[0] : json
      });
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
      inventory.files.push({
        path: filePath,
        error: error.message
      });
    }
  }

  return inventory;
}

// Execute inventory
const inventory = generateInventory();
console.log(JSON.stringify(inventory, null, 2));
