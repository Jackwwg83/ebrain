import { afterEach, describe, expect, test } from 'bun:test';
import type { BrainEngine } from '../../../src/core/engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import type { PushResult } from '../../../src/ebrain/bot/push-orchestrator.ts';
import type { ExecutiveProfile } from '../../../src/ebrain/types.ts';
import { _setLoadExecutiveProfileForTest } from '../../../src/ebrain/executives/load-profile.ts';
import { fakeExecutiveProfile, withEngine } from '../executives/helpers.ts';
import {
  _setExecutiveBriefDepsForTest,
  runExecutiveBrief,
} from '../../../src/ebrain/jobs/executive-brief.ts';

interface PutPageCall {
  slug: string;
  page: Record<string, unknown>;
  opts?: Record<string, unknown>;
}

interface ExecuteRawCall {
  sql: string;
  params?: unknown[];
}

function makeCtx(): {
  ctx: OperationContext;
  putPages: PutPageCall[];
  executeRawCalls: ExecuteRawCall[];
  logs: string[];
} {
  const putPages: PutPageCall[] = [];
  const executeRawCalls: ExecuteRawCall[] = [];
  const logs: string[] = [];
  const engine = {
    kind: 'pglite',
    async putPage(slug: string, page: Record<string, unknown>, opts?: Record<string, unknown>) {
      putPages.push({ slug, page, opts });
      return { slug, ...page };
    },
    async executeRaw(_sql: string, _params?: unknown[]) {
      executeRawCalls.push({ sql: _sql, params: _params });
      return [];
    },
  } as unknown as BrainEngine;

  return {
    ctx: {
      engine,
      config: { engine: 'pglite' },
      logger: {
        info: (msg) => logs.push(`info:${msg}`),
        warn: (msg) => logs.push(`warn:${msg}`),
        error: (msg) => logs.push(`error:${msg}`),
      },
      dryRun: false,
      remote: false,
      sourceId: 'enterprise',
    } as OperationContext,
    putPages,
    executeRawCalls,
    logs,
  };
}

function makeOperationCtx(engine: BrainEngine): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: { info() {}, warn() {}, error() {} },
    dryRun: false,
    remote: false,
    sourceId: 'enterprise',
  } as OperationContext;
}

function loadProfile(profile: ExecutiveProfile): void {
  _setLoadExecutiveProfileForTest(async () => profile);
}

function setPush(result: PushResult | ((attempt: number) => PushResult | Promise<PushResult>)): { calls: string[] } {
  const calls: string[] = [];
  _setExecutiveBriefDepsForTest({
    async pushMorningBrief(_engine, executiveId, content) {
      calls.push(`${executiveId}:${String(content).slice(0, 24)}`);
      return typeof result === 'function' ? result(calls.length) : result;
    },
  });
  return { calls };
}

afterEach(() => {
  _setLoadExecutiveProfileForTest(null);
  _setExecutiveBriefDepsForTest(null);
});

