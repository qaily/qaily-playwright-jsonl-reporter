import { defineConfig } from '@playwright/test';

/**
 * Tests for the reporter itself (no browsers needed).
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: '**/fixtures/**',
  reporter: 'list',
});
