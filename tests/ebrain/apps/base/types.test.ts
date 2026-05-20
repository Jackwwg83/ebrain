import { expect, test } from 'bun:test';
import type { OperationContext } from '../../../../src/core/operations.ts';
import type {
  BotAdapter,
  ClassificationLevel,
  EnterpriseApp,
  EnterpriseAppType,
  EnterpriseConnector,
  EnterpriseIngestObject,
  EnterpriseObjectType,
  EnterpriseSourceType,
  Event,
  IncomingRequest,
  RateLimitKey,
  RateLimitTier,
  Reply,
  TieredRateLimiter,
  TokenKind,
  TokenManager,
  WebhookHandler,
} from '../../../../src/ebrain/apps/base/index.ts';

const ingestResult = {
  objectsIngested: 1,
  objectsSkipped: 0,
  errors: 0,
  cursorAdvanced: 'cursor-1',
};

const tokenManager: TokenManager = {
  async getToken(kind: TokenKind, scope?: string) {
    return `${kind}:${scope ?? 'default'}`;
  },
  async refresh() {},
  async isExpired() {
    return false;
  },
};

const webhookHandler: WebhookHandler = {
  async verify(req: IncomingRequest) {
    return Boolean(req.headers['x-signature']);
  },
  async decode(req: IncomingRequest) {
    return {
      eventId: 'evt-1',
      eventType: 'message.created',
      receivedAt: new Date('2026-05-20T00:00:00.000Z'),
      payload: req.rawBody,
    } satisfies Event;
  },
};

const rateLimiter: TieredRateLimiter = {
  async acquire(keys: RateLimitKey[]) {
    expect(keys.every((key) => `${key.tier}:${key.key}`.includes(':'))).toBe(true);
  },
  release(keys) {
    expect(keys.every((key) => key.tier === 'app' || key.tier === 'tenant' || key.tier === 'user')).toBe(true);
  },
};

const botAdapter: BotAdapter = {
  onMention(handler) {
    void handler({
      channelId: 'chan-1',
      senderUserId: 'ou_user',
      messageText: '@brain status?',
      receivedAt: new Date('2026-05-20T00:00:00.000Z'),
    });
  },
  async sendReply(_channelId: string, reply: Reply) {
    expect(reply.markdown ?? reply.cards).toBeDefined();
  },
  async pushToUser() {},
  async pushToChannel() {},
};

const dummyApp: EnterpriseApp = {
  appId: 'feishu-prod',
  appType: 'feishu',
  displayName: 'Feishu Production',
  tokenManager,
  rateLimiter,
  webhookHandler,
  botAdapter,
  subConnectors: [],
  enabled: true,
  botEnabled: true,
  pushEnabled: true,
  consecutiveErrors: 0,
};

test('TokenManager interface allows minimal dummy implementation', async () => {
  const dummy: TokenManager = {
    async getToken() {
      return 'tok';
    },
    async refresh() {},
    async isExpired() {
      return false;
    },
  };

  expect(await dummy.getToken('tenant_access', 'tenant-1')).toBe('tok');
  expect(await dummy.isExpired('tenant_access')).toBe(false);
});

test('WebhookHandler interface verifies and decodes a vendor-neutral event', async () => {
  const req = { headers: { 'x-signature': 'sig' }, rawBody: '{"ok":true}' } satisfies IncomingRequest;

  expect(await webhookHandler.verify(req)).toBe(true);
  await expect(webhookHandler.decode(req)).resolves.toMatchObject({
    eventId: 'evt-1',
    eventType: 'message.created',
    payload: '{"ok":true}',
  });
});

test('TieredRateLimiter interface separates app tenant and user tiers', async () => {
  const keys = [
    { tier: 'app', key: 'feishu', limit: 50 },
    { tier: 'tenant', key: 'vx.feishu.cn', limit: 20 },
    { tier: 'user', key: 'ou_xxx', limit: 5 },
  ] satisfies RateLimitKey[];

  await rateLimiter.acquire(keys);
  rateLimiter.release(keys.map(({ tier, key }) => ({ tier, key })));
  expect(keys.map((key) => `${key.tier}:${key.key}`)).toEqual([
    'app:feishu',
    'tenant:vx.feishu.cn',
    'user:ou_xxx',
  ]);
});

test('BotAdapter interface supports mention replies and push content', async () => {
  botAdapter.onMention(async (event) => ({ markdown: `hello ${event.senderUserId}` }));
  await botAdapter.sendReply('chan-1', { markdown: 'ok' });
  await botAdapter.pushToUser('ou_user', {
    subject: 'Critical signal',
    bodyMarkdown: '**risk** detected',
    urgency: 'high',
  });
  await botAdapter.pushToChannel('chan-1', {
    subject: 'Morning brief',
    bodyMarkdown: 'All green',
    urgency: 'low',
  });

  expect(typeof botAdapter.onMention).toBe('function');
});

test('EnterpriseApp interface composes all sub-capabilities with optional webhook and bot', () => {
  const meetingApp: EnterpriseApp = {
    appId: 'tencent-meeting-prod',
    appType: 'tencent-meeting',
    displayName: 'Tencent Meeting',
    tokenManager,
    rateLimiter,
    subConnectors: [],
    enabled: true,
    botEnabled: false,
    pushEnabled: false,
    consecutiveErrors: 0,
  };

  expect(dummyApp.webhookHandler).toBeDefined();
  expect(dummyApp.botAdapter).toBeDefined();
  expect(meetingApp.webhookHandler).toBeUndefined();
  expect(meetingApp.botAdapter).toBeUndefined();
});

test('EnterpriseConnector interface requires app and transforms to EnterpriseIngestObject', async () => {
  const connector: EnterpriseConnector = {
    name: 'feishu-im',
    app: dummyApp,
    async runIncremental(_ctx: OperationContext) {
      return ingestResult;
    },
    async runBackfill(_ctx: OperationContext, opts: { since?: string }) {
      return { ...ingestResult, cursorAdvanced: opts.since ?? 'full' };
    },
    async handleWebhookEvent(_event: Event) {
      return ingestResult;
    },
    async transform(raw: unknown) {
      return {
        sourceId: 'feishu-prod',
        sourceType: 'feishu',
        externalId: String(raw),
        objectType: 'im-message',
        title: 'Message',
        bodyMarkdown: 'hello',
        classification: 'L1',
      } satisfies EnterpriseIngestObject;
    },
  };

  expect(connector.app.appId).toBe('feishu-prod');
  await expect(connector.transform('raw-1')).resolves.toMatchObject({
    sourceType: 'feishu',
    classification: 'L1',
  });
});

test('EnterpriseAppType is a strict literal union for 4 IM/meeting plus 2 CRM adapters', () => {
  const values = [
    'feishu',
    'dingtalk',
    'wecom',
    'tencent-meeting',
    'crm-shenxiao',
    'crm-fenxiang',
  ] as const satisfies readonly EnterpriseAppType[];

  // @ts-expect-error Unknown adapters must not satisfy the B1 base app type.
  const badAppType: EnterpriseAppType = 'unknown';

  expect(values).toContain('feishu');
  void badAppType;
});

test('TokenKind is locked to v200 enterprise_oauth_tokens CHECK values', () => {
  const values = ['tenant_access', 'user_access', 'app_access', 'refresh'] as const satisfies readonly TokenKind[];

  // @ts-expect-error Old shorthand token kinds do not match v200 schema.
  const badTokenKind: TokenKind = 'tenant';

  expect(values).toEqual(['tenant_access', 'user_access', 'app_access', 'refresh']);
  void badTokenKind;
});

test('classification is restricted to L0 through L3', () => {
  const levels = ['L0', 'L1', 'L2', 'L3'] as const satisfies readonly ClassificationLevel[];
  const obj = {
    sourceId: 'crm-prod',
    sourceType: 'crm-shenxiao',
    externalId: 'acct-1',
    objectType: 'crm-account',
    title: 'Account',
    bodyMarkdown: 'Account note',
    classification: 'L3',
  } satisfies EnterpriseIngestObject;

  // @ts-expect-error Classification must not drift outside the I-04 levels.
  const badClassification: ClassificationLevel = 'L4';

  expect(levels).toContain(obj.classification);
  void badClassification;
});

test('EnterpriseIngestObject objectType is restricted to the listed enterprise object literals', () => {
  const objectTypes = [
    'im-message',
    'im-thread',
    'doc',
    'wiki-page',
    'drive-file',
    'meeting',
    'meeting-transcript',
    'calendar-event',
    'email',
    'crm-account',
    'crm-opportunity',
    'crm-contact',
  ] as const satisfies readonly EnterpriseObjectType[];

  // @ts-expect-error Object type must be one of the canonical enterprise ingest literals.
  const badObjectType: EnterpriseObjectType = 'ticket';

  expect(objectTypes).toContain('meeting-transcript');
  void badObjectType;
});

test('EnterpriseSourceType and RateLimitTier unions reject string fallbacks at compile time', () => {
  const sourceTypes = [
    'feishu',
    'dingtalk',
    'wecom',
    'tencent-meeting',
    'crm-shenxiao',
    'crm-fenxiang',
  ] as const satisfies readonly EnterpriseSourceType[];
  const tiers = ['app', 'tenant', 'user'] as const satisfies readonly RateLimitTier[];

  // @ts-expect-error Source type has no arbitrary string fallback.
  const badSourceType: EnterpriseSourceType = 'erp';
  // @ts-expect-error Rate limit tier has no arbitrary string fallback.
  const badTier: RateLimitTier = 'workspace';

  expect(sourceTypes).toContain('crm-fenxiang');
  expect(tiers).toEqual(['app', 'tenant', 'user']);
  void badSourceType;
  void badTier;
});

test('EnterpriseConnector.app is non-optional at compile time', () => {
  // @ts-expect-error EnterpriseConnector implementations must provide app context.
  const missingAppConnector: EnterpriseConnector = {
    name: 'broken',
    async runIncremental() {
      return ingestResult;
    },
    async runBackfill() {
      return ingestResult;
    },
    async transform() {
      return {
        sourceId: 'feishu-prod',
        sourceType: 'feishu',
        externalId: 'raw-1',
        objectType: 'im-message',
        title: 'Message',
        bodyMarkdown: 'hello',
      } satisfies EnterpriseIngestObject;
    },
  };

  expect(dummyApp.subConnectors).toEqual([]);
  void missingAppConnector;
});
