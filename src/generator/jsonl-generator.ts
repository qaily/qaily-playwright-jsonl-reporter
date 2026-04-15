/**
 * JSONL Generator
 *
 * Converts normalized test run data to AI-optimized JSONL files
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  NormalizedTestRun,
  GeneratorOptions,
  TestSummaryRecord,
  TestDetailsRecord,
  StepRecord,
  ErrorsRecord,
  AttachmentRecord,
  ManifestRunStart,
  ManifestRunEnd,
  ManifestFileIndex,
  ErrorType,
} from '../types';
import { writeJsonlGz, writeJsonl, truncate } from '../helpers';
import { copyAttachments } from '../helpers/attachment-copier';

/**
 * JSONL Generator
 *
 * Generates AI-optimized JSONL files from normalized test run data
 *
 * @example
 * const generator = new JsonlGenerator({ outputDir: './ai-reports' });
 * await generator.generate(normalizedTestRun);
 */
export class JsonlGenerator {
  private options: Required<GeneratorOptions>;

  constructor(options: GeneratorOptions = {}) {
    this.options = {
      outputDir: options.outputDir || './ai-reports',
      includeAttachmentChecksums: options.includeAttachmentChecksums || false,
      maxErrorMessageLength: options.maxErrorMessageLength || 500,
      compressLevel: options.compressLevel || 6,
      writePlainText: options.writePlainText !== false,
      // Explicitly check if archived is undefined to default to true, otherwise use the provided value
      archived: options.archived === undefined ? true : options.archived,
    };
  }

  /**
   * Generate all JSONL output files from normalized test run
   */
  async generate(run: NormalizedTestRun): Promise<string> {
    // Create output directory
    const outputDir = path.join(this.options.outputDir, run.run_id);
    fs.mkdirSync(outputDir, { recursive: true });

    // Generate all record types
    const summaryRecords = this.generateSummaryRecords(run);
    const testDetailsRecords = this.generateTestDetailsRecords(run);
    const errorsRecords = this.generateErrorsRecords(run);
    
    // Copy attachments and generate attachment records with updated paths
    const { records: attachmentRecords, copiedCount, failedCount } = await this.generateAttachmentRecords(run, outputDir);
    
    if (copiedCount > 0) {
      console.log(`[Playwright JSONL Reporter] Copied ${copiedCount} attachment(s) to ${path.join(outputDir, 'attachments')}`);
    }
    if (failedCount > 0) {
      console.warn(`[Playwright JSONL Reporter] Failed to copy ${failedCount} attachment(s)`);
    }
    
    const manifestRecords = this.generateManifestRecords(
      run,
      summaryRecords.length,
      testDetailsRecords.length,
      errorsRecords.length,
      attachmentRecords.length
    );

    // Write files based on archived option
    if (this.options.archived) {
      // Write only gzipped files when archived is true (no plain text files)
      this.writeFile(outputDir, 'manifest.jsonl.gz', manifestRecords);
      this.writeFile(outputDir, 'test-summary.jsonl.gz', summaryRecords);
      this.writeFile(outputDir, 'test_details.jsonl.gz', testDetailsRecords);
      this.writeFile(outputDir, 'errors.jsonl.gz', errorsRecords);
      this.writeFile(outputDir, 'attachments-index.jsonl.gz', attachmentRecords);
    } else {
      // Write plain text JSONL files when archived is false
      this.writePlainFile(outputDir, 'manifest.jsonl', manifestRecords);
      this.writePlainFile(outputDir, 'test-summary.jsonl', summaryRecords);
      this.writePlainFile(outputDir, 'test_details.jsonl', testDetailsRecords);
      this.writePlainFile(outputDir, 'errors.jsonl', errorsRecords);
      this.writePlainFile(outputDir, 'attachments-index.jsonl', attachmentRecords);

      // Write sample formatted JSON for documentation (only when not archived)
      if (this.options.writePlainText) {
        this.writeSampleFile(outputDir, summaryRecords, testDetailsRecords, errorsRecords, attachmentRecords, manifestRecords);
      }
    }

    return outputDir;
  }

