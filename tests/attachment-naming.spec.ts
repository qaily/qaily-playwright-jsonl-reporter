import { test, expect } from '@playwright/test';
import { attachmentKey, attachmentKind, MAX_ATTACHMENT_NAME } from '../src/helpers/attachment-naming';

const TEST_A = '02509f43dff95374744e-0faccf64c94568194506';
const TEST_B = '02509f43dff95374744e-169d0000000000000000';

test.describe('attachmentKind', () => {
  test('maps known names to short codes', () => {
    expect(attachmentKind('screenshot', 'test-failed-1.png')).toBe('shot-1');
    expect(attachmentKind('screenshot', 'test-failed-2.png')).toBe('shot-2');
    expect(attachmentKind('logs', 'debug.log')).toBe('debug');
    expect(attachmentKind('error-context', 'error-context.md')).toBe('ctx');
    expect(attachmentKind('trace', 'trace.zip')).toBe('trace');
    expect(attachmentKind('network-log-filtered', `network-log-filtered-${'a'.repeat(40)}.jsonl`)).toBe('net-f');
    expect(attachmentKind('network-log-verbose', `network-log-verbose-${'a'.repeat(40)}.jsonl`)).toBe('net-v');
  });

  test('slugs unknown names to at most 8 chars', () => {
    expect(attachmentKind('Some Custom Attachment!')).toBe('some-cus');
    expect(attachmentKind('video')).toBe('video');
    expect(attachmentKind('a-------b')).toBe('a-b');
    expect(attachmentKind('abcdefg-hij')).toBe('abcdefg');
    expect(attachmentKind('!!!')).toBe('att');
  });
});

test.describe('attachmentKey', () => {
  test('builds the documented format', () => {
    expect(attachmentKey({ testId: TEST_A, retry: 0, kind: 'debug', ext: '.log' })).toBe(`${TEST_A}-r0-debug.log`);
    expect(attachmentKey({ testId: TEST_A, retry: 1, kind: 'net-f', counter: 2, ext: '.jsonl' })).toBe(
      `${TEST_A}-r1-net-f-2.jsonl`
    );
  });

  test('two tests from the same spec, same retry -> different keys', () => {
    const a = attachmentKey({ testId: TEST_A, retry: 1, kind: 'debug', ext: '.log' });
    const b = attachmentKey({ testId: TEST_B, retry: 1, kind: 'debug', ext: '.log' });
    expect(a).not.toBe(b);
  });

  test('same test, retries 0 and 1 -> different keys', () => {
    const r0 = attachmentKey({ testId: TEST_A, retry: 0, kind: 'trace', ext: '.zip' });
    const r1 = attachmentKey({ testId: TEST_A, retry: 1, kind: 'trace', ext: '.zip' });
    expect(r0).not.toBe(r1);
  });

  test('repeatEachIndex 0 gives no x, 2 gives -x2', () => {
    expect(attachmentKey({ testId: TEST_A, retry: 0, repeatEachIndex: 0, kind: 'ctx', ext: '.md' })).toBe(
      `${TEST_A}-r0-ctx.md`
    );
    expect(attachmentKey({ testId: TEST_A, retry: 0, repeatEachIndex: 2, kind: 'ctx', ext: '.md' })).toBe(
      `${TEST_A}-r0-x2-ctx.md`
    );
  });

  test('two network logs in one attempt -> net-f, net-f-2', () => {
    expect(attachmentKey({ testId: TEST_A, retry: 0, kind: 'net-f', counter: 1, ext: '.jsonl' })).toBe(
      `${TEST_A}-r0-net-f.jsonl`
    );
    expect(attachmentKey({ testId: TEST_A, retry: 0, kind: 'net-f', counter: 2, ext: '.jsonl' })).toBe(
      `${TEST_A}-r0-net-f-2.jsonl`
    );
  });

  test(`every kind fits in ${MAX_ATTACHMENT_NAME} chars, including the worst case`, () => {
    const kinds: Array<[string, string]> = [
      ['screenshot', '.png'],
      ['logs', '.log'],
      ['error-context', '.md'],
      ['trace', '.zip'],
      ['network-log-filtered', '.jsonl'],
      ['network-log-verbose', '.jsonl'],
      ['some unknown attachment name', '.jsonl'],
    ];
    for (const [name, ext] of kinds) {
      const kind = attachmentKind(name, `test-failed-1${ext}`);
      const key = attachmentKey({ testId: TEST_A, retry: 9, repeatEachIndex: 99, kind, counter: 9, ext });
      expect(key.length, key).toBeLessThanOrEqual(MAX_ATTACHMENT_NAME);
      expect(key.startsWith(TEST_A), key).toBe(true);
    }
  });

  test('cuts the kind, never the test id, when the name would be too long', () => {
    const key = attachmentKey({ testId: TEST_A, retry: 10, repeatEachIndex: 999, kind: 'longkind', counter: 99, ext: '.jsonl' });
    expect(key.length).toBeLessThanOrEqual(MAX_ATTACHMENT_NAME);
    expect(key.startsWith(`${TEST_A}-r10-x999-`)).toBe(true);
    expect(key.endsWith('-99.jsonl')).toBe(true);
  });
});
