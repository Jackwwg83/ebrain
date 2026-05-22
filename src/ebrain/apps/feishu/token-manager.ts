import type { BrainEngine } from '../../../core/engine.ts';
import type { TokenKind, TokenManager, TokenRefreshResult } from '../base/index.ts';
import { decrypt, encrypt } from '../../secrets/crypto.ts';

export const FEISHU_API_BASE_URL = 'https://open.feishu.cn';
const FEISHU_TOKEN_ENDPOINT = '/open-apis/auth/v3/tenant_access_token/internal';
const TOKEN_REFRESH_SKEW_MS = 30 * 60 * 1000;

export type FeishuFetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface FeishuTokenManagerConfig {
  appId: string;
  clientId: string;
  encryptedAppSecret: string;
  tenantKey?: string;
  apiBaseUrl?: string;
  engine?: BrainEngine;
  fetch?: FeishuFetchLike;
  now?: () => Date;
}

interface TokenRow {
  access_token: string;
  expires_at: string | Date;
}

interface FeishuTenantTokenResponse {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
  [key: string]: unknown;
}

function normalizeBaseUrl(apiBaseUrl?: string): string {
  return (apiBaseUrl ?? FEISHU_API_BASE_URL).replace(/\/+$/, '');
}

function endpointUrl(apiBaseUrl: string, endpoint: string): string {
  return `${normalizeBaseUrl(apiBaseUrl)}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

export class FeishuTokenManager implements TokenManager {
  private readonly appId: string;
  private readonly clientId: string;
  private readonly encryptedAppSecret: string;
  private readonly tenantKey?: string;
  private readonly apiBaseUrl: string;
  private readonly engine?: BrainEngine;
  private readonly fetchImpl: FeishuFetchLike;
  private readonly now: () => Date;

  constructor(config: FeishuTokenManagerConfig) {
    this.appId = config.appId;
    this.clientId = config.clientId;
    this.encryptedAppSecret = config.encryptedAppSecret;
    this.tenantKey = config.tenantKey;
    this.apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
    this.engine = config.engine;
    this.fetchImpl = config.fetch ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  async getToken(kind: TokenKind, scope?: string): Promise<string> {
    this.assertTenantAccess(kind);
    const scopeKey = this.scopeKey(scope);
    const row = await this.getTokenRow(scopeKey);
    if (row && !this.isRowExpired(row)) return decrypt(row.access_token);
    const refreshed = await this.refresh(kind, scope);
    return refreshed.accessToken;
  }

  async refresh(kind: TokenKind, scope?: string): Promise<TokenRefreshResult> {
    this.assertTenantAccess(kind);
    const engine = this.requireEngine();
    const scopeKey = this.scopeKey(scope);
    const appSecret = decrypt(this.encryptedAppSecret);
    const response = await this.fetchImpl(endpointUrl(this.apiBaseUrl, FEISHU_TOKEN_ENDPOINT), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app_id: this.clientId, app_secret: appSecret }),
    });
    const payload = await response.json().catch(() => ({})) as FeishuTenantTokenResponse;
    if (!response.ok || payload.code !== 0 || typeof payload.tenant_access_token !== 'string') {
      throw new Error(`Feishu tenant token refresh failed: ${response.status} ${JSON.stringify(payload)}`);
    }

    const expireSeconds = Number(payload.expire ?? 7200);
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
        encrypt(payload.tenant_access_token),
        expiresAt.toISOString(),
        JSON.stringify({
          provider: 'feishu',
          endpoint: FEISHU_TOKEN_ENDPOINT,
          tenant_key: this.tenantKey ?? null,
          expires_in_seconds: expireSeconds,
        }),
      ],
    );

    return {
      accessToken: payload.tenant_access_token,
      expiresAt,
      metadata: { provider: 'feishu', endpoint: FEISHU_TOKEN_ENDPOINT, scopeKey },
    };
  }

  async isExpired(kind: TokenKind, scope?: string): Promise<boolean> {
    this.assertTenantAccess(kind);
    const row = await this.getTokenRow(this.scopeKey(scope));
    return row === null || this.isRowExpired(row);
  }

  private async getTokenRow(scopeKey: string): Promise<TokenRow | null> {
    const rows = await this.requireEngine().executeRaw<TokenRow>(
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
    return scope ?? this.tenantKey ?? 'app';
  }

  private requireEngine(): BrainEngine {
    if (!this.engine) throw new Error('FeishuTokenManager requires a BrainEngine for token persistence');
    return this.engine;
  }

  private assertTenantAccess(kind: TokenKind): asserts kind is 'tenant_access' {
    if (kind === 'tenant_access') return;
    throw new Error(`Feishu TokenKind ${kind} not yet implemented`);
  }
}