describe('runExecutiveBrief', () => {
  test('skips when morning_brief.enabled=false and does not push', async () => {
    const profile = fakeExecutiveProfile({
      pushPreferences: {
        morning_brief: { enabled: false, time: '08:00', channel: 'dingtalk' },
      },
    });
    loadProfile(profile);
    const { calls } = setPush({ pushed: true, skipped: false });
    const { ctx, putPages } = makeCtx();

    const result = await runExecutiveBrief(ctx, {
      executiveId: 'ceo',
      dateUtc: new Date('2026-05-21T00:00:00.000Z'),
    });

    expect(result).toEqual({ pushed: false, skipped: 'morning_brief.disabled' });
    expect(calls).toHaveLength(0);
    expect(putPages).toHaveLength(0);
  });

  test('skips during quiet_hours and records next_eligible_at without pushing', async () => {
    loadProfile(fakeExecutiveProfile({
      timezone: 'Asia/Shanghai',
      pushPreferences: {
        morning_brief: {
          enabled: true,
          time: '08:00',
          channel: 'dingtalk',
          quiet_hours: '22:00-07:00',
        } as never,
      },
    }));
    const { calls } = setPush({ pushed: true, skipped: false });
    const { ctx, putPages, logs } = makeCtx();

    const result = await runExecutiveBrief(ctx, {
      executiveId: 'ceo',
      dateUtc: new Date('2026-05-21T14:30:00.000Z'),
    });

    expect(result.pushed).toBe(false);
    expect(result.skipped).toBe('in_quiet_hours');
    expect(result.nextEligibleAt).toBe('2026-05-21T23:00:00.000Z');
    expect(calls).toHaveLength(0);
    expect(putPages).toHaveLength(0);
    expect(logs.some((line) => line.includes('next_eligible_at=2026-05-21T23:00:00.000Z'))).toBe(true);
  });

  test('generates the E2 stub page and pushes morning brief once on the normal path', async () => {
    loadProfile(fakeExecutiveProfile({
      pushPreferences: {
        morning_brief: { enabled: true, time: '08:00', channel: 'dingtalk' },
      },
    }));
    const { calls } = setPush({ pushed: true, skipped: false, provider: 'dingtalk', channel: 'user' });
    const { ctx, putPages, logs } = makeCtx();

    const result = await runExecutiveBrief(ctx, {
      executiveId: 'ceo',
      dateUtc: new Date('2026-05-21T00:00:00.000Z'),
    });

    expect(result.pushed).toBe(true);
    expect(result.briefSlug).toBe('briefs/daily/2026-05-21-ceo');
    expect(result.briefPath).toBe('briefs/daily/2026-05-21-ceo.md');
    expect(calls).toHaveLength(1);
    expect(putPages).toHaveLength(1);
    expect(putPages[0].slug).toBe('briefs/daily/2026-05-21-ceo');
    expect(putPages[0].opts).toEqual({ sourceId: 'enterprise' });
    expect(String(putPages[0].page.compiled_truth)).toContain('## 今日要点');
    expect(String(putPages[0].page.compiled_truth)).toContain('generator_stage: E2_stub');
    expect(putPages[0].page.frontmatter).toMatchObject({
      executive_id: 'ceo',
      brief_date: '2026-05-21',
      generator_stage: 'E2_stub',
      dream_generated: true,
    });
    expect(logs.some((line) => line.includes('brief gen stub — awaiting I1'))).toBe(true);
  });

  test('push failure retries three times, marks disabled_at, and returns soft failure', async () => {
    loadProfile(fakeExecutiveProfile({
      pushPreferences: {
        morning_brief: { enabled: true, time: '08:00', channel: 'dingtalk' },
      },
    }));
    const { calls } = setPush({ pushed: false, skipped: false, reason: 'adapter_failed' });
    const { ctx, executeRawCalls } = makeCtx();

    const result = await runExecutiveBrief(ctx, {
      executiveId: 'ceo',
      dateUtc: new Date('2026-05-21T00:00:00.000Z'),
    });

    expect(result.pushed).toBe(false);
    expect(result.pushResult).toMatchObject({ pushed: false, skipped: false, reason: 'adapter_failed' });
    expect(calls).toHaveLength(3);
    expect(executeRawCalls).toHaveLength(1);
    const prefs = JSON.parse(String(executeRawCalls[0].params?.[1])) as Record<string, { disabled_at?: string }>;
    expect(prefs.morning_brief.disabled_at).toBe('2026-05-21T00:00:00.000Z');
  });

  test('uses executive IANA timezone when deriving the brief date', async () => {
    loadProfile(fakeExecutiveProfile({
      timezone: 'Asia/Tokyo',
      pushPreferences: {
        morning_brief: {
          enabled: true,
          time: '08:00',
          channel: 'feishu',
          quiet_hours: '22:00-07:00',
        } as never,
      },
    }));
    setPush({ pushed: true, skipped: false, provider: 'feishu', channel: 'user' });
    const { ctx, putPages } = makeCtx();

    const result = await runExecutiveBrief(ctx, {
      executiveId: 'ceo',
      dateUtc: new Date('2026-05-21T00:00:00.000Z'),
    });

    expect(result.skipped).toBeUndefined();
    expect(result.briefSlug).toBe('briefs/daily/2026-05-21-ceo');
    expect(putPages[0].page.frontmatter).toMatchObject({
      brief_date: '2026-05-21',
      timezone: 'Asia/Tokyo',
    });
  });

  test('real PGLite path writes the generated brief as a DB page artifact', async () => {
    await withEngine(async (engine) => {
      await engine.executeRaw(
        `INSERT INTO sources (id, name, config)
         VALUES ('enterprise', 'enterprise', '{}'::jsonb)
         ON CONFLICT (id) DO NOTHING`,
      );
      await engine.executeRaw(
        `INSERT INTO executives (
           executive_id,
           email,
           display_name,
           role,
           soul_path,
           access_policy_path,
           timezone,
           dingtalk_user_id,
           push_preferences
         )
         VALUES (
           'ceo',
           'ceo@example.test',
           'CEO Example',
           'CEO',
           'executives/ceo/SOUL.md',
           'executives/ceo/access-policy.yml',
           'Asia/Shanghai',
           'dt-user-1',
           $1::jsonb
         )`,
        [JSON.stringify({ morning_brief: { enabled: true, provider: 'dingtalk', channel: 'user' } })],
      );
      const { calls } = setPush({ pushed: true, skipped: false, provider: 'dingtalk', channel: 'user' });

      const result = await runExecutiveBrief(makeOperationCtx(engine), {
        executiveId: 'ceo',
        dateUtc: new Date('2026-05-21T00:00:00.000Z'),
      });
      const page = await engine.getPage('briefs/daily/2026-05-21-ceo', { sourceId: 'enterprise' });

      expect(result.pushed).toBe(true);
      expect(calls).toHaveLength(1);
      expect(page?.compiled_truth).toContain('本日 brief 内容由 I1 stage skill 接管，当前为 stub 占位。');
      expect(page?.frontmatter).toMatchObject({
        executive_id: 'ceo',
        generator_stage: 'E2_stub',
        dream_generated: true,
      });
    });
  });
});
