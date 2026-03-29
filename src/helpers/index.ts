/**
 * Helper functions for JSONL reporter
 */

export { classifyError, isTimeoutError, isAssertionError, isElementNotFoundError, isNetworkError } from './error-classifier';

export { stripAnsi, hasAnsiCodes, cleanText } from './ansi-stripper';

export { extractLocator, extractAllLocators, getLocatorType } from './locator-extractor';

export { truncate, generateRunId, getFirstLine, normalizePath } from './string-utils';

export {
  writeJsonlGz,
  writeJsonl,
  readJsonl,
  appendJsonl,
  createJsonlStream,
  type JsonlWriterOptions,
} from './jsonl-writer';

export { copyAttachments, type CopyAttachmentResult } from './attachment-copier';
