import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import type { AttachmentRecord } from '../src/types';
import { MAX_ATTACHMENT_NAME } from '../src/helpers/attachment-naming';

test('one spec, 3 failing tests, workers > 1, retries: 1 -> no attachment collisions', async () => {
  test.setTimeout(120_000);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonl-reporter-'));
  const config = path.join(__dirname, 'fixtures/same-spec/playwright.config.ts');

  try {
    execFileSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '-c', config], {
      env: { ...process.env, JSONL_FIXTURE_OUT: out },
      stdio: 'pipe',
    });
  } catch {
    // The fixture tests fail on purpose
  }

  const reportDir = path.join(out, 'report');
  const [runFolder] = fs.readdirSync(reportDir);
  const runDir = path.join(reportDir, runFolder);
  const rows: AttachmentRecord[] = fs
    .readFileSync(path.join(runDir, 'attachments-index.jsonl'), 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const stored = fs.readdirSync(path.join(runDir, 'attachments'));

  // 3 tests x 2 attempts x 7 attachments
  expect(rows).toHaveLength(42);
  expect(stored).toHaveLength(rows.length);

  const paths = rows.map((r) => r.path);
  expect(new Set(paths).size).toBe(paths.length);

  for (const row of rows) {
    const fileName = path.basename(row.path);
    expect(row.error).toBeUndefined();
    expect(fileName.length).toBeLessThanOrEqual(MAX_ATTACHMENT_NAME);
    expect(fileName.startsWith(`${row.test_id}-r${row.attempt}-`), fileName).toBe(true);

    const bytes = fs.readFileSync(path.join(runDir, row.path));
    expect(row.size).toBe(bytes.length);
    expect(row.hash).toBe(crypto.createHash('sha256').update(bytes).digest('hex'));
  }

  for (const bare of ['test-failed-1.png', 'debug.log', 'trace.zip', 'error-context.md']) {
    expect(stored).not.toContain(bare);
  }

  // Each test's own file holds its own content (nothing overwritten by another test)
  const titles = new Set<string>();
  for (const row of rows.filter((r) => r.name === 'logs')) {
    const content = fs.readFileSync(path.join(runDir, row.path), 'utf-8');
    expect(content).toContain(`retry=${row.attempt}`);
    titles.add(content);
  }
  expect(titles.size).toBe(6);

  // Expected short names for one attempt
  const first = rows.filter((r) => r.test_id === rows[0].test_id && r.attempt === 1).map((r) => path.basename(r.path));
  const id = rows[0].test_id;
  expect(first.sort()).toEqual(
    [
      `${id}-r1-shot-1.png`,
      `${id}-r1-debug.log`,
      `${id}-r1-ctx.md`,
      `${id}-r1-trace.zip`,
      `${id}-r1-net-f.jsonl`,
      `${id}-r1-net-f-2.jsonl`,
      `${id}-r1-net-v.jsonl`,
    ].sort()
  );

  fs.rmSync(out, { recursive: true, force: true });
});
