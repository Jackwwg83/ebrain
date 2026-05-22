import type { BrainEngine } from '../../../core/engine.ts';
import type { EnterpriseApp, EnterpriseConnector, RateLimitKey, TieredRateLimiter } from '../base/index.ts';
import { FeishuTokenManager, type FeishuFetchLike } from './token-manager.ts';

export interface FeishuRuntimeConfig {
  appId: string;
  clientId: string;
  encryptedAppSecret: string;
  tenantKey?: string;
  displayName?: string;
  enabled?: boolean;
  botEnabled?: boolean;
  pushEnabled?: boolean;
  apiBaseUrl?: string;
  engine?: BrainEngine;
  fetch?: FeishuFetchLike;
  now?: () => Date;
}

class FeishuNoopRateLimiter implements TieredRateLimiter {
  async acquire(_keys: RateLimitKey[]): Promise<void> {}
  release(_keys: Array<Omit<RateLimitKey, 'limit'>>): void {}
}

export class FeishuEnterpriseApp implements EnterpriseApp {
  readonly appId: string;
  readonly appType = 'feishu' as const;
  readonly displayName: string;
  readonly clientId: string;
  readonly encryptedAppSecret: string;
  readonly tenantKey?: string;

  readonly tokenManager: FeishuTokenManager;
  readonly rateLimiter: TieredRateLimiter;
  readonly subConnectors: EnterpriseConnector[] = [];

  readonly enabled: boolean;
  readonly botEnabled: boolean;
  readonly pushEnabled: boolean;
  consecutiveErrors = 0;
  circuitOpenUntil?: Date;

  constructor(config: FeishuRuntimeConfig) {
    this.appId = config.appId;
    this.clientId = config.clientId;
    this.encryptedAppSecret = config.encryptedAppSecret;
    this.tenantKey = config.tenantKey;
    this.displayName = config.displayName ?? 'Feishu Enterprise App';
    this.enabled = config.enabled ?? true;
    this.botEnabled = config.botEnabled ?? true;
    this.pushEnabled = config.pushEnabled ?? true;
    this.rateLimiter = new FeishuNoopRateLimiter();
    this.tokenManager = new FeishuTokenManager({
      appId: this.appId,
      clientId: this.clientId,
      encryptedAppSecret: this.encryptedAppSecret,
      tenantKey: this.tenantKey,
      apiBaseUrl: config.apiBaseUrl,
      engine: config.engine,
      fetch: config.fetch,
      now: config.now,
    });
  }
}
