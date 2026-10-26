import * as fs from 'fs';
import { test, expect } from '@playwright/test';

/**
 * Three failing tests in one spec, each attaching the same kinds of files
 * (like internal-payment-ibp.feature). Same file names on purpose.
 */
for (const name of ['first', 'second', 'third']) {
  test(`fails ${name}`, async ({}, testInfo) => {
    const body = `${testInfo.title} retry=${testInfo.retry}`;
    // Pushed directly, the way Playwright records its own failure screenshot / trace / error context
    const files: Array<[string, string]> = [
      ['screenshot', 'test-failed-1.png'],
      ['error-context', 'error-context.md'],
      ['trace', 'trace.zip'],
    ];
    for (const [attachmentName, fileName] of files) {
      const filePath = testInfo.outputPath(fileName);
      fs.writeFileSync(filePath, `${attachmentName}: ${body}`);
      testInfo.attachments.push({ name: attachmentName, path: filePath, contentType: 'application/octet-stream' });
    }
    // Attached by path, the way the framework attaches its logs (Playwright stores them as <name>-<sha1>.<ext>)
    const logs: Array<[string, string]> = [
      ['logs', 'debug.log'],
      ['network-log-filtered', 'net-filtered-1.jsonl'],
      ['network-log-filtered', 'net-filtered-2.jsonl'],
      ['network-log-verbose', 'net-verbose.jsonl'],
    ];
    for (const [attachmentName, fileName] of logs) {
      const filePath = testInfo.outputPath(fileName);
      fs.writeFileSync(filePath, `${attachmentName} ${fileName}: ${body}`);
      await testInfo.attach(attachmentName, { path: filePath });
    }
    expect(name).toBe('passing');
  });
}
