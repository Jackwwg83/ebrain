import type { BrainEngine } from '../../../core/engine.ts';
import type { RateLimitKey, TokenKind, TokenManager, TokenRefreshResult } from '../base/index.ts';
import { decrypt, encrypt } from '../../secrets/crypto.ts';
import {
  defaultFetch,
  endpointUrl,
  normalizeBaseUrl,
  type DingtalkCredentialConfig,
  type FetchLike,
} from './types.ts';
import { dingtalkRateKey } from './rate-limit.ts';

const DINGTALK_TOKEN_ENDPOINT = '/v1.0/oauth2/accessToken';
const TOKEN_REFRESH_SKEW_MS = 30 * 60 * 1000;

export interface DingtalkTokenManagerConfig extends DingtalkCredentialConfig {
  appId: string;
  apiBaseUrl?: string;
  engine?: BrainEngine;
  fetch?: FetchLike;
  now?: () => Date;
  rateLimiter?: { acquire(keys: RateLimitKey[]): Promise<void> };
}

interface TokenRow {
  access_token: string;
  expires_at: string | Date;
}

interface DingtalkAccessTokenResponse {
  accessToken?: string;
  expireIn?: number;
  expiresIn?: number;
  [key: string]: unknown;
}

export class DingtalkTokenManager implements TokenManager {
  private readonly appId: string;
  private readonly appKey: string;
  private readonly encryptedAppSecret: string;
  private readonly corpId?: string;
  private readonly apiBaseUrl: string;
  private readonly engine?: BrainEngine;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;
  private readonly rateLimiter?: { acquire(keys: RateLimitKey[]): Promise<void> };

  constructor(config: DingtalkTokenManagerConfig) {
    this.appId = config.appId;
    this.appKey = config.appKey;
    this.encryptedAppSecret = config.encryptedAppSecret;
    this.corpId = config.corpId;
    this.apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
    this.engine = config.engine;
    this.fetchImpl = config.fetch ?? defaultFetch();
    this.now = config.now ?? (() => new Date());
    this.rateLimiter = config.rateLimiter;
  }

  async getToken(kind: TokenKind, scope?: string): Promise<string> {
    this.assertTenantAccess(kind);
    const scopeKey = this.scopeKey(scope);
    const row = await this.getTokenRow(scopeKey);
    if (row && !this.isRowExpired(row)) {
      return decrypt(row.access_token);
    }
    const refreshed = await this.refresh(kind, scope);
    return refreshed.accessToken;
  }

  async refresh(kind: TokenKind, scope?: string): Promise<TokenRefreshResult> {
    this.assertTenantAccess(kind);
    const engine = this.requireEngine();
    const scopeKey = this.scopeKey(scope);
    const appSecret = decrypt(this.encryptedAppSecret);
    await this.rateLimiter?.acquire([dingtalkRateKey('app', this.appKey, DINGTALK_TOKEN_ENDPOINT)]);
    const response = await this.fetchImpl(endpointUrl(this.apiBaseUrl, DINGTALK_TOKEN_ENDPOINT), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appKey: this.appKey, appSecret }),
    });

    const payload = await response.json().catch(() => ({})) as DingtalkAccessTokenResponse;
    if (!response.ok || typeof payload.accessToken !== 'string') {
      throw new Error(`DingTalk access token refresh failed: ${response.status} ${JSON.stringify(payload)}`);
    }

    const expireSeconds = Number(payload.expireIn ?? payload.expiresIn ?? 7200);
    const expiresAt = new Date(this.now().getTime() + expireSeconds * 1000);
    await engine.executeRaw(
      `INSERT INTO enterprise_oauth_tokens (
         app_id, token_kind, scope_key, access_token, expires_at, scopes, metadata
       ) VALUES ($1, 'tenant_access', $2, $3, $4, '{}'::text[], $5::jsonb)
       ON CONFLICT (app_id, token_kind, scope_key) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         expires_at = EXCLUDED.expires_at,
         scopes = EXCLUDED.scopes,
         metadata = EXCLUDED.metadata`,
      [
        this.appId,
        scopeKey,
        encrypt(payload.accessToken),
        expiresAt.toISOString(),
        JSON.stringify({
          provider: 'dingtalk',
          endpoint: DINGTALK_TOKEN_ENDPOINT,
          corp_id: this.corpId ?? null,
          expires_in_seconds: expireSeconds,
        }),
      ],
    );

    return {
      accessToken: payload.accessToken,
      expiresAt,
      metadata: { provider: 'dingtalk', endpoint: DINGTALK_TOKEN_ENDPOINT, scopeKey },
    };
  }

  async isExpired(kind: TokenKind, scope?: string): Promise<boolean> {
    this.assertTenantAccess(kind);
    const row = await this.getTokenRow(this.scopeKey(scope));
    return row === null || this.isRowExpired(row);
  }

  private async getTokenRow(scopeKey: string): Promise<TokenRow | null> {
    const engine = this.requireEngine();
    const rows = await engine.executeRaw<TokenRow>(
      `SELECT access_token, expires_at
       FROM enterprise_oauth_tokens
       WHERE app_id = $1 AND token_kind = 'tenant_access' AND scope_key = $2`,
      [this.appId, scopeKey],
    );
    return rows[0] ?? null;
  }

  private isRowExpired(row: TokenRow): boolean {
    const expiresAt = new Date(row.expires_at).getTime();
    return !Number.isFinite(expiresAt) || expiresAt <= this.now().getTime() + TOKEN_REFRESH_SKEW_MS;
  }

  private scopeKey(scope?: string): string {
    return scope ?? this.corpId ?? 'app';
  }

  private requireEngine(): BrainEngine {
    if (!this.engine) throw new Error('DingtalkTokenManager requires a BrainEngine for token persistence');
    return this.engine;
  }

  private assertTenantAccess(kind: TokenKind): asserts kind is 'tenant_access' {
    if (kind === 'tenant_access') return;
    throw new Error(`DingTalk TokenKind ${kind} not yet implemented`);
  }
}
