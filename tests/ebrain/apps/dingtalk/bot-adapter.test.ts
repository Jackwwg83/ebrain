import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import { seedDingtalkApp, seedTenantToken, setupEngine, teardownEngine, makeDingtalkApp } from './helpers.ts';
import type { PGLiteEngine } from '../../../../src/core/pglite-engine.ts';
import type { FetchLike } from '../../../../src/ebrain/apps/dingtalk/types.ts';

let engine: PGLiteEngine;

beforeEach(async () => {
  ({ engine } = await setupEngine());
  await seedDingtalkApp(engine);
  await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');
});

afterEach(async () => {
  await teardownEngine(engine);
});

describe('DingtalkBotAdapter', () => {
  test('sendReply calls robot endpoint with token headers and markdown body', async () => {
    const calls: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
    const fetchImpl: FetchLike = async (input, init) => {
      calls.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)),
      });
      return Response.json({ errcode: 0 });
    };
    const app = makeDingtalkApp({ engine, fetch: fetchImpl });

    await app.botAdapter.sendReply('cid-123', { markdown: '## hello\nDingTalk markdown reply' });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.dingtalk.com/v1.0/robot/groupMessages/send');
    expect(calls[0].headers.get('x-acs-dingtalk-access-token')).toBe('tenant-token');
    expect(calls[0].body.openConversationId).toBe('cid-123');
    expect(calls[0].body.sendBizType).toBe('cardWithBindMethod');
    expect(String(calls[0].body.msgParam)).toContain('DingTalk markdown reply');
  });

  test('pushToUser marks disabled_at and does not retry when user opted out', async () => {
    await engine.executeRaw(
      `INSERT INTO executives (
         executive_id, email, display_name, role, soul_path, access_policy_path, dingtalk_user_id
       ) VALUES ('exec-1', 'exec1@example.test', 'Exec One', 'tester', 'executives/exec-1/SOUL.md', 'executives/exec-1/ACCESS_POLICY.md', 'dt-user-disabled')`,
    );
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls += 1;
      return Response.json({ errcode: 'user_disabled_notification', errmsg: 'user has disabled notifications' }, { status: 400 });
    };
    const app = makeDingtalkApp({ engine, fetch: fetchImpl });

    await app.botAdapter.pushToUser('dt-user-disabled', {
      subject: 'Morning brief',
      bodyMarkdown: 'No retry after opt-out.',
      urgency: 'low',
    });

    const rows = await engine.executeRaw<{ push_preferences: Record<string, { disabled_at?: string }> }>(
      `SELECT push_preferences FROM executives WHERE executive_id = 'exec-1'`,
    );
    expect(calls).toBe(1);
    expect(rows[0].push_preferences.dingtalk.disabled_at).toBe('2026-05-20T02:00:00.000Z');

    await app.botAdapter.pushToUser('dt-user-disabled', {
      subject: 'Morning brief again',
      bodyMarkdown: 'This local opt-out should skip DingTalk.',
      urgency: 'low',
    });
    expect(calls).toBe(1);
  });
});
