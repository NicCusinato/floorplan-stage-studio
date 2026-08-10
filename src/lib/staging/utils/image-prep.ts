// ─── Image Preparation Utility ─────────────────────────────────────────────────
// Utilities for resizing, converting formats, and preparing masks for staging.

import fs from "fs";
import path from "path";

/**
 * Validates that an image file exists and is under a certain size limit.
 */
export function validateImage(filePath: string, maxSizeBytes = 4 * 1024 * 1024): boolean {
  if (!fs.existsSync(filePath)) return false;
  
  const stats = fs.statSync(filePath);
  return stats.size <= maxSizeBytes;
}

/**
 * Returns base64 representation of a local file
 */
export function getBase64Image(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString("base64");
}

/**
 * Determines MIME type from file extension
 */
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

// Note: In a full implementation, you would use a library like 'sharp' here
// to resize images to provider limits (e.g. 1024x1024 for OpenAI) and 
// generate binary transparency masks for inpainting.
