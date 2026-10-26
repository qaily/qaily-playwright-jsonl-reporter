/**
 * Attachment Copier
 *
 * Copies attachment files (screenshots, traces, etc.) to the report directory
 * under unique keys (see attachment-naming) and builds attachment records from
 * what was actually stored.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { NormalizedAttachment, AttachmentRecord } from '../types';
import { attachmentKey, attachmentKind } from './attachment-naming';

export interface CopyAttachmentResult {
  success: boolean;
  newPath: string;
  size?: number;
  hash?: string;
  error?: string;
}

export interface CopyAttachmentsContext {
  /** Test run ID */
  runId: string;
  /** Full Playwright test ID */
  testId: string;
  /** Attempt index (0-based, as written to the index) */
  attempt: number;
  /** Playwright retry (defaults to attempt) */
  retry?: number;
  /** Playwright repeatEachIndex */
  repeatEachIndex?: number;
  /** Keys already used in this run; shared across all calls of one run */
  usedKeys: Set<string>;
}

/**
 * Copy attachment files to report directory and build attachment records
 *
 * @param attachments - Array of normalized attachments with original paths (one attempt)
 * @param outputDir - Report output directory (e.g., reports/data/{run_id})
 * @param context - Run/test/attempt identity and the run-wide set of used keys
 * @returns Attachment records with the paths actually stored
 */
export async function copyAttachments(
  attachments: NormalizedAttachment[],
  outputDir: string,
  context: CopyAttachmentsContext
): Promise<{ records: AttachmentRecord[]; copiedCount: number; failedCount: number }> {
  const { runId, testId, attempt, usedKeys } = context;
  const retry = context.retry ?? attempt;
  const attachmentsDir = path.join(outputDir, 'attachments');
  fs.mkdirSync(attachmentsDir, { recursive: true });

  const records: AttachmentRecord[] = [];
  // Per-kind counter within this attempt
  const kindCounts = new Map<string, number>();
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

    const originalName = path.basename(attachment.file_path);
    const kind = attachmentKind(attachment.name, originalName);
    const ext = path.extname(originalName);

    let counter = (kindCounts.get(kind) ?? 0) + 1;
    let key = attachmentKey({ testId, retry, repeatEachIndex: context.repeatEachIndex, kind, counter, ext });
    while (usedKeys.has(key)) {
      // Should never happen: the key is unique per test/retry/repeat/kind/counter
      console.error(`[Playwright JSONL Reporter] Duplicate attachment key ${key}, using next counter`);
      counter++;
      key = attachmentKey({ testId, retry, repeatEachIndex: context.repeatEachIndex, kind, counter, ext });
    }
    kindCounts.set(kind, counter);
    usedKeys.add(key);

    const result = copyAttachmentFile(attachment.file_path, attachmentsDir, key);

    if (result.success) {
      records.push({
        run_id: runId,
        test_id: testId,
        attempt,
        name: attachment.name,
        type: attachment.content_type,
        path: result.newPath, // Relative path: attachments/<key>
        size: result.size ?? null,
        hash: result.hash ?? null,
      });
      copiedCount++;
    } else {
      console.warn(`[Playwright JSONL Reporter] Failed to copy attachment: ${result.error}`);
      records.push({
        run_id: runId,
        test_id: testId,
        attempt,
        name: attachment.name,
        type: attachment.content_type,
        path: '',
        size: null,
        hash: null,
        error: result.error,
      });
      failedCount++;
    }
  }

  return { records, copiedCount, failedCount };
}

/**
 * Copy a single attachment file to the attachments directory under the given key.
 * Never overwrites an existing file.
 */
function copyAttachmentFile(originalPath: string, attachmentsDir: string, key: string): CopyAttachmentResult {
  if (!fs.existsSync(originalPath)) {
    return {
      success: false,
      newPath: '',
      error: `File not found: ${originalPath}`,
    };
  }

  const destPath = path.join(attachmentsDir, key);

  try {
    fs.copyFileSync(originalPath, destPath, fs.constants.COPYFILE_EXCL);
    const bytes = fs.readFileSync(destPath);

    return {
      success: true,
      newPath: `attachments/${key}`,
      size: bytes.length,
      hash: crypto.createHash('sha256').update(bytes).digest('hex'),
    };
  } catch (error) {
    return {
      success: false,
      newPath: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
