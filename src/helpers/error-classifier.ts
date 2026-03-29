/**
 * Error Classification Helper
 *
 * Categorizes errors by type based on message content
 */

import type { ErrorType } from '../types';

/**
 * Classify error type from error message
 *
 * @param message - Error message to classify
 * @returns Classified error type
 *
 * @example
 * classifyError('TimeoutError: locator.click: Timeout 30000ms exceeded')
 * // Returns: 'timeout'
 *
 * @example
 * classifyError('expect(received).toBe(expected)')
 * // Returns: 'assertion'
 */
export function classifyError(message: string): ErrorType {
  const lowerMsg = message.toLowerCase();

  // Timeout errors
  if (lowerMsg.includes('timeout') || lowerMsg.includes('exceeded')) {
    return 'timeout';
  }

  // Assertion errors (Jest/Playwright expect)
  if (lowerMsg.includes('expect') || lowerMsg.includes('tobe') || lowerMsg.includes('assertion')) {
    return 'assertion';
  }

  // Element not found errors (locator-based)
  if (lowerMsg.includes('locator') && (lowerMsg.includes('waiting for') || lowerMsg.includes('not found'))) {
    return 'element_not_found';
  }

  // Network errors
  if (lowerMsg.includes('net::') || lowerMsg.includes('err_') || lowerMsg.includes('network')) {
    return 'network';
  }

  return 'unknown';
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(message: string): boolean {
  return classifyError(message) === 'timeout';
}

/**
 * Check if error is an assertion error
 */
export function isAssertionError(message: string): boolean {
  return classifyError(message) === 'assertion';
}

/**
 * Check if error is an element not found error
 */
export function isElementNotFoundError(message: string): boolean {
  return classifyError(message) === 'element_not_found';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(message: string): boolean {
  return classifyError(message) === 'network';
}

