import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runExecutives } from '../../../src/commands/executives.ts';
import { withEngine } from './helpers.ts';

const REPO = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '');

async function runCli(
  args: string[],
  env: Record<string, string>,
  cwd: string,
  timeoutMs = 90_000,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', 'run', `${REPO}/src/cli.ts`, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const killer = setTimeout(() => {
    try { proc.kill('SIGKILL'); } catch { /* already exited */ }
  }, timeoutMs);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { exitCode, stdout, stderr };
  } finally {
    clearTimeout(killer);
  }
}

describe('executives CLI exit codes', () => {
  const cleanupPaths: string[] = [];

  afterEach(() => {
    for (const path of cleanupPaths.splice(0)) {
      try { rmSync(path, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  });

  test('runExecutives returns 1 when validate target is missing', async () => {
    await withEngine(async (engine) => {
      const exitCode = await runExecutives(engine, ['validate', 'missing-id']);
      expect(exitCode).toBe(1);
    });
  }, 30_000);

  test('real spawned CLI returns non-zero for create/validate/update failures', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ebrain-executives-cli-home-'));
    const brain = mkdtempSync(join(tmpdir(), 'ebrain-executives-cli-brain-'));
    cleanupPaths.push(home, brain);

    const env = {
      HOME: home,
      GBRAIN_HOME: home,
    };

    const init = await runCli(['init', '--pglite', '--no-embedding'], env, brain, 120_000);
    expect(init.exitCode).toBe(0);

    const create = await runCli([
      'executives',
      'create',
      'ceo',
      '--email',
      'ceo@test.com',
      '--name',
      'Test CEO',
      '--role',
      'CEO',
    ], env, brain);
    expect(create.exitCode).toBe(0);
    expect(create.stdout).toContain('created executive ceo');

    const duplicate = await runCli([
      'executives',
      'create',
      'coo',
      '--email',
      'CEO@test.com',
      '--name',
      'Test COO',
      '--role',
      'COO',
    ], env, brain);
    expect(duplicate.exitCode).toBe(1);
    expect(duplicate.stderr).toContain('executives_email_lower_uidx');

    const validateMissingFiles = await runCli(['executives', 'validate', 'ceo'], env, brain);
    expect(validateMissingFiles.exitCode).toBe(1);
    expect(validateMissingFiles.stdout).toContain('FAIL SOUL executives/ceo/SOUL.md');

    const updateMissing = await runCli(
      ['executives', 'update', 'missing-id', '--timezone', 'Asia/Tokyo'],
      env,
      brain,
    );
    expect(updateMissing.exitCode).toBe(1);
    expect(updateMissing.stderr).toContain('executive not found: missing-id');
  }, 240_000);
});
