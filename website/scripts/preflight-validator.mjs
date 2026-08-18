#!/usr/bin/env node
/**
 * Preflight Validator - Source validation before derivative generation
 * 
 * Purpose: Validate source images before expensive processing
 * - File existence, readability, type validation
 * - Dimension checks
 * - Corruption detection
 * - Warnings for unusual metadata
 * 
 * REJECT criteria (error):
 * - File does not exist or is unreadable
 * - Unsupported file type
 * - Corrupted or truncated file
 * - Dimensions too small (< 100px)
 * 
 * WARN criteria (warning):
 * - Large file size (> 50MB)
 * - Extreme aspect ratio (< 1:10 or > 10:1)
 * - Unusual metadata
 */

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Validate source image before processing
 * @param {string} filePath - Path to source image
 * @returns {Promise<{errors: string[], warnings: string[]}>}
 */
export async function validateSource(filePath) {
  const errors = [];
  const warnings = [];

  try {
    // Check file existence
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch {
      errors.push(`File does not exist or is not readable: ${filePath}`);
      return { errors, warnings };
    }

    // Check file size
    const stats = await fs.stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > 50) {
      warnings.push(`File size is large: ${fileSizeMB.toFixed(2)}MB`);
    }

    // Check file type by extension
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    
    if (!allowedExtensions.includes(ext)) {
      errors.push(`Unsupported file type: ${ext}. Allowed: ${allowedExtensions.join(', ')}`);
      return { errors, warnings };
    }

    // Try to read file to detect corruption
    try {
      const buffer = await fs.readFile(filePath);
      
      // Check for obviously truncated files (too small for valid image)
      if (buffer.length < 100) {
        errors.push(`File appears truncated or corrupted: only ${buffer.length} bytes`);
        return { errors, warnings };
      }

      // If Sharp is available, validate with metadata
      try {
        const sharp = (await import("sharp")).default;
        const metadata = await sharp(buffer).metadata();
        
        // Dimension validation
        if (metadata.width < 100 || metadata.height < 100) {
          errors.push(`Dimensions too small: ${metadata.width}x${metadata.height}. Minimum: 100x100`);
        }
        
        if (metadata.width > 10000 || metadata.height > 10000) {
          warnings.push(`Dimensions unusually large: ${metadata.width}x${metadata.height}`);
        }

        // Aspect ratio check
        const ratio = metadata.width / metadata.height;
        if (ratio < 0.1 || ratio > 10) {
          warnings.push(`Extreme aspect ratio: ${ratio.toFixed(2)}:1 (${metadata.width}x${metadata.height})`);
        }

        // EXIF orientation note
        if (metadata.orientation && metadata.orientation !== 1) {
          warnings.push(`Image has EXIF orientation tag: ${metadata.orientation}. Will be normalized during processing.`);
        }

        // Color space note
        if (metadata.space && metadata.space !== 'srgb') {
          warnings.push(`Image color space: ${metadata.space}. Will be normalized to sRGB during processing.`);
        }

      } catch (sharpError) {
        // Sharp validation failed, but file is readable
        warnings.push(`Could not validate with Sharp: ${sharpError.message}. File may still be valid.`);
      }

    } catch (readError) {
      errors.push(`Failed to read file: ${readError.message}`);
    }

  } catch (error) {
    errors.push(`Unexpected validation error: ${error.message}`);
  }

  return { errors, warnings };
}

/**
 * Check if validation passed (no errors)
 * @param {{errors: string[], warnings: string[]}} result 
 * @returns {boolean}
 */
export function validationPassed(result) {
  return result.errors.length === 0;
}

// CLI interface for direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node preflight-validator.mjs <image-path>');
    process.exit(1);
  }

  validateSource(filePath).then(({ errors, warnings }) => {
    console.log(`\n=== PREFLIGHT VALIDATION: ${path.basename(filePath)} ===`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(warn => console.log(`  - ${warn}`));
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ Validation passed');
    } else if (errors.length === 0) {
      console.log('\n✅ Validation passed with warnings');
    } else {
      console.log('\n❌ Validation failed');
      process.exit(1);
    }
  });
}
