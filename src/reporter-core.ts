/**
 * Playwright JSONL Reporter — core implementation.
 *
 * Part of the self-contained bundle (no report UI build).
 */

import { execSync } from 'child_process';
import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import type {
  PlaywrightJsonlReporterCoreOptions,
  GeneratorOptions,
  NormalizedTestRun,
  NormalizedTestResult,
  NormalizedAttempt,
  NormalizedStep,
  NormalizedError,
  NormalizedAttachment,
  NormalizedAnnotation,
  TestStatus,
} from './types';
import { JsonlGenerator } from './generator';
import { stripAnsi, classifyError, extractLocator, generateRunId } from './helpers';

function getLocalGitInfo(): { hash?: string; branch?: string } {
  try {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return { hash, branch };
  } catch {
    return {};
  }
}

/**
 * Core reporter: writes JSONL via {@link JsonlGenerator}. Does not build the HTML UI.
 */
class PlaywrightJsonlReporterCore implements Reporter {
  private options: PlaywrightJsonlReporterCoreOptions;
  private config: FullConfig | null = null;
  private _suite: Suite | null = null;
  private testResults: Map<string, NormalizedTestResult> = new Map();
  private runId: string = '';
  private startedAt: string = '';

  constructor(options: PlaywrightJsonlReporterCoreOptions = {}) {
    this.options = {
      outputDir: options.outputDir || './reports/data',
      ...options,
    };
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this._suite = suite;
    this.startedAt = new Date().toISOString();

    const metadata = config.metadata as {
      gitCommit?: { hash?: string; branch?: string };
      ci?: { commitHash?: string; buildHref?: string };
    };

    let gitHash = metadata?.gitCommit?.hash || metadata?.ci?.commitHash;
    let gitBranch = metadata?.gitCommit?.branch;

    if (!gitHash) {
      const localGit = getLocalGitInfo();
      gitHash = localGit.hash;
      gitBranch = gitBranch || localGit.branch;
    }

    this.runId = generateRunId(this.startedAt, gitHash);

    console.log(`[Playwright JSONL Reporter] Starting test run: ${this.runId}`);
    console.log(`[Playwright JSONL Reporter] Total tests: ${this._suite.allTests().length}`);
  }

