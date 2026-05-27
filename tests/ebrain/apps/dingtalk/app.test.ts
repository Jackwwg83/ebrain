import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(60_000);
import type { EnterpriseApp } from '../../../../src/ebrain/apps/base/index.ts';
import {
  DingtalkBotAdapter,
  DingtalkEnterpriseApp,
  DingtalkRateLimiter,
  DingtalkTokenManager,
  DingtalkWebhookHandler,
} from '../../../../src/ebrain/apps/dingtalk/index.ts';
import { makeDingtalkApp, setupEngine, teardownEngine } from './helpers.ts';
import type { PGLiteEngine } from '../../../../src/core/pglite-engine.ts';

let engine: PGLiteEngine;

beforeEach(async () => {
  ({ engine } = await setupEngine());
});

afterEach(async () => {
  await teardownEngine(engine);
});

describe('DingtalkEnterpriseApp', () => {
  test('satisfies EnterpriseApp and composes required subsystems', () => {
    const app = makeDingtalkApp({ engine });
    const enterpriseApp: EnterpriseApp = app;

    expect(enterpriseApp).toBeInstanceOf(DingtalkEnterpriseApp);
    expect(app.appType).toBe('dingtalk');
    expect(app.tokenManager).toBeInstanceOf(DingtalkTokenManager);
    expect(app.webhookHandler).toBeInstanceOf(DingtalkWebhookHandler);
    expect(app.botAdapter).toBeInstanceOf(DingtalkBotAdapter);
    expect(app.rateLimiter).toBeInstanceOf(DingtalkRateLimiter);
  });

  test('subConnectors contains the five DingTalk connectors and no wiki connector', () => {
    const app = makeDingtalkApp({ engine });
    expect(app.subConnectors.map((connector) => connector.name)).toEqual([
      'dingtalk-im',
      'dingtalk-docs',
      'dingtalk-drive',
      'dingtalk-calendar',
      'dingtalk-meeting',
    ]);
  });
});
