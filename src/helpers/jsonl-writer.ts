/**
 * JSONL File Writer
 *
 * Utilities for writing JSON Lines format files with optional gzip compression
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

/**
 * Options for JSONL writer
 */
export interface JsonlWriterOptions {
  /** Gzip compression level (1-9). Default: 6 */
  compressLevel?: number;
}

/**
 * Write records to a gzipped JSONL file
 *
 * @param filepath - Full path to output file (should end with .jsonl.gz)
 * @param records - Array of objects to write
 * @param options - Writer options
 *
 * @example
 * writeJsonlGz('./output/data.jsonl.gz', [{ id: 1 }, { id: 2 }])
 */
export function writeJsonlGz(
  filepath: string,
  records: object[],
  options: JsonlWriterOptions = {}
): void {
  const { compressLevel = 6 } = options;

  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Convert records to JSONL format
  const jsonl = records.map((r) => JSON.stringify(r)).join('\n');

  // Gzip compress
  const gzipped = zlib.gzipSync(jsonl, { level: compressLevel });

  // Write to file
  fs.writeFileSync(filepath, new Uint8Array(gzipped));
}

/**
 * Write records to a plain text JSONL file
 *
 * @param filepath - Full path to output file (should end with .jsonl)
 * @param records - Array of objects to write
 *
 * @example
 * writeJsonl('./output/data.jsonl', [{ id: 1 }, { id: 2 }])
 */
export function writeJsonl(filepath: string, records: object[]): void {
  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Convert records to JSONL format (one JSON object per line)
  const jsonl = records.map((r) => JSON.stringify(r)).join('\n');

  // Write to file
  fs.writeFileSync(filepath, jsonl);
}

/**
 * Read records from a JSONL file (plain text or gzipped)
 *
 * @param filepath - Path to JSONL file
 * @returns Array of parsed objects
 *
 * @example
 * const records = readJsonl('./output/data.jsonl.gz')
 */
export function readJsonl<T = object>(filepath: string): T[] {
  let content: string;

  if (filepath.endsWith('.gz')) {
    const compressed = fs.readFileSync(filepath);
    content = zlib.gunzipSync(compressed).toString('utf-8');
  } else {
    content = fs.readFileSync(filepath, 'utf-8');
  }

  // Parse each line as JSON
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

/**
 * Append records to a JSONL file
 *
 * @param filepath - Path to JSONL file
 * @param records - Records to append
 */
export function appendJsonl(filepath: string, records: object[]): void {
  const jsonl = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.appendFileSync(filepath, jsonl);
}

/**
 * Create a streaming JSONL writer for large files
 *
 * @param filepath - Path to output file
 * @returns Writer interface with write() and close() methods
 */
export function createJsonlStream(filepath: string): {
  write: (record: object) => void;
  close: () => void;
} {
  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const stream = fs.createWriteStream(filepath, { flags: 'a' });
  let isFirst = true;

  return {
    write: (record: object) => {
      const line = (isFirst ? '' : '\n') + JSON.stringify(record);
      stream.write(line);
      isFirst = false;
    },
    close: () => {
      stream.end();
    },
  };
}