  /**
   * Generate test summary records
   */
  private generateSummaryRecords(run: NormalizedTestRun): TestSummaryRecord[] {
    return run.tests.map((test) => {
      // Get error info from first failed attempt
      let errSummary: string | null = null;
      let errType: ErrorType | null = null;
      let failedStep: string | null = null;

      if (test.final_status === 'failed' || test.final_status === 'flaky') {
        const failedAttempt = test.attempts.find((a) => a.status === 'failed');
        if (failedAttempt?.error) {
          errSummary = truncate(failedAttempt.error.message.split('\n')[0], 200);
          errType = failedAttempt.error.error_type;
        }
        // Get failed step
        const failedStepInfo = failedAttempt?.steps.find((s) => s.status === 'failed');
        failedStep = failedStepInfo?.title || null;
      }

      const startedAt = test.attempts[0]?.started_at || run.started_at;

      return {
        run_id: run.run_id,
        test_id: test.test_id,
        started_at: startedAt,
        title: test.title,
        status: test.final_status,
        tags: test.tags,
        dur_ms: test.total_duration_ms,
        project: test.project_name,
        file: test.file_path,
        err_summary: errSummary,
        err_type: errType,
        failed_step: failedStep,
      };
    });
  }

  /**
   * Generate test details records (one per attempt)
   */
  private generateTestDetailsRecords(run: NormalizedTestRun): TestDetailsRecord[] {
    const records: TestDetailsRecord[] = [];

    for (const test of run.tests) {
      for (let i = 0; i < test.attempts.length; i++) {
        const attempt = test.attempts[i];
        const steps: StepRecord[] = attempt.steps.map((step) => ({
          idx: step.index,
          title: step.title,
          dur_ms: step.duration_ms,
          status: step.status,
        }));

        const failedStepIdx = steps.findIndex((s) => s.status === 'failed');

        const record: TestDetailsRecord = {
          run_id: run.run_id,
          test_id: test.test_id,
          started_at: attempt.started_at,
          attempt: i,
          worker_idx: attempt.worker_index ?? -1,
          parallel_idx: attempt.parallel_index ?? -1,
          status: attempt.status,
          dur_ms: attempt.duration_ms,
          step_cnt: steps.length,
          failed_step_idx: failedStepIdx >= 0 ? failedStepIdx : null,
          steps,
        };

        // Add full_title and line_num only on attempt 0
        if (i === 0) {
          record.full_title = test.full_title;
          record.line_num = test.line_number;
        }

        // Add annotations if present
        if (attempt.annotations && attempt.annotations.length > 0) {
          record.annotations = attempt.annotations.map((ann) => ({
            type: ann.type,
            description: ann.description,
          }));
        }

        records.push(record);
      }
    }

    return records;
  }

  /**
   * Generate error records (one per failed attempt)
   */
  private generateErrorsRecords(run: NormalizedTestRun): ErrorsRecord[] {
    const records: ErrorsRecord[] = [];

    for (const test of run.tests) {
      for (let i = 0; i < test.attempts.length; i++) {
        const attempt = test.attempts[i];
        // Generate error records for any failed attempt with an error
        // Note: timedOut tests are normalized to 'failed' status in the parser
        if (attempt.status === 'failed' && attempt.error) {
          const failedStep = attempt.steps.find((s) => s.status === 'failed');

          records.push({
            run_id: run.run_id,
            test_id: test.test_id,
            attempt: i,
            err_msg: attempt.error.message,
            err_type: attempt.error.error_type,
            stack: attempt.error.stack_trace || '',
            err_file: attempt.error.file || '',
            err_line: attempt.error.line || 0,
            err_col: attempt.error.column || 0,
            snippet: attempt.error.code_snippet || null,
            failed_step: failedStep?.title || null,
            locator: attempt.error.locator || null,
          });
        }
      }
    }

    return records;
  }

  /**
   * Generate attachment records and copy attachment files
   */
  private async generateAttachmentRecords(
    run: NormalizedTestRun,
    outputDir: string
  ): Promise<{ records: AttachmentRecord[]; copiedCount: number; failedCount: number }> {
    const allRecords: AttachmentRecord[] = [];
    let totalCopied = 0;
    let totalFailed = 0;

    for (const test of run.tests) {
      for (let i = 0; i < test.attempts.length; i++) {
        const attempt = test.attempts[i];
        
        if (attempt.attachments.length > 0) {
          const { records, copiedCount, failedCount } = await copyAttachments(
            attempt.attachments,
            outputDir,
            run.run_id,
            test.test_id,
            i
          );
          
          allRecords.push(...records);
          totalCopied += copiedCount;
          totalFailed += failedCount;
        }
      }
    }

    return { records: allRecords, copiedCount: totalCopied, failedCount: totalFailed };
  }

