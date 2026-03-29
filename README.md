# @qaily/playwright-jsonl-reporter

A Playwright reporter that generates JSONL (JSON Lines) files optimized for analysis and DuckDB queries. Minimal bundle — no UI, no HTML report, no CLI.

> For the full HTML report UI, see [@qaily/playwright-html-reporter](https://github.com/qaily/qaily-playwright-html-reporter).

## Features

- Generates structured JSONL files for every test run
- Optimized schema with short field names for DuckDB / analytics queries
- Optional gzip compression (`.jsonl.gz`)
- Copies test attachments (screenshots, traces) alongside reports
- Zero UI dependencies — lightweight and fast

## Output Files

Each test run produces a timestamped directory under `outputDir`:

| File | Description |
|------|-------------|
| `manifest.jsonl[.gz]` | Run metadata, git info, file index |
| `test-summary.jsonl[.gz]` | One record per test — status, duration, tags, error summary |
| `test_details.jsonl[.gz]` | One record per attempt — steps, worker, annotations |
| `errors.jsonl[.gz]` | Detailed error info for failed attempts |
| `attachments-index.jsonl[.gz]` | Registry of all attachment files |
| `attachments/` | Copied screenshots, traces, and other attachments |

## Installation

```bash
npm install --save-dev @qaily/playwright-jsonl-reporter
```

## Usage

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['@qaily/playwright-jsonl-reporter', {
      outputDir: 'reports/data',
      archived: false,        // write plain .jsonl files (default: true = .jsonl.gz)
    }],
  ],
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputDir` | `string` | `'./reports/data'` | Output directory for generated files |
| `archived` | `boolean` | `true` | Write `.jsonl.gz` (true) or plain `.jsonl` (false) |
| `writePlainText` | `boolean` | `true` | Also write a `sample-formatted.json` file (only when `archived: false`) |
| `includeAttachmentChecksums` | `boolean` | `false` | Calculate SHA256 checksums for attachments |
| `maxErrorMessageLength` | `number` | `500` | Truncate error messages to this length |
| `compressLevel` | `number` | `6` | Gzip compression level (1–9, when `archived: true`) |
| `afterJsonl` | `() => Promise<void>` | — | Callback after JSONL files are written |

### Programmatic Usage

```typescript
import { JsonlGenerator, PlaywrightJsonlReporterCore } from '@qaily/playwright-jsonl-reporter';
import type { NormalizedTestRun, GeneratorOptions } from '@qaily/playwright-jsonl-reporter';

// Use the generator directly with already-normalized data
const generator = new JsonlGenerator({ outputDir: './reports/data', archived: false });
await generator.generate(normalizedTestRun);
```

## JSONL Schema

### `test-summary.jsonl`

```json
{
  "run_id": "2025-12-09T06-05-22_8bfed09",
  "test_id": "abc123",
  "started_at": "2025-12-09T06:05:22.000Z",
  "title": "should display login page",
  "status": "passed",
  "tags": ["regression"],
  "dur_ms": 1234,
  "project": "chromium",
  "file": "e2e-tests/login.spec.ts",
  "err_summary": null,
  "err_type": null,
  "failed_step": null
}
```

### `errors.jsonl`

```json
{
  "run_id": "2025-12-09T06-05-22_8bfed09",
  "test_id": "abc123",
  "attempt": 0,
  "err_msg": "TimeoutError: locator.click: Timeout 30000ms exceeded",
  "err_type": "timeout",
  "stack": "...",
  "err_file": "e2e-tests/login.spec.ts",
  "err_line": 42,
  "err_col": 5,
  "snippet": null,
  "failed_step": "Click login button",
  "locator": "button[type='submit']"
}
```

## DuckDB Example

```sql
-- Load all test summaries from multiple runs
SELECT run_id, status, COUNT(*) AS cnt
FROM read_ndjson_auto('reports/data/*/test-summary.jsonl.gz')
GROUP BY run_id, status;

-- Find flaky tests
SELECT title, COUNT(*) AS flaky_runs
FROM read_ndjson_auto('reports/data/*/test-summary.jsonl.gz')
WHERE status = 'flaky'
GROUP BY title
ORDER BY flaky_runs DESC;
```

## API Reference

### `PlaywrightJsonlReporterCore`

Base class implementing the Playwright `Reporter` interface. Extend this class to add custom behavior after JSONL files are written.

```typescript
import { PlaywrightJsonlReporterCore } from '@qaily/playwright-jsonl-reporter';

export default class MyReporter extends PlaywrightJsonlReporterCore {
  constructor(options = {}) {
    super({
      ...options,
      afterJsonl: async () => {
        // custom post-processing
      },
    });
  }
}
```

### `JsonlGenerator`

Converts a `NormalizedTestRun` object into JSONL output files.

```typescript
import { JsonlGenerator } from '@qaily/playwright-jsonl-reporter';

const generator = new JsonlGenerator({ outputDir: './reports/data' });
const outputDir = await generator.generate(normalizedRun);
```

## License

MIT
