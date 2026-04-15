/**
 * Output Schema Definitions for AI-optimized JSONL files
 *
 * Optimizations applied:
 * - Shortened field names (dur_ms, err_msg, err_type, etc.)
 * - schema_version ONLY in manifest (not in data files)
 * - Field order: run_id, test_id, started_at first for optimal DuckDB partitioning
 * - full_title/line_num only on attempt 0 in test_details (avoids duplication)
 */

/** Error type classification */
export type ErrorType = 'timeout' | 'assertion' | 'element_not_found' | 'network' | 'unknown';

/** Test status */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'flaky';

/** Step status */
export type StepStatus = 'passed' | 'failed';

// ============================================
// test-summary.jsonl (Level 1: Overview)
// ============================================

/**
 * Test summary record - high-level overview of each test
 * No schema_version - compact format
 */
export interface TestSummaryRecord {
  run_id: string;
  test_id: string;
  started_at: string; // ISO 8601
  title: string;
  status: TestStatus;
  tags: string[];
  dur_ms: number;
  project: string;
  file: string;
  err_summary: string | null; // Clean, truncated first line
  err_type: ErrorType | null;
  failed_step: string | null; // Step title where failure occurred
}

// ============================================
// test_details.jsonl (Level 2: Execution Details)
// ============================================

/**
 * Step record within test details
 */
export interface StepRecord {
  idx: number;
  title: string;
  dur_ms: number;
  status: StepStatus;
}

/**
 * Annotation record
 */
export interface AnnotationRecord {
  type: string;
  description?: string;
}

/**
 * Test details record - per-attempt execution details
 * No schema_version - compact format
 */
export interface TestDetailsRecord {
  run_id: string;
  test_id: string;
  started_at: string;
  attempt: number; // 0 = first run, 1+ = retries
  full_title?: string; // Only on attempt 0
  line_num?: number; // Only on attempt 0
  worker_idx: number;
  parallel_idx: number;
  status: string;
  dur_ms: number;
  step_cnt: number;
  failed_step_idx: number | null;
  steps: StepRecord[];
  annotations?: AnnotationRecord[]; // Test annotations (skip, fixme, etc.)
}

// ============================================
// errors.jsonl (Level 3: Diagnostics)
// ============================================

/**
 * Error record - detailed error information per failed attempt
 * No schema_version - compact format
 */
export interface ErrorsRecord {
  run_id: string;
  test_id: string;
  attempt: number;
  err_msg: string; // ANSI-stripped
  err_type: string;
  stack: string;
  err_file: string;
  err_line: number;
  err_col: number;
  snippet: string | null;
  failed_step: string | null;
  locator: string | null; // Extracted from error message
}

// ============================================
// attachments-index.jsonl (Level 4)
// ============================================

/**
 * Attachment record - binary artifact registry
 * No schema_version - compact format
 */
export interface AttachmentRecord {
  run_id: string;
  test_id: string;
  attempt: number;
  name: string;
  type: string; // content type (e.g., "image/png")
  path: string;
  size: number | null;
  hash: string | null;
}

// ============================================
// manifest.jsonl (ONLY file with schema_version)
// ============================================

/** Manifest record type discriminator */
export type ManifestRecordType = 'run_start' | 'run_end' | 'file_index';

/** File index entry in manifest */
export interface FileIndexEntry {
  name: string;
  cnt: number;
}

/**
 * Base manifest record with schema version
 */
export interface ManifestRecordBase {
  schema_version: '1.0';
  run_id: string;
  type: ManifestRecordType;
}

/**
 * Run start manifest record
 */
export interface ManifestRunStart extends ManifestRecordBase {
  type: 'run_start';
  started_at: string;
  git_commit?: string;
  git_branch?: string;
  ci_url?: string;
  pw_version?: string;
  environment?: string;
  tag?: string;
  category?: string;
}

/**
 * Run end manifest record
 */
export interface ManifestRunEnd extends ManifestRecordBase {
  type: 'run_end';
  ended_at: string;
  dur_ms: number;
  test_cnt: number;
  passed_cnt: number;
  failed_cnt: number;
  flaky_cnt: number;
  skipped_cnt: number;
}

/**
 * File index manifest record
 */
export interface ManifestFileIndex extends ManifestRecordBase {
  type: 'file_index';
  files: FileIndexEntry[];
}

/**
 * Union type for all manifest record types
 */
export type ManifestRecord = ManifestRunStart | ManifestRunEnd | ManifestFileIndex;

/**
 * Legacy manifest record interface for backward compatibility
 * @deprecated Use ManifestRunStart | ManifestRunEnd | ManifestFileIndex instead
 */
export interface ManifestRecordLegacy {
  schema_version: '1.0';
  run_id: string;
  type: ManifestRecordType;
  started_at?: string;
  ended_at?: string;
  dur_ms?: number;
  test_cnt?: number;
  passed_cnt?: number;
  failed_cnt?: number;
  flaky_cnt?: number;
  skipped_cnt?: number;
  git_commit?: string;
  git_branch?: string;
  ci_url?: string;
  pw_version?: string;
  files?: FileIndexEntry[];
}

