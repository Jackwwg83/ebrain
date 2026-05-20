import type { BrainEngine } from '../../../core/engine.ts';
import type { OperationContext } from '../../../core/operations.ts';
import type { EnterpriseApp, EnterpriseConnector } from '../base/index.ts';
import { DingtalkBotAdapter } from './bot-adapter.ts';
import { DingtalkRateLimiter } from './rate-limit.ts';
import { DingtalkTokenManager } from './token-manager.ts';
import { DingtalkWebhookHandler } from './webhook.ts';
import {
  defaultFetch,
  normalizeBaseUrl,
  type DingtalkRuntimeConfig,
  type FetchLike,
} from './types.ts';
import { DingtalkCalendarConnector } from './sub-connectors/calendar.ts';
import { DingtalkDocsConnector } from './sub-connectors/docs.ts';
import { DingtalkDriveConnector } from './sub-connectors/drive.ts';
import { DingtalkImConnector } from './sub-connectors/im.ts';
import { DingtalkMeetingConnector } from './sub-connectors/meeting.ts';

export class DingtalkEnterpriseApp implements EnterpriseApp {
  readonly appId: string;
  readonly appType = 'dingtalk' as const;
  readonly displayName: string;
  readonly appKey: string;
  readonly encryptedAppSecret: string;
  readonly corpId?: string;
  readonly aesKey?: string;
  readonly token?: string;
  readonly apiBaseUrl: string;
  readonly fetch: FetchLike;
  readonly engine?: BrainEngine;

  readonly tokenManager: DingtalkTokenManager;
  readonly rateLimiter: DingtalkRateLimiter;
  readonly webhookHandler: DingtalkWebhookHandler;
  readonly botAdapter: DingtalkBotAdapter;
  readonly subConnectors: EnterpriseConnector[];

  readonly enabled: boolean;
  readonly botEnabled: boolean;
  readonly pushEnabled: boolean;
  consecutiveErrors = 0;
  circuitOpenUntil?: Date;

  constructor(config: DingtalkRuntimeConfig) {
    this.appKey = config.appKey;
    this.encryptedAppSecret = config.encryptedAppSecret;
    this.corpId = config.corpId;
    this.aesKey = config.aesKey;
    this.token = config.token;
    this.appId = config.appId ?? `dingtalk-${config.appKey}`;
    this.displayName = config.displayName ?? 'DingTalk Enterprise App';
    this.apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
    this.fetch = config.fetch ?? defaultFetch();
    this.engine = config.engine;
    this.enabled = config.enabled ?? true;
    this.botEnabled = config.botEnabled ?? true;
    this.pushEnabled = config.pushEnabled ?? true;

    this.rateLimiter = new DingtalkRateLimiter({ engine: config.engine, now: config.now });
    this.tokenManager = new DingtalkTokenManager({
      appId: this.appId,
      appKey: this.appKey,
      encryptedAppSecret: this.encryptedAppSecret,
      corpId: this.corpId,
      aesKey: this.aesKey,
      token: this.token,
      signingSecret: config.signingSecret,
      apiBaseUrl: this.apiBaseUrl,
      engine: config.engine,
      fetch: this.fetch,
      now: config.now,
      rateLimiter: this.rateLimiter,
    });
    this.webhookHandler = new DingtalkWebhookHandler({
      appKey: this.appKey,
      encryptedAppSecret: this.encryptedAppSecret,
      corpId: this.corpId,
      aesKey: this.aesKey,
      token: this.token,
      signingSecret: config.signingSecret,
      now: config.now,
    });
    this.botAdapter = new DingtalkBotAdapter({
      app: this,
      engine: config.engine,
      apiBaseUrl: this.apiBaseUrl,
      fetch: this.fetch,
      now: config.now,
    });
    this.subConnectors = [
      new DingtalkImConnector(this),
      new DingtalkDocsConnector(this),
      new DingtalkDriveConnector(this),
      new DingtalkCalendarConnector(this),
      new DingtalkMeetingConnector(this),
    ];
  }

  operationContext(): OperationContext | null {
    if (!this.engine) return null;
    return {
      engine: this.engine,
      config: { engine: 'pglite' },
      logger: { info() {}, warn() {}, error() {} },
      dryRun: false,
      remote: false,
      sourceId: 'enterprise',
    } as OperationContext;
  }
}
