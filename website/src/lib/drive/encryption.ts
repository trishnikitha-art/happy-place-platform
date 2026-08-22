/**
 * Drive Credential Encryption Authority
 *
 * AES-256-GCM encryption for credential storage.
 * 
 * Constitutional authority for credential encryption:
 * - AES-256-GCM algorithm
 * - 12-byte random IV (conventional/recommended nonce size)
 * - 16-byte authentication tag
 * - Key versioning for rotation
 * - No credentials in logs
 * 
 * Encryption key provided by ENCRYPTION_KEY environment variable.
 * Key must be exactly 32 bytes (64 hex characters).
 */

import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Conventional/recommended nonce size for GCM
const AUTH_TAG_LENGTH = 16; // GCM authentication tag length
const KEY_LENGTH = 32; // AES-256 key length in bytes

/**
 * Encryption Envelope
 * 
 * Stores encrypted data with all required metadata for decryption
 */
export interface EncryptionEnvelope {
  encrypted: string; // Hex-encoded ciphertext
  iv: string; // Hex-encoded 12-byte IV
  authTag: string; // Hex-encoded 16-byte auth tag
  keyVersion: number; // Encryption key version for rotation
}

/**
 * Validate encryption key
 * 
 * Key must be exactly 32 bytes (64 hex characters)
 */
function validateEncryptionKey(key: string): void {
  const keyBuffer = Buffer.from(key, 'hex');
  
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
  }
}

/**
 * Get encryption key from environment
 * 
 * Returns Buffer of exactly 32 bytes
 */
function getEncryptionKey(version: number = 0): Buffer {
  const keyEnv = version === 0 ? 'ENCRYPTION_KEY' : `ENCRYPTION_KEY_V${version}`;
  const key = process.env[keyEnv];
  
  if (!key) {
    throw new Error(`Missing required environment variable: ${keyEnv}`);
  }
  
  validateEncryptionKey(key);
  
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM
 * 
 * @param plaintext - Text to encrypt
 * @param keyVersion - Key version to use (default: 0)
 * @returns Encryption envelope with ciphertext, IV, auth tag, and key version
 */
export function encrypt(plaintext: string, keyVersion: number = 0): EncryptionEnvelope {
  try {
    const key = getEncryptionKey(keyVersion);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      keyVersion,
    };
  } catch (error) {
    console.error('[ENCRYPTION] Failed to encrypt:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * 
 * @param envelope - Encryption envelope
 * @returns Decrypted plaintext
 */
export function decrypt(envelope: EncryptionEnvelope): string {
  try {
    const key = getEncryptionKey(envelope.keyVersion);
    const iv = Buffer.from(envelope.iv, 'hex');
    const authTag = Buffer.from(envelope.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(envelope.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[ENCRYPTION] Failed to decrypt:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate encryption envelope schema
 */
export function validateEncryptionEnvelope(data: unknown): data is EncryptionEnvelope {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const envelope = data as Record<string, unknown>;
  
  if (typeof envelope.encrypted !== 'string' || envelope.encrypted.length === 0) {
    return false;
  }
  
  if (typeof envelope.iv !== 'string' || envelope.iv.length !== IV_LENGTH * 2) {
    return false;
  }
  
  if (typeof envelope.authTag !== 'string' || envelope.authTag.length !== AUTH_TAG_LENGTH * 2) {
    return false;
  }
  
  if (typeof envelope.keyVersion !== 'number' || envelope.keyVersion < 0) {
    return false;
  }
  
  return true;
}

/**
 * Rotate encryption key
 * 
 * Decrypts with old key version and encrypts with new key version
 * 
 * @param envelope - Encryption envelope with old key version
 * @param newKeyVersion - New key version to use
 * @returns New encryption envelope with new key version
 */
export function rotateKey(envelope: EncryptionEnvelope, newKeyVersion: number): EncryptionEnvelope {
  try {
    const plaintext = decrypt(envelope);
    return encrypt(plaintext, newKeyVersion);
  } catch (error) {
    console.error('[ENCRYPTION] Failed to rotate key:', error);
    throw new Error(`Key rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
