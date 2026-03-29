/**
 * String Utility Functions
 */

/**
 * Truncate string to max length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 500)
 * @returns Truncated text with '...' if exceeded
 *
 * @example
 * truncate('This is a long string', 10)
 * // Returns: 'This is...'
 */
export function truncate(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate run ID from timestamp and git hash
 *
 * @param startTime - ISO 8601 timestamp string
 * @param gitHash - Git commit hash (optional)
 * @returns Run ID in format: {timestamp}_{hash}
 *
 * @example
 * generateRunId('2025-12-09T06:05:22.386Z', '8bfed0960384f0b9095ab7c1083393be11902da9')
 * // Returns: '2025-12-09T06-05-22_8bfed09'
 */
export function generateRunId(startTime: string, gitHash?: string): string {
  const timestamp = new Date(startTime).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const hash = gitHash?.slice(0, 7) || 'unknown';
  return `${timestamp}_${hash}`;
}

/**
 * Get first line of text
 *
 * @param text - Multi-line text
 * @returns First line
 */
export function getFirstLine(text: string): string {
  return text.split('\n')[0];
}

/**
 * Normalize path separators to forward slashes
 *
 * @param filePath - File path
 * @returns Normalized path
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

