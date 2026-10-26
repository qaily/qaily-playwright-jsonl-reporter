/**
 * Attachment Naming
 *
 * Builds the stored file name (key) for an attachment:
 *
 *   <testId>-r<retry>[-x<repeat>]-<kind>[-<n>].<ext>
 *
 * This is the only place an attachment key is built.
 */

/** Hard limit for an attachment file name (keeps full paths under Windows MAX_PATH) */
export const MAX_ATTACHMENT_NAME = 64;

/** Max length of a kind slug derived from an unknown attachment name */
const MAX_KIND_SLUG = 8;

/** Short kind codes for known attachment names */
const KIND_CODES: Record<string, string> = {
  logs: 'debug',
  'error-context': 'ctx',
  trace: 'trace',
  'network-log-filtered': 'net-f',
  'network-log-verbose': 'net-v',
};

export interface AttachmentKeyParts {
  /** Full Playwright test id (`<fileHash>-<testHash>`) */
  testId: string;
  /** `testInfo.retry` */
  retry: number;
  /** `testInfo.repeatEachIndex` (only shown when > 0) */
  repeatEachIndex?: number;
  /** Short kind code, see {@link attachmentKind} */
  kind: string;
  /** 1-based counter of this kind within one attempt (only shown when > 1) */
  counter?: number;
  /** Original extension including the dot (e.g. `.png`), or '' */
  ext: string;
}

/**
 * Turn any text into a lowercase `[a-z0-9-]` slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get the short kind code for an attachment
 *
 * @param name - Attachment name as reported by Playwright (e.g. 'screenshot')
 * @param originalFileName - Base name of the original file (e.g. 'test-failed-1.png')
 * @returns Kind code (e.g. 'shot-1', 'debug', 'net-v')
 */
export function attachmentKind(name: string, originalFileName: string = ''): string {
  if (name === 'screenshot') {
    // Keep Playwright's own screenshot number (test-failed-1.png -> shot-1)
    const match = /-(\d+)\.[^.]*$/.exec(originalFileName);
    return match ? `shot-${match[1]}` : 'shot';
  }

  const code = KIND_CODES[name];
  if (code) return code;

  return slugify(name).slice(0, MAX_KIND_SLUG).replace(/-+$/, '') || 'att';
}

/**
 * Build the attachment key (stored file name)
 *
 * If the name would exceed {@link MAX_ATTACHMENT_NAME}, the kind is cut; the test id never is.
 *
 * @example
 * attachmentKey({ testId: '02509f43dff95374744e-0faccf64c94568194506', retry: 1, kind: 'net-f', counter: 2, ext: '.jsonl' })
 * // Returns: '02509f43dff95374744e-0faccf64c94568194506-r1-net-f-2.jsonl'
 */
export function attachmentKey(parts: AttachmentKeyParts): string {
  const testId = parts.testId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const repeat = parts.repeatEachIndex && parts.repeatEachIndex > 0 ? `-x${parts.repeatEachIndex}` : '';
  const counter = parts.counter && parts.counter > 1 ? `-${parts.counter}` : '';
  const ext = parts.ext.replace(/[^a-zA-Z0-9.]/g, '');

  const prefix = `${testId}-r${parts.retry}${repeat}-`;
  const suffix = `${counter}${ext}`;

  const room = MAX_ATTACHMENT_NAME - prefix.length - suffix.length;
  const kind = parts.kind.length > room ? parts.kind.slice(0, Math.max(1, room)).replace(/-+$/, '') : parts.kind;

  const key = `${prefix}${kind}${suffix}`;
  if (key.length > MAX_ATTACHMENT_NAME) {
    console.error(
      `[Playwright JSONL Reporter] Attachment name exceeds ${MAX_ATTACHMENT_NAME} chars: ${key}`
    );
  }
  return key;
}