  /**
   * Generate manifest records
   */
  private generateManifestRecords(
    run: NormalizedTestRun,
    summaryCount: number,
    detailsCount: number,
    errorsCount: number,
    attachmentsCount: number
  ): (ManifestRunStart | ManifestRunEnd | ManifestFileIndex)[] {
    // Count statuses
    let passedCnt = 0;
    let failedCnt = 0;
    let flakyCnt = 0;
    let skippedCnt = 0;

    for (const test of run.tests) {
      switch (test.final_status) {
        case 'passed':
          passedCnt++;
          break;
        case 'failed':
          failedCnt++;
          break;
        case 'flaky':
          flakyCnt++;
          break;
        case 'skipped':
          skippedCnt++;
          break;
      }
    }

    const totalDuration = run.tests.reduce((sum, t) => sum + t.total_duration_ms, 0);

    const runStart: ManifestRunStart = {
      schema_version: '1.0',
      run_id: run.run_id,
      type: 'run_start',
      started_at: run.started_at,
      git_commit: run.metadata.git_commit,
      git_branch: run.metadata.git_branch,
      ci_url: run.metadata.ci_build_url,
      pw_version: run.metadata.tool_version,
      environment: run.metadata.environment,
      tag: run.metadata.tag,
      category: run.metadata.category,
    };

    const runEnd: ManifestRunEnd = {
      schema_version: '1.0',
      run_id: run.run_id,
      type: 'run_end',
      ended_at: run.ended_at || new Date().toISOString(),
      dur_ms: totalDuration,
      test_cnt: run.tests.length,
      passed_cnt: passedCnt,
      failed_cnt: failedCnt,
      flaky_cnt: flakyCnt,
      skipped_cnt: skippedCnt,
    };

    // Determine file extension based on archived option
    const fileExtension = this.options.archived ? '.jsonl.gz' : '.jsonl';
    
    const fileIndex: ManifestFileIndex = {
      schema_version: '1.0',
      run_id: run.run_id,
      type: 'file_index',
      files: [
        { name: `test-summary${fileExtension}`, cnt: summaryCount },
        { name: `test_details${fileExtension}`, cnt: detailsCount },
        { name: `errors${fileExtension}`, cnt: errorsCount },
        { name: `attachments-index${fileExtension}`, cnt: attachmentsCount },
      ],
    };

    return [runStart, runEnd, fileIndex];
  }

  /**
   * Write gzipped JSONL file
   */
  private writeFile(outputDir: string, filename: string, records: object[]): void {
    const filepath = path.join(outputDir, filename);
    writeJsonlGz(filepath, records, { compressLevel: this.options.compressLevel });
  }

  /**
   * Write plain text JSONL file
   */
  private writePlainFile(outputDir: string, filename: string, records: object[]): void {
    const filepath = path.join(outputDir, filename);
    writeJsonl(filepath, records);
  }

  /**
   * Write sample formatted JSON file for documentation
   */
  private writeSampleFile(
    outputDir: string,
    summaryRecords: TestSummaryRecord[],
    testDetailsRecords: TestDetailsRecord[],
    errorsRecords: ErrorsRecord[],
    attachmentRecords: AttachmentRecord[],
    manifestRecords: (ManifestRunStart | ManifestRunEnd | ManifestFileIndex)[]
  ): void {
    const sampleOutput = {
      _comment: 'Optimized schema - shortened field names, schema_version only in manifest',
      manifest_sample: manifestRecords[0],
      test_summary_sample: summaryRecords.find((r) => r.status === 'failed') || summaryRecords[0],
      test_details_sample: testDetailsRecords.find((r) => r.steps.length > 0 && r.attempt === 0) || testDetailsRecords[0],
      errors_sample: errorsRecords[0] || null,
      attachments_index_sample: attachmentRecords[0] || null,
    };

    fs.writeFileSync(path.join(outputDir, 'sample-formatted.json'), JSON.stringify(sampleOutput, null, 2));
  }
}

