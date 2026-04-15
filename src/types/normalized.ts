/**
 * Normalized Intermediate Format
 *
 * This is the common data structure that all Parsers produce
 * and the Generator consumes. It enables the Parser/Generator
 * separation pattern for multi-format support.
 */

import type { ErrorType, TestStatus, StepStatus } from './output-schemas';

/** Source format identifier */
export type SourceFormat = 'playwright' | 'junit' | 'cucumber' | 'custom';

/**
 * Normalized test run - top level container
 */
export interface NormalizedTestRun {
  run_id: string;
  started_at: string; // ISO 8601
  ended_at?: string;
  source_format: SourceFormat;
  metadata: NormalizedMetadata;
  tests: NormalizedTestResult[];
}

/**
 * Run metadata (CI, git, tool info)
 */
export interface NormalizedMetadata {
  git_commit?: string;
  git_branch?: string;
  ci_build_url?: string;
  tool_version?: string;
  environment?: string;
  tag?: string;
  category?: string;
}

/**
 * Normalized test result - one per test case
 */
export interface NormalizedTestResult {
  test_id: string; // Stable identifier
  title: string;
  full_title: string; // Full hierarchy path
  file_path: string;
  line_number: number;
  tags: string[];
  project_name: string;

  // Final outcome
  final_status: TestStatus;
  total_duration_ms: number;
  retry_count: number;

  // Per-attempt details
  attempts: NormalizedAttempt[];
}

/**
 * Normalized annotation
 */
export interface NormalizedAnnotation {
  type: string;
  description?: string;
}

/**
 * Normalized test attempt - one per execution attempt
 */
export interface NormalizedAttempt {
  attempt_number: number; // 0 = first run, 1+ = retries
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  started_at: string;
  worker_index?: number;
  parallel_index?: number;

  // Steps (if available)
  steps: NormalizedStep[];

  // Error details (if failed)
  error?: NormalizedError;

  // Attachments
  attachments: NormalizedAttachment[];

  // Annotations (e.g., skip, fixme, etc.)
  annotations?: NormalizedAnnotation[];
}

/**
 * Normalized test step
 */
export interface NormalizedStep {
  index: number;
  title: string;
  duration_ms: number;
  status: StepStatus;
  error?: NormalizedError;
}

/**
 * Normalized error information
 */
export interface NormalizedError {
  message: string; // Already ANSI-stripped by parser
  error_type: ErrorType;
  stack_trace?: string;
  file?: string;
  line?: number;
  column?: number;
  code_snippet?: string;
  locator?: string; // Extracted from error message
}

/**
 * Normalized attachment
 */
export interface NormalizedAttachment {
  name: string;
  content_type: string;
  file_path: string;
}

