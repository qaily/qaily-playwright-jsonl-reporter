/**
 * ANSI Escape Code Stripper
 *
 * Removes ANSI escape codes from text for clean output
 */

// ANSI escape code regex pattern
// Matches sequences like \u001b[31m (red), \u001b[0m (reset), etc.
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

/**
 * Strip ANSI escape codes from text
 *
 * @param text - Text potentially containing ANSI codes
 * @returns Clean text without ANSI codes
 *
 * @example
 * stripAnsi('\u001b[31mError\u001b[0m: Something went wrong')
 * // Returns: 'Error: Something went wrong'
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '');
}

/**
 * Check if text contains ANSI escape codes
 *
 * @param text - Text to check
 * @returns True if text contains ANSI codes
 */
export function hasAnsiCodes(text: string): boolean {
  return ANSI_PATTERN.test(text);
}

/**
 * Strip ANSI codes and normalize whitespace
 *
 * @param text - Text to clean
 * @returns Cleaned text with normalized whitespace
 */
export function cleanText(text: string): string {
  return stripAnsi(text).replace(/\s+/g, ' ').trim();
}

