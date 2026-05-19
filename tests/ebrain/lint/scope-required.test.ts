import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../../../src/ebrain/lint/scope-required.ts';

const cleanup: string[] = [];

function tempOpsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ebrain-scope-required-'));
  cleanup.push(dir);
  return dir;
}

function stderrCapture(): { messages: string[]; stderr: Pick<typeof console, 'error'> } {
  const messages: string[] = [];
  return {
    messages,
    stderr: {
      error(message?: unknown) {
        messages.push(String(message));
      },
    },
  };
}

afterEach(() => {
  while (cleanup.length > 0) {
    const dir = cleanup.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('Ebrain scope-required lint', () => {
  test('passes current placeholder ops directory', async () => {
    const captured = stderrCapture();
    const code = await main({
      opsDir: join(process.cwd(), 'src/ebrain/ops'),
      stderr: captured.stderr,
    });

    expect(code).toBe(0);
    expect(captured.messages).toEqual([]);
  });

  test('fails an operation file without scope or localOnly', async () => {
    const opsDir = tempOpsDir();
    writeFileSync(
      join(opsDir, 'missing-scope.ts'),
      `export const listExecutives = {
        name: 'list_executives',
        handler: async () => ({})
      };
`,
    );

    const captured = stderrCapture();
    const code = await main({ opsDir, stderr: captured.stderr });

    expect(code).toBe(1);
    expect(captured.messages.join('\n')).toContain('missing-scope.ts');
    expect(captured.messages.join('\n')).toContain('missing scope, localOnly');
  });

  test('fails an operation file with scope but without localOnly', async () => {
    const opsDir = tempOpsDir();
    writeFileSync(
      join(opsDir, 'missing-local-only.ts'),
      `export const listExecutives = {
        name: 'list_executives',
        scope: 'read',
        handler: async () => ({})
      };
`,
    );

    const captured = stderrCapture();
    const code = await main({ opsDir, stderr: captured.stderr });

    expect(code).toBe(1);
    expect(captured.messages.join('\n')).toContain('missing-local-only.ts');
    expect(captured.messages.join('\n')).toContain('missing localOnly');
  });

  test('fails an operation file with localOnly but without scope', async () => {
    const opsDir = tempOpsDir();
    writeFileSync(
      join(opsDir, 'missing-scope.ts'),
      `export const listExecutives = {
        name: 'list_executives',
        localOnly: false,
        handler: async () => ({})
      };
`,
    );

    const captured = stderrCapture();
    const code = await main({ opsDir, stderr: captured.stderr });

    expect(code).toBe(1);
    expect(captured.messages.join('\n')).toContain('missing-scope.ts');
    expect(captured.messages.join('\n')).toContain('missing scope');
  });

  test('passes an operation file with scope and localOnly', async () => {
    const opsDir = tempOpsDir();
    writeFileSync(
      join(opsDir, 'with-required-fields.ts'),
      `export const listExecutives = {
        name: 'list_executives',
        scope: 'read',
        localOnly: false,
        handler: async () => ({})
      };
`,
    );

    const captured = stderrCapture();
    const code = await main({ opsDir, stderr: captured.stderr });

    expect(code).toBe(0);
    expect(captured.messages).toEqual([]);
  });
});
