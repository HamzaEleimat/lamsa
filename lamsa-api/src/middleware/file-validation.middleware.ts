/**
 * @file file-validation.middleware.ts
 * @description Middleware for validating file uploads and preventing malicious files
 * @author Lamsa Development Team
 * @date Created: 2025-07-22
 * @copyright Lamsa 2025
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import path from 'path';
import crypto from 'crypto';

/**
 * File type configurations
 */
interface FileTypeConfig {
  extensions: string[];
  mimeTypes: string[];
  maxSizeInMB: number;
  magicNumbers?: { offset: number; bytes: string }[]; // File signature validation
}

/**
 * Allowed file types by bucket
 */
const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  avatars: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeInMB: 5,
    magicNumbers: [
      { offset: 0, bytes: 'FFD8FF' }, // JPEG
      { offset: 0, bytes: '89504E47' }, // PNG
      { offset: 8, bytes: '57454250' }, // WEBP
    ]
  },
  services: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeInMB: 10,
    magicNumbers: [
      { offset: 0, bytes: 'FFD8FF' }, // JPEG
      { offset: 0, bytes: '89504E47' }, // PNG
      { offset: 8, bytes: '57454250' }, // WEBP
    ]
  },
  reviews: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeInMB: 5,
    magicNumbers: [
      { offset: 0, bytes: 'FFD8FF' }, // JPEG
      { offset: 0, bytes: '89504E47' }, // PNG
      { offset: 8, bytes: '57454250' }, // WEBP
    ]
  },
  certificates: {
    extensions: ['.jpg', '.jpeg', '.png', '.pdf'],
    mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeInMB: 20,
    magicNumbers: [
      { offset: 0, bytes: 'FFD8FF' }, // JPEG
      { offset: 0, bytes: '89504E47' }, // PNG
      { offset: 0, bytes: '25504446' }, // PDF
    ]
  }
};

/**
 * Dangerous file patterns to block
 */
const DANGEROUS_PATTERNS = [
  // Executable files
  /\.exe$/i, /\.dll$/i, /\.cmd$/i, /\.bat$/i, /\.ps1$/i, /\.sh$/i,
  /\.app$/i, /\.deb$/i, /\.rpm$/i, /\.dmg$/i, /\.pkg$/i,
  
  // Script files
  /\.js$/i, /\.vbs$/i, /\.wsf$/i, /\.jar$/i, /\.py$/i, /\.rb$/i,
  /\.php$/i, /\.asp$/i, /\.aspx$/i, /\.jsp$/i,
  
  // Archive files that could contain malware
  /\.zip$/i, /\.rar$/i, /\.7z$/i, /\.tar$/i, /\.gz$/i,
  
  // Other potentially dangerous formats
  /\.html$/i, /\.htm$/i, /\.xml$/i, /\.svg$/i, // Can contain scripts
  /\.doc$/i, /\.docx$/i, /\.xls$/i, /\.xlsx$/i, // Can contain macros
];

/**
 * Validate file name and extension
 */
export function validateFileName(fileName: string, bucket: string): void {
  if (!fileName || typeof fileName !== 'string') {
    throw new AppError('Invalid file name', 400);
  }

  // Check for path traversal attempts
  const normalizedPath = path.normalize(fileName);
  if (normalizedPath.includes('..') || normalizedPath.includes('./')) {
    throw new AppError('Invalid file name: path traversal detected', 400);
  }

  // Check for dangerous patterns
  if (DANGEROUS_PATTERNS.some(pattern => pattern.test(fileName))) {
    throw new AppError('File type not allowed', 400);
  }

  // Check for null bytes (used in some attacks)
  if (fileName.includes('\0')) {
    throw new AppError('Invalid file name: null byte detected', 400);
  }

  // Get file extension
  const ext = path.extname(fileName).toLowerCase();
  if (!ext) {
    throw new AppError('File must have an extension', 400);
  }

  // Validate against allowed extensions for bucket
  const config = FILE_TYPE_CONFIGS[bucket];
  if (!config) {
    throw new AppError('Invalid bucket type', 400);
  }

  if (!config.extensions.includes(ext)) {
    throw new AppError(
      `File type ${ext} not allowed. Allowed types: ${config.extensions.join(', ')}`,
      400
    );
  }

  // Check file name length
  if (fileName.length > 255) {
    throw new AppError('File name too long (max 255 characters)', 400);
  }

  // Check for special characters that could cause issues
  const safeFileNamePattern = /^[\w\-. ]+$/;
  const baseName = path.basename(fileName, ext);
  if (!safeFileNamePattern.test(baseName)) {
    throw new AppError('File name contains invalid characters', 400);
  }
}

