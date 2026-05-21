import { describe, expect, test } from 'bun:test';
import type { OperationContext } from '../../../src/core/operations.ts';
import { list_executives } from '../../../src/ebrain/ops/list-executives.ts';
import { withEngine } from '../executives/helpers.ts';

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function makeCtx(engine: OperationContext['engine'], remote: boolean): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote,
    sourceId: 'enterprise',
  };
}

describe('list_executives operation', () => {
  test('declares read scope and remains available to remote callers with redacted profiles', async () => {
    expect(list_executives.scope).toBe('read');
    expect(list_executives.localOnly).toBe(false);

    await withEngine(async (engine) => {
      await engine.executeRaw(
        `INSERT INTO executives (
           executive_id, email, display_name, role, soul_path, access_policy_path,
           timezone, feishu_user_id, dingtalk_user_id, wecom_user_id, push_preferences, active
         )
         VALUES
           (
             'ceo', 'ceo@example.test', 'CEO Example', 'CEO',
             'executives/ceo/SOUL.md', 'executives/ceo/AGENT_PERSONA.md',
             'Asia/Shanghai', 'ou_ceo', 'dt_ceo', 'wc_ceo',
             $1::jsonb, true
           ),
           (
             'coo', 'coo@example.test', 'COO Example', 'COO',
             'executives/coo/SOUL.md', 'executives/coo/AGENT_PERSONA.md',
             'Asia/Tokyo', NULL, NULL, NULL, '{}'::jsonb, false
           )`,
        [JSON.stringify({
          morning_brief: { enabled: true, time: '08:30', channel: 'feishu' },
          critical_signal: { enabled: true, min_severity: 3, quiet_hours: '22:00-07:00' },
          conflict_alert: { enabled: true },
        })],
      );

      const activeOnly = await list_executives.handler(makeCtx(engine, true), {});
      expect(activeOnly).toHaveLength(1);

      const row = (activeOnly as Array<Record<string, unknown>>)[0];
      expect(row).toMatchObject({
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        timezone: 'Asia/Shanghai',
        feishuUserId: 'ou_ceo',
        dingtalkUserId: 'dt_ceo',
        wecomUserId: 'wc_ceo',
        pushPreferences: {
          morning_brief: { enabled: true, channel: 'feishu' },
          critical_signal: { enabled: true, min_severity: 3 },
          conflict_alert: { enabled: true },
        },
      });
      expect(row.soulPath).toBeUndefined();
      expect(row.preferencesPath).toBeUndefined();
      expect(row.access_policy_path).toBeUndefined();
      expect(JSON.stringify(row)).not.toContain('quiet_hours');
      expect(JSON.stringify(row)).not.toContain('08:30');

      const all = await list_executives.handler(makeCtx(engine, true), { active_only: false });
      expect(all).toHaveLength(2);
    });
  }, 30_000);
});
