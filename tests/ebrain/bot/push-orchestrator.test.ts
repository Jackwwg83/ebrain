import { describe, expect, test } from 'bun:test';
import type { EnterpriseApp, PushContent } from '../../../src/ebrain/apps/base/index.ts';
import { pushMorningBrief } from '../../../src/ebrain/bot/push-orchestrator.ts';

function makeEngine(pushPreferences: Record<string, unknown>) {
  return {
    async executeRaw() {
      return [{
        executive_id: 'exec-1',
        feishu_user_id: null,
        dingtalk_user_id: 'dt-user-1',
        wecom_user_id: null,
        push_preferences: pushPreferences,
      }];
    },
  };
}

function makeDingtalkApp(calls: Array<{ kind: 'user' | 'channel'; id: string; content: PushContent }>): EnterpriseApp {
  return {
    appId: 'dingtalk-dev',
    appType: 'dingtalk',
    displayName: 'DingTalk Dev',
    enabled: true,
    botEnabled: true,
    pushEnabled: true,
    consecutiveErrors: 0,
    tokenManager: { async getToken() { return 'tok'; }, async refresh() { return { accessToken: 'tok', expiresAt: new Date() }; }, async isExpired() { return false; } },
    rateLimiter: { async acquire() {}, release() {} },
    webhookHandler: { async verify() { return true; }, async decode() { throw new Error('unused'); } },
    botAdapter: {
      onMention() {},
      async sendReply() {},
      async pushToUser(userId, content) { calls.push({ kind: 'user', id: userId, content }); },
      async pushToChannel(channelId, content) { calls.push({ kind: 'channel', id: channelId, content }); },
    },
    subConnectors: [],
  };
}

describe('pushMorningBrief', () => {
  test('skips user push when disabled_at is set', async () => {
    const calls: Array<{ kind: 'user' | 'channel'; id: string; content: PushContent }> = [];
    const apps = new Map<string, EnterpriseApp>([['dingtalk', makeDingtalkApp(calls)]]);
    const engine = makeEngine({
      dingtalk: { disabled_at: '2026-05-20T02:00:00.000Z' },
      morning_brief: { provider: 'dingtalk', channel: 'user' },
    });

    const result = await pushMorningBrief(engine as any, 'exec-1', 'Brief body', { apps });

    expect(result).toMatchObject({ pushed: false, skipped: true, reason: 'push_disabled', provider: 'dingtalk' });
    expect(calls).toHaveLength(0);
  });

  test('routes morning_brief by executive.push_preferences channel', async () => {
    const calls: Array<{ kind: 'user' | 'channel'; id: string; content: PushContent }> = [];
    const apps = new Map<string, EnterpriseApp>([['dingtalk', makeDingtalkApp(calls)]]);
    const engine = makeEngine({ morning_brief: { provider: 'dingtalk', channel: 'user' } });

    const result = await pushMorningBrief(engine as any, 'exec-1', 'Morning content', { apps });

    expect(result).toMatchObject({ pushed: true, skipped: false, provider: 'dingtalk', channel: 'user' });
    expect(calls).toHaveLength(1);
    expect(calls[0].kind).toBe('user');
    expect(calls[0].id).toBe('dt-user-1');
    expect(calls[0].content.bodyMarkdown).toBe('Morning content');
  });
});
