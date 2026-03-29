/**
 * @qaily/playwright-jsonl-reporter
 *
 * Playwright reporter that generates JSONL files optimized for analysis and DuckDB queries.
 * Minimal bundle — no UI, no parsers, no CLI.
 *
 * @example
 * // playwright.config.ts
 * export default defineConfig({
 *   reporter: [
 *     ['@qaily/playwright-jsonl-reporter', { outputDir: 'reports/data' }],
 *   ],
 * });
 */

export { default } from './reporter-jsonl';
export { default as PlaywrightJsonlReporter } from './reporter-jsonl';
export { default as PlaywrightJsonlReporterCore } from './reporter-core';
export { JsonlGenerator } from './generator';

export type {
  // Output schema types
  ErrorType,
  TestStatus,
  StepStatus,
  TestSummaryRecord,
  StepRecord,
  TestDetailsRecord,
  AnnotationRecord,
  ErrorsRecord,
  AttachmentRecord,
  ManifestRecordType,
  FileIndexEntry,
  ManifestRecordBase,
  ManifestRunStart,
  ManifestRunEnd,
  ManifestFileIndex,
  ManifestRecord,
  ManifestRecordLegacy,
  // Normalized intermediate format
  SourceFormat,
  NormalizedTestRun,
  NormalizedMetadata,
  NormalizedTestResult,
  NormalizedAttempt,
  NormalizedStep,
  NormalizedError,
  NormalizedAttachment,
  NormalizedAnnotation,
  // Options
  GeneratorOptions,
  PlaywrightJsonlReporterCoreOptions,
} from './types';

export { DEFAULT_GENERATOR_OPTIONS } from './types';

// Helper utilities (for use in parsers and advanced scenarios)
export {
  classifyError,
  stripAnsi,
  extractLocator,
  generateRunId,
  truncate,
  writeJsonlGz,
  writeJsonl,
  readJsonl,
} from './helpers';
