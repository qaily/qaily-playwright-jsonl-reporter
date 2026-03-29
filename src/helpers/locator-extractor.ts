/**
 * Locator Extraction Helper
 *
 * Extracts locator information from Playwright error messages
 */

/**
 * Extract locator selector from error message
 *
 * Supports:
 * - locator('selector') format
 * - getByText/getByRole/etc. format
 *
 * @param message - Error message containing locator info
 * @returns Extracted locator selector or null if not found
 *
 * @example
 * extractLocator("locator.click: Timeout waiting for locator('button')")
 * // Returns: 'button'
 *
 * @example
 * extractLocator("getByRole('button', { name: 'Submit' })")
 * // Returns: "getByRole('button', { name: 'Submit' })"
 */
export function extractLocator(message: string): string | null {
  // Try locator('selector') format
  const locatorMatch = message.match(/locator\(['"]([^'"]+)['"]\)/);
  if (locatorMatch) {
    return locatorMatch[1];
  }

  // Try getByXxx format (getByText, getByRole, getByTestId, etc.)
  const getByMatch = message.match(/getBy\w+\(['"][^'"]+['"]/);
  if (getByMatch) {
    return getByMatch[0];
  }

  // Try to extract from "waiting for" pattern
  const waitingForMatch = message.match(/waiting for (locator\([^)]+\)|getBy\w+\([^)]+\))/);
  if (waitingForMatch) {
    return waitingForMatch[1];
  }

  return null;
}

/**
 * Extract all locators from an error message
 *
 * @param message - Error message potentially containing multiple locators
 * @returns Array of extracted locator selectors
 */
export function extractAllLocators(message: string): string[] {
  const locators: string[] = [];

  // Find all locator('selector') patterns
  const locatorMatches = message.matchAll(/locator\(['"]([^'"]+)['"]\)/g);
  for (const match of locatorMatches) {
    locators.push(match[1]);
  }

  // Find all getByXxx patterns
  const getByMatches = message.matchAll(/getBy\w+\(['"][^'"]+['"]/g);
  for (const match of getByMatches) {
    if (!locators.includes(match[0])) {
      locators.push(match[0]);
    }
  }

  return locators;
}

/**
 * Get the locator type from a locator string
 *
 * @param locator - Locator string
 * @returns Locator type ('css', 'xpath', 'text', 'role', 'testid', 'label', 'placeholder', 'title', 'unknown')
 */
export function getLocatorType(locator: string): string {
  if (locator.startsWith('getByRole')) return 'role';
  if (locator.startsWith('getByText')) return 'text';
  if (locator.startsWith('getByTestId')) return 'testid';
  if (locator.startsWith('getByLabel')) return 'label';
  if (locator.startsWith('getByPlaceholder')) return 'placeholder';
  if (locator.startsWith('getByTitle')) return 'title';
  if (locator.startsWith('getByAltText')) return 'alttext';
  if (locator.startsWith('//') || locator.includes('xpath=')) return 'xpath';
  if (locator.startsWith('text=') || locator.startsWith('"')) return 'text';
  return 'css';
}

