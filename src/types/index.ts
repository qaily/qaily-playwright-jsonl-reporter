/**
 * Types for @qaily/playwright-jsonl-reporter
 */

export type {
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
} from './output-schemas';

export type {
  SourceFormat,
  NormalizedTestRun,
  NormalizedMetadata,
  NormalizedTestResult,
  NormalizedAttempt,
  NormalizedStep,
  NormalizedError,
  NormalizedAttachment,
  NormalizedAnnotation,
} from './normalized';

export type { GeneratorOptions, PlaywrightJsonlReporterCoreOptions } from './options';

export { DEFAULT_GENERATOR_OPTIONS } from './options';