/**
 * Sanitize file name for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Get base name and extension
  const ext = path.extname(fileName).toLowerCase();
  let baseName = path.basename(fileName, ext);

  // Remove special characters except dash and underscore
  baseName = baseName.replace(/[^a-zA-Z0-9\-_]/g, '_');

  // Remove consecutive underscores
  baseName = baseName.replace(/_+/g, '_');

  // Trim underscores from start and end
  baseName = baseName.replace(/^_+|_+$/g, '');

  // Ensure base name is not empty
  if (!baseName) {
    baseName = 'file';
  }

  // Limit length
  if (baseName.length > 50) {
    baseName = baseName.substring(0, 50);
  }

  // Add timestamp for uniqueness
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(4).toString('hex');

  return `${baseName}_${timestamp}_${randomStr}${ext}`;
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string, bucket: string): void {
  const config = FILE_TYPE_CONFIGS[bucket];
  if (!config) {
    throw new AppError('Invalid bucket type', 400);
  }

  if (!config.mimeTypes.includes(mimeType)) {
    throw new AppError(
      `MIME type ${mimeType} not allowed. Allowed types: ${config.mimeTypes.join(', ')}`,
      400
    );
  }
}

/**
 * Validate file size
 */
export function validateFileSize(sizeInBytes: number, bucket: string): void {
  const config = FILE_TYPE_CONFIGS[bucket];
  if (!config) {
    throw new AppError('Invalid bucket type', 400);
  }

  const maxSizeInBytes = config.maxSizeInMB * 1024 * 1024;
  
  if (sizeInBytes > maxSizeInBytes) {
    throw new AppError(
      `File too large. Maximum size: ${config.maxSizeInMB}MB`,
      400
    );
  }

  // Minimum size check (empty files or suspiciously small)
  if (sizeInBytes < 100) {
    throw new AppError('File too small or empty', 400);
  }
}

/**
 * Middleware to validate file upload parameters
 */
export function validateFileUpload(req: Request, res: Response, next: NextFunction): void {
  try {
    const { fileName, bucket } = req.body;

    // Validate file name
    validateFileName(fileName, bucket);

    // Sanitize and update file name
    req.body.sanitizedFileName = sanitizeFileName(fileName);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Get allowed file types for a bucket
 */
export function getAllowedFileTypes(bucket: string): {
  extensions: string[];
  mimeTypes: string[];
  maxSizeInMB: number;
} | null {
  const config = FILE_TYPE_CONFIGS[bucket];
  if (!config) {
    return null;
  }

  return {
    extensions: config.extensions,
    mimeTypes: config.mimeTypes,
    maxSizeInMB: config.maxSizeInMB
  };
}

/**
 * Check if file buffer matches expected magic numbers
 * Used for additional validation after upload
 */
export function validateFileMagicNumbers(
  buffer: Buffer,
  bucket: string,
  declaredMimeType: string
): boolean {
  const config = FILE_TYPE_CONFIGS[bucket];
  if (!config || !config.magicNumbers) {
    return true; // No magic number validation configured
  }

  // Check each possible magic number
  for (const magic of config.magicNumbers) {
    const fileBytes = buffer.slice(magic.offset, magic.offset + magic.bytes.length / 2)
      .toString('hex')
      .toUpperCase();
    
    if (fileBytes === magic.bytes) {
      return true; // Valid magic number found
    }
  }

  return false; // No valid magic number found
}