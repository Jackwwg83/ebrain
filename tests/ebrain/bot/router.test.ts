import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { BotAdapter, EnterpriseApp, IncomingRequest, Reply } from '../../../src/ebrain/apps/base/index.ts';
import {
  BOT_ALLOWED_OPS,
  IM_ACCESS_DENIED_REPLY,
  handleImWebhook,
  type ImDecodedEvent,
} from '../../../src/ebrain/bot/router.ts';

type SubmitCall = {
  job: { name: string; queue?: string; data: Record<string, unknown> };
  opts: { allowProtectedSubmit?: boolean };
};

function makeReq(): IncomingRequest {
  return { headers: { 'x-test-signature': 'ok' }, rawBody: '{"ok":true}' };
}

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
    send(body: unknown) {
      calls.bodies.push(body);
      return body;
    },
  };
  return { res, calls };
}

function makeEvent(overrides: Partial<ImDecodedEvent> = {}): ImDecodedEvent {
  return {
    eventId: 'evt-1',
    eventType: 'message.created',
    receivedAt: new Date('2026-05-20T02:00:00.000Z'),
    payload: {},
    sender: { userId: 'dt-user-1' },
    channelId: 'channel-1',
    messageText: '@Ebrain what changed?',
    ...overrides,
  };
}

function makeApp(args: { verify?: boolean; event?: ImDecodedEvent; replies?: Array<{ channelId: string; reply: Reply }> } = {}): EnterpriseApp {
  const replies = args.replies ?? [];
  const botAdapter: BotAdapter = {
    onMention() {},
    async sendReply(channelId, reply) {
      replies.push({ channelId, reply });
    },
    async pushToUser() {},
    async pushToChannel() {},
  };
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
    webhookHandler: {
      async verify() { return args.verify ?? true; },
      async decode() { return args.event ?? makeEvent(); },
    },
    botAdapter,
    subConnectors: [],
  };
}

function makeEngine(args: { executiveFound?: boolean; submitJob?: (job: SubmitCall['job'], opts: SubmitCall['opts']) => Promise<unknown> } = {}) {
  const submitCalls: SubmitCall[] = [];
  const engine = {
    async executeRaw(_sql: string, _params?: unknown[]) {
      if (args.executiveFound === false) return [];
      return [{ executive_id: 'exec-1', email: 'exec1@example.test', display_name: 'Exec One', role: 'ceo' }];
    },
    async submitJob(job: SubmitCall['job'], opts: SubmitCall['opts']) {
      submitCalls.push({ job, opts });
      return args.submitJob ? args.submitJob(job, opts) : { id: 101 };
    },
  };
  return { engine, submitCalls };
}

describe('handleImWebhook', () => {
  test('signature verification failure returns 401 and does not enqueue', async () => {
    const { res, calls } = makeRes();
    const { engine, submitCalls } = makeEngine();

    await handleImWebhook('dingtalk', makeReq(), res, { engine: engine as any, app: makeApp({ verify: false }) });

    expect(calls.status).toEqual([401]);
    expect(submitCalls).toHaveLength(0);
  });

  test('missing executive returns 200 and sends a friendly reject reply', async () => {
    const replies: Array<{ channelId: string; reply: Reply }> = [];
    const { res, calls } = makeRes();
    const { engine, submitCalls } = makeEngine({ executiveFound: false });

    await handleImWebhook('dingtalk', makeReq(), res, { engine: engine as any, app: makeApp({ replies }) });

    expect(calls.status).toEqual([200]);
    expect(submitCalls).toHaveLength(0);
    expect(replies).toEqual([{ channelId: 'channel-1', reply: { markdown: IM_ACCESS_DENIED_REPLY } }]);
  });

  test('successful webhook enqueues subagent with allowed_tools and executive auth', async () => {
    const { res, calls } = makeRes();
    const { engine, submitCalls } = makeEngine();

    await handleImWebhook('dingtalk', makeReq(), res, { engine: engine as any, app: makeApp() });

    expect(calls.status).toEqual([200]);
    expect(submitCalls).toHaveLength(1);
    expect(submitCalls[0].job.name).toBe('subagent');
    expect(submitCalls[0].job.queue).toBe('default');
    expect(submitCalls[0].job.data.allowed_tools).toEqual(Array.from(BOT_ALLOWED_OPS));
    expect((submitCalls[0].job.data.auth as { executiveId?: string }).executiveId).toBe('exec-1');
    expect(submitCalls[0].job.data.sourceId).toBe('enterprise');
    expect((submitCalls[0].job.data.executive as { executiveId?: string }).executiveId).toBe('exec-1');
    expect((submitCalls[0].job.data.ctx as { remote?: boolean }).remote).toBe(true);
  });

  test('extracts sender, channel, and text from base decoded event payload.message', async () => {
    const { res } = makeRes();
    const { engine, submitCalls } = makeEngine();
    const event = makeEvent({
      sender: undefined,
      senderUserId: undefined,
      channelId: undefined,
      messageText: undefined,
      payload: {
        message: {
          senderUserId: 'dt-user-1',
          conversationId: 'conversation-1',
          text: 'show enterprise context',
        },
      },
    });

    await handleImWebhook('dingtalk', makeReq(), res, { engine: engine as any, app: makeApp({ event }) });

    expect(submitCalls).toHaveLength(1);
    expect(submitCalls[0].job.data.prompt).toBe('show enterprise context');
    expect((submitCalls[0].job.data.input_vars as { channel_id?: string }).channel_id).toBe('conversation-1');
  });

  test('subagent enqueue opts include allowProtectedSubmit true', async () => {
    const { res } = makeRes();
    const { engine, submitCalls } = makeEngine();

    await handleImWebhook('dingtalk', makeReq(), res, { engine: engine as any, app: makeApp() });

    expect(submitCalls[0].opts).toEqual({ allowProtectedSubmit: true });
  });

  test('returns 200 within the 3 second SLA without waiting for slow subagent enqueue', async () => {
    const { res, calls } = makeRes();
    const { engine } = makeEngine({
      async submitJob() {
        return new Promise(() => {});
      },
    });

    await Promise.race([
      handleImWebhook('dingtalk', makeReq(), res, { engine: engine as any, app: makeApp() }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('webhook handler waited for enqueue')), 50)),
    ]);

    expect(calls.status).toEqual([200]);
  });

  test('BOT_ALLOWED_OPS keeps exact D2 names and source greps catch drift', () => {
    const routerSource = readFileSync('src/ebrain/bot/router.ts', 'utf8');
    const operationsSource = readFileSync('src/core/operations.ts', 'utf8');
    const specSource = readFileSync('/Users/jackwu/Projects/EBRAIN_MVP_V1.md', 'utf8');

    expect(Array.from(BOT_ALLOWED_OPS)).toEqual([
      'search',
      'query',
      'get_page',
      'takes_list',
      'list_executives',
      'get_executive_context',
    ]);
    expect(routerSource).toContain('takes_list');
    expect(routerSource).not.toContain('list_takes');
    for (const opName of BOT_ALLOWED_OPS) {
      expect(operationsSource.includes(`name: '${opName}'`) || specSource.includes(`'${opName}'`)).toBe(true);
    }
  });

  test('subagent job data uses snake_case allowed_tools only', async () => {
    const routerSource = readFileSync('src/ebrain/bot/router.ts', 'utf8');
    const { res } = makeRes();
    const { engine, submitCalls } = makeEngine();

    await handleImWebhook('dingtalk', makeReq(), res, { engine: engine as any, app: makeApp() });

    expect('allowed_tools' in submitCalls[0].job.data).toBe(true);
    expect('allowedTools' in submitCalls[0].job.data).toBe(false);
    expect(routerSource).toContain('allowed_tools');
    expect(routerSource).not.toContain('allowedTools');
    expect(routerSource).not.toContain('dispatchToolCall');
    expect(routerSource).toMatch(/ctx\.remote.*true/);
    expect(routerSource).not.toMatch(/ctx\.remote.*false/);
  });
});
