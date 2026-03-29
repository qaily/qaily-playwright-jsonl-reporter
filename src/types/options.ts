/**
 * Configuration options for Playwright JSONL Reporter
 */

/**
 * Options for the JSONL Generator
 */
export interface GeneratorOptions {
  /** Output directory for generated files. Default: './reports/data' */
  outputDir?: string;

  /** Whether to calculate and include file checksums (SHA256). Default: false */
  includeAttachmentChecksums?: boolean;

  /** Maximum length for error messages before truncation. Default: 500 */
  maxErrorMessageLength?: number;

  /** Gzip compression level (1-9). Default: 6 */
  compressLevel?: number;

  /** Whether to write plain text JSONL files in addition to gzipped. Default: true */
  writePlainText?: boolean;

  /** Whether to archive files as .gz (true) or write plain .jsonl files (false). Default: true */
  archived?: boolean;
}

/**
 * Core reporter options (JSONL generation). Optional hook after files are written.
 */
export interface PlaywrightJsonlReporterCoreOptions extends GeneratorOptions {
  /**
   * Optional callback after JSONL output is written.
   */
  afterJsonl?: () => Promise<void>;
}

/**
 * Default generator options
 */
export const DEFAULT_GENERATOR_OPTIONS: Required<GeneratorOptions> = {
  outputDir: './reports/data',
  includeAttachmentChecksums: false,
  maxErrorMessageLength: 500,
  compressLevel: 6,
  writePlainText: true,
  archived: true,
};
