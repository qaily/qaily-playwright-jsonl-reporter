/**
 * Attachment Copier
 *
 * Copies attachment files (screenshots, traces, etc.) to the report directory
 * and updates paths in attachment records to be relative to the report directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { NormalizedAttachment, AttachmentRecord } from '../types';

export interface CopyAttachmentResult {
  success: boolean;
  newPath: string;
  error?: string;
}

/**
 * Copy attachment files to report directory and update paths
 *
 * @param attachments - Array of normalized attachments with original paths
 * @param outputDir - Report output directory (e.g., reports/data/{run_id})
 * @param runId - Test run ID
 * @param testId - Test ID
 * @param attempt - Attempt number
 * @returns Array of updated attachment records with new relative paths
 */
export async function copyAttachments(
  attachments: NormalizedAttachment[],
  outputDir: string,
  runId: string,
  testId: string,
  attempt: number
): Promise<{ records: AttachmentRecord[]; copiedCount: number; failedCount: number }> {
  const attachmentsDir = path.join(outputDir, 'attachments');
  fs.mkdirSync(attachmentsDir, { recursive: true });

  const records: AttachmentRecord[] = [];
  let copiedCount = 0;
  let failedCount = 0;

  for (const attachment of attachments) {
    if (!attachment.file_path) {
      // Skip attachments without file paths (e.g., inline attachments)
      records.push({
        run_id: runId,
        test_id: testId,
        attempt,
        name: attachment.name,
        type: attachment.content_type,
        path: '', // Empty path for inline attachments
        size: null,
        hash: null,
      });
      continue;
    }

    const result = await copyAttachmentFile(attachment, attachmentsDir, testId, attempt);
    
    if (result.success) {
      records.push({
        run_id: runId,
        test_id: testId,
        attempt,
        name: attachment.name,
        type: attachment.content_type,
        path: result.newPath, // Relative path: attachments/filename.png
        size: getFileSize(attachment.file_path),
        hash: null, // TODO: implement if includeAttachmentChecksums is true
      });
      copiedCount++;
    } else {
      // Still create record but with original path (will likely fail to load in UI)
      console.warn(`[Playwright JSONL Reporter] Failed to copy attachment: ${result.error}`);
      records.push({
        run_id: runId,
        test_id: testId,
        attempt,
        name: attachment.name,
        type: attachment.content_type,
        path: attachment.file_path, // Keep original path as fallback
        size: null,
        hash: null,
      });
      failedCount++;
    }
  }

  return { records, copiedCount, failedCount };
}

/**
 * Copy a single attachment file to the attachments directory
 */
async function copyAttachmentFile(
  attachment: NormalizedAttachment,
  attachmentsDir: string,
  testId: string,
  attempt: number
): Promise<CopyAttachmentResult> {
  const originalPath = attachment.file_path;

  // Check if file exists
  if (!fs.existsSync(originalPath)) {
    return {
      success: false,
      newPath: '',
      error: `File not found: ${originalPath}`,
    };
  }

  // Generate unique filename to avoid conflicts
  const originalName = path.basename(originalPath);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  
  // Create a safe filename: sanitize testId and create unique name
  const sanitizedTestId = testId.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 20);
  const timestamp = Date.now();
  const uniqueName = `${baseName}-${sanitizedTestId}-${attempt}-${timestamp}${ext}`;
  
  // Fallback to original name if it's already unique enough
  const finalName = originalName.length < 50 && !fs.existsSync(path.join(attachmentsDir, originalName))
    ? originalName
    : uniqueName;

  const destPath = path.join(attachmentsDir, finalName);
  const relativePath = `attachments/${finalName}`;

  try {
    // Copy file
    fs.copyFileSync(originalPath, destPath);
    
    return {
      success: true,
      newPath: relativePath,
    };
  } catch (error) {
    return {
      success: false,
      newPath: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath: string): number | null {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return null;
  }
}

