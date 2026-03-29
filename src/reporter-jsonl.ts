/**
 * Playwright JSONL Reporter — JSONL output (minimal bundle).
 */

import PlaywrightJsonlReporterCore from './reporter-core';
import type { PlaywrightJsonlReporterCoreOptions } from './types';

export default class PlaywrightJsonlReporter extends PlaywrightJsonlReporterCore {
  constructor(options: PlaywrightJsonlReporterCoreOptions = {}) {
    super(options);
  }
}
