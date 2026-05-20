import { describe, expect, test } from 'bun:test';
import type { EnterpriseApp, IncomingRequest, Reply } from '../../../src/ebrain/apps/base/index.ts';
import { registerWebhookEndpoints } from '../../../src/ebrain/webhook/server.ts';

function makeRes() {
  const calls: { status: number[]; bodies: unknown[] } = { status: [], bodies: [] };
  const res = {
    status(code: number) {
      calls.status.push(code);
      return res;
    },
    json(body: unknown) {
      calls.bodies.push(body);
      return body;
    },
  };
  return { res, calls };
}

function makeApp(provider: string, seen: string[]): EnterpriseApp {
  return {
    appId: `${provider}-dev`,
    appType: provider as EnterpriseApp['appType'],
    displayName: `${provider} dev`,
    enabled: true,
    botEnabled: true,
    pushEnabled: true,
    consecutiveErrors: 0,
    tokenManager: { async getToken() { return 'tok'; }, async refresh() { return { accessToken: 'tok', expiresAt: new Date() }; }, async isExpired() { return false; } },
    rateLimiter: { async acquire() {}, release() {} },
    webhookHandler: {
      async verify(_req: IncomingRequest) {
        seen.push(`verify:${provider}`);
        return true;
      },
      async decode() {
        seen.push(`decode:${provider}`);
        return {
          eventId: `evt-${provider}`,
          eventType: 'message.created',
          receivedAt: new Date('2026-05-20T00:00:00.000Z'),
          payload: {},
          sender: { userId: `${provider}-user` },
          channelId: `${provider}-channel`,
          messageText: 'show status',
        } as any;
      },
    },
    botAdapter: {
      onMention() {},
      async sendReply(_channelId: string, _reply: Reply) {},
      async pushToUser() {},
      async pushToChannel() {},
    },
    subConnectors: [],
  };
}

describe('registerWebhookEndpoints', () => {
  test('registers four IM routes plus reconcile route', () => {
    const posts: Array<{ path: string; handlers: Function[] }> = [];
    const app = { post(path: string, ...handlers: Function[]) { posts.push({ path, handlers }); } };

    registerWebhookEndpoints(app, { engine: {} as any, apps: new Map(), logger: { warn() {} } });

    expect(posts.map(route => route.path)).toEqual([
      '/webhook/feishu/event',
      '/webhook/dingtalk/event',
      '/webhook/wecom/event',
      '/webhook/tencent-meeting/event',
      '/webhook/reconcile',
    ]);
  });

  test('IM handlers select the app for the matching provider route', async () => {
    const posts: Array<{ path: string; handlers: Function[] }> = [];
    const app = { post(path: string, ...handlers: Function[]) { posts.push({ path, handlers }); } };
    const seen: string[] = [];
    const submitProviders: string[] = [];
    const apps = new Map<string, EnterpriseApp>([
      ['feishu', makeApp('feishu', seen)],
      ['dingtalk', makeApp('dingtalk', seen)],
      ['wecom', makeApp('wecom', seen)],
    ]);
    const engine = {
      async executeRaw(sql: string) {
        if (sql.includes('feishu_user_id')) return [{ executive_id: 'exec-feishu', email: 'f@example.test', role: 'ceo' }];
        if (sql.includes('dingtalk_user_id')) return [{ executive_id: 'exec-dingtalk', email: 'd@example.test', role: 'ceo' }];
        if (sql.includes('wecom_user_id')) return [{ executive_id: 'exec-wecom', email: 'w@example.test', role: 'ceo' }];
        return [];
      },
      async submitJob(job: { data: { auth?: { clientId?: string } } }) {
        submitProviders.push(job.data.auth?.clientId ?? 'missing');
        return { id: submitProviders.length };
      },
    };

    registerWebhookEndpoints(app, { engine: engine as any, apps, logger: { warn() {} } });
    for (const route of posts.filter(route => route.path !== '/webhook/reconcile' && !route.path.includes('tencent'))) {
      const handler = route.handlers.at(-1)!;
      const { res } = makeRes();
      await handler({ headers: {}, rawBody: '{}' }, res);
    }

    expect(seen).toEqual([
      'verify:feishu', 'decode:feishu',
      'verify:dingtalk', 'decode:dingtalk',
      'verify:wecom', 'decode:wecom',
    ]);
    expect(submitProviders).toEqual(['bot:feishu', 'bot:dingtalk', 'bot:wecom']);
  });

  test('reconcile route rejects unauthenticated public calls before DB work', async () => {
    const previousToken = process.env.EBRAIN_WEBHOOK_RECONCILE_TOKEN;
    delete process.env.EBRAIN_WEBHOOK_RECONCILE_TOKEN;
    try {
      const posts: Array<{ path: string; handlers: Function[] }> = [];
      const app = { post(path: string, ...handlers: Function[]) { posts.push({ path, handlers }); } };
      let rawQueries = 0;
      const engine = {
        async executeRaw() {
          rawQueries += 1;
          return [];
        },
      };

      registerWebhookEndpoints(app, { engine: engine as any, apps: new Map(), logger: { warn() {} } });
      const reconcile = posts.find(route => route.path === '/webhook/reconcile')!;
      const handler = reconcile.handlers.at(-1)!;
      const { res, calls } = makeRes();
      await handler({ headers: {}, rawBody: '{"since":"2026-05-20T00:00:00.000Z"}' }, res);

      expect(calls.status).toEqual([401]);
      expect(rawQueries).toBe(0);
    } finally {
      if (previousToken === undefined) delete process.env.EBRAIN_WEBHOOK_RECONCILE_TOKEN;
      else process.env.EBRAIN_WEBHOOK_RECONCILE_TOKEN = previousToken;
    }
  });
});
