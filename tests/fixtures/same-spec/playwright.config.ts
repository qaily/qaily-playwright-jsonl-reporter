import * as path from 'path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: __dirname,
  outputDir: path.join(process.env.JSONL_FIXTURE_OUT!, 'test-results'),
  workers: 3,
  retries: 1,
  fullyParallel: true,
  reporter: [[path.join(__dirname, '../../../src/index.ts'), { outputDir: path.join(process.env.JSONL_FIXTURE_OUT!, 'report'), archived: false }]],
});
