import { describe, expect, test } from 'bun:test';
import type { OperationContext } from '../../../src/core/operations.ts';
import { withEngine } from '../executives/helpers.ts';
import {
  runFanoutExecutiveBrief,
} from '../../../src/ebrain/jobs/fanout-executive-brief.ts';

interface Submission {
  job: { name: string; queue?: string; data: Record<string, unknown> };
  opts?: Record<string, unknown>;
}

function makeCtx(engine: OperationContext['engine']): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: { info() {}, warn() {}, error() {} },
    dryRun: false,
    remote: false,
    sourceId: 'enterprise',
  } as OperationContext;
}

async function seedExecutive(
  engine: OperationContext['engine'],
  executiveId: string,
  opts: { timezone?: string; active?: boolean; deleted?: boolean } = {},
): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO executives (
       executive_id,
       email,
       display_name,
       role,
       soul_path,
       access_policy_path,
       timezone,
       active,
       deleted_at,
       push_preferences
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${opts.deleted ? 'now()' : 'NULL'}, $9::jsonb)`,
    [
      executiveId,
      `${executiveId}@example.test`,
      `${executiveId.toUpperCase()} Example`,
      'executive',
      `executives/${executiveId}/SOUL.md`,
      `executives/${executiveId}/access-policy.yml`,
      opts.timezone ?? 'Asia/Shanghai',
      opts.active ?? true,
      JSON.stringify({ morning_brief: { enabled: true, time: '08:00', channel: 'dingtalk' } }),
    ],
  );
}

function installSubmitSpy(engine: OperationContext['engine']): Submission[] {
  const submissions: Submission[] = [];
  (engine as unknown as { submitJob: unknown }).submitJob = async (
    job: Submission['job'],
    opts?: Record<string, unknown>,
  ) => {
    submissions.push({ job, opts });
    return { id: 1000 + submissions.length };
  };
  return submissions;
}

describe('runFanoutExecutiveBrief', () => {
  test('submits one child job per active, non-deleted executive', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine, 'ceo');
      await seedExecutive(engine, 'coo');
      await seedExecutive(engine, 'cfo');
      await seedExecutive(engine, 'deleted-exec', { deleted: true });
      await seedExecutive(engine, 'inactive-exec', { active: false });
      const submissions = installSubmitSpy(engine);

      const result = await runFanoutExecutiveBrief(makeCtx(engine), {
        id: 77,
        data: { dateUtc: '2026-05-21' },
      });

      expect(result.submitted).toBe(3);
      expect(result.child_ids).toEqual([1001, 1002, 1003]);
      expect(submissions.map((entry) => entry.job.data.executiveId)).toEqual(['ceo', 'cfo', 'coo']);
      expect(submissions.every((entry) => entry.job.name === 'ebrain-executive-brief')).toBe(true);
      expect(submissions.every((entry) => entry.opts?.parent_job_id === 77)).toBe(true);
      expect(submissions.every((entry) => entry.opts?.on_child_fail === 'continue')).toBe(true);
    });
  });

  test('passes deterministic per-executive idempotency keys to child jobs', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine, 'cto', { timezone: 'Asia/Tokyo' });
      const submissions = installSubmitSpy(engine);

      await runFanoutExecutiveBrief(makeCtx(engine), {
        id: 88,
        data: { dateUtc: '2026-05-21' },
      });

      expect(submissions).toHaveLength(1);
      expect(submissions[0].job.data).toMatchObject({
        executiveId: 'cto',
        dateUtc: '2026-05-21T00:00:00.000Z',
        idempotency_key: 'executive-brief:2026-05-21:cto',
      });
      expect(submissions[0].opts).toMatchObject({
        parent_job_id: 88,
        idempotency_key: 'executive-brief:2026-05-21:cto',
      });
    });
  });
});