  onTestBegin(test: TestCase): void {
    if (!this.testResults.has(test.id)) {
      this.testResults.set(test.id, this.initializeTestResult(test));
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const testResult = this.testResults.get(test.id);
    if (!testResult) {
      console.warn(`[Playwright JSONL Reporter] Test result not found for: ${test.id}`);
      return;
    }

    const attempt = this.convertAttempt(test, result, testResult.attempts.length);
    testResult.attempts.push(attempt);

    testResult.total_duration_ms += result.duration;
    testResult.retry_count = Math.max(0, testResult.attempts.length - 1);

    testResult.final_status = this.determineFinalStatus(testResult.attempts);
  }

  async onEnd(result: FullResult): Promise<void> {
    console.log(`[Playwright JSONL Reporter] Test run completed with status: ${result.status}`);

    const normalizedRun = this.buildNormalizedRun();

    const generatorOptions: GeneratorOptions = {
      outputDir: this.options.outputDir,
      includeAttachmentChecksums: this.options.includeAttachmentChecksums,
      maxErrorMessageLength: this.options.maxErrorMessageLength,
      compressLevel: this.options.compressLevel,
      writePlainText: this.options.writePlainText,
      archived: this.options.archived,
    };

    const generator = new JsonlGenerator(generatorOptions);
    const outputDir = await generator.generate(normalizedRun);

    console.log(`[Playwright JSONL Reporter] Output written to: ${outputDir}`);
    this.printSummary(normalizedRun);

    await this.options.afterJsonl?.();
  }

  onStdOut(_chunk: string | Buffer, _test?: TestCase): void {}

  onStdErr(_chunk: string | Buffer, _test?: TestCase): void {}

  private initializeTestResult(test: TestCase): NormalizedTestResult {
    return {
      test_id: test.id,
      title: test.title,
      full_title: test.titlePath().join(' > '),
      file_path: test.location.file,
      line_number: test.location.line,
      tags: test.tags.map((t) => t.replace('@', '')),
      project_name: test.parent.project()?.name || 'unknown',
      final_status: 'skipped',
      total_duration_ms: 0,
      retry_count: 0,
      attempts: [],
    };
  }

  private convertAttempt(_test: TestCase, result: TestResult, attemptNumber: number): NormalizedAttempt {
    const steps = this.convertSteps(result.steps);

    const normalizedStatus: 'passed' | 'failed' | 'skipped' =
      result.status === 'timedOut' ? 'failed' : (result.status as 'passed' | 'failed' | 'skipped');

    const error = normalizedStatus === 'failed' && result.error ? this.convertError(result.error, result.steps, result) : undefined;
    const attachments = this.convertAttachments(result.attachments);
    const annotations: NormalizedAnnotation[] = [];

    return {
      attempt_number: attemptNumber,
      status: normalizedStatus,
      duration_ms: result.duration,
      started_at: result.startTime.toISOString(),
      worker_index: result.workerIndex,
      parallel_index: result.parallelIndex,
      steps,
      error,
      attachments,
      annotations: annotations.length > 0 ? annotations : undefined,
    };
  }

  private convertSteps(steps: TestResult['steps']): NormalizedStep[] {
    return steps.map((step, index) => ({
      index,
      title: step.title,
      duration_ms: step.duration,
      status: step.error ? ('failed' as const) : ('passed' as const),
      error: step.error ? this.convertStepError(step.error) : undefined,
    }));
  }

  private convertError(error: TestResult['error'], _steps: TestResult['steps'], result?: TestResult): NormalizedError {
    const cleanMessage = stripAnsi(error?.message || '');

    let cleanStack = '';

    if (result && 'errors' in result && Array.isArray(result.errors) && result.errors.length > 1 && result.errors[1]?.message) {
      cleanStack = result.errors[1].message;
    } else if (error?.stack) {
      cleanStack = error.stack;
    } else if (cleanMessage) {
      cleanStack = cleanMessage;
    }

    let cleanSnippet: string | undefined = undefined;
    if (error?.snippet) {
      cleanSnippet = error.snippet;
    } else if (result && 'errors' in result && Array.isArray(result.errors) && result.errors.length > 1 && result.errors[1]?.snippet) {
      cleanSnippet = result.errors[1].snippet;
    }

    let errorFile = error?.location?.file;
    let errorLine = error?.location?.line;
    let errorColumn = error?.location?.column;

    if (result && 'errors' in result && Array.isArray(result.errors) && result.errors.length > 1 && result.errors[1]?.location) {
      errorFile = result.errors[1].location?.file || errorFile;
      errorLine = result.errors[1].location?.line || errorLine;
      errorColumn = result.errors[1].location?.column || errorColumn;
    }

    return {
      message: cleanMessage,
      error_type: classifyError(cleanMessage),
      stack_trace: cleanStack,
      file: errorFile,
      line: errorLine,
      column: errorColumn,
      code_snippet: cleanSnippet,
      locator: extractLocator(cleanMessage) || undefined,
    };
  }

  private convertStepError(error: NonNullable<TestResult['steps'][0]['error']>): NormalizedError {
    const cleanMessage = stripAnsi(error.message || '');

    return {
      message: cleanMessage,
      error_type: classifyError(cleanMessage),
      stack_trace: error.stack ? stripAnsi(error.stack) : undefined,
    };
  }

  private convertAttachments(attachments: TestResult['attachments']): NormalizedAttachment[] {
    return attachments.map((att) => ({
      name: att.name,
      content_type: att.contentType,
      file_path: att.path || '',
    }));
  }

  private determineFinalStatus(attempts: NormalizedAttempt[]): TestStatus {
    if (attempts.length === 0) return 'skipped';

    const lastAttempt = attempts[attempts.length - 1];
    const hasFailures = attempts.some((a) => a.status === 'failed');

    if (lastAttempt.status === 'skipped') return 'skipped';
    if (lastAttempt.status === 'passed' && hasFailures) return 'flaky';
    if (lastAttempt.status === 'passed') return 'passed';
    return 'failed';
  }

  private buildNormalizedRun(): NormalizedTestRun {
    const metadata = this.config?.metadata as {
      gitCommit?: { hash?: string; branch?: string };
      ci?: { commitHash?: string; buildHref?: string };
    };

    let gitCommit = metadata?.gitCommit?.hash || metadata?.ci?.commitHash;
    let gitBranch = metadata?.gitCommit?.branch;

    if (!gitCommit) {
      const localGit = getLocalGitInfo();
      gitCommit = localGit.hash;
      gitBranch = gitBranch || localGit.branch;
    }

    return {
      run_id: this.runId,
      started_at: this.startedAt,
      ended_at: new Date().toISOString(),
      source_format: 'playwright',
      metadata: {
        git_commit: gitCommit,
        git_branch: gitBranch,
        ci_build_url: metadata?.ci?.buildHref,
        tool_version: this.config?.version,
      },
      tests: Array.from(this.testResults.values()),
    };
  }

  private printSummary(run: NormalizedTestRun): void {
    const passed = run.tests.filter((t) => t.final_status === 'passed').length;
    const failed = run.tests.filter((t) => t.final_status === 'failed').length;
    const flaky = run.tests.filter((t) => t.final_status === 'flaky').length;
    const skipped = run.tests.filter((t) => t.final_status === 'skipped').length;

    console.log(`\n[Playwright JSONL Reporter] Summary:`);
    console.log(`  Total tests: ${run.tests.length}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Flaky: ${flaky}`);
    console.log(`  Skipped: ${skipped}`);
  }
}

export default PlaywrightJsonlReporterCore;
