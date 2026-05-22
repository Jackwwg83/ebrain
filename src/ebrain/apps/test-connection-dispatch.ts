import type { BrainEngine } from '../../core/engine.ts';
import type { EnterpriseApp } from './base/enterprise-app.ts';
import type { EnterpriseAppType } from './base/types.ts';
import { encrypt } from '../secrets/crypto.ts';

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface TestEnterpriseConnectionOptions {
  appType: string;
  credentials: Record<string, unknown>;
  config?: Record<string, unknown>;
  appId?: string;
  displayName?: string;
  engine?: BrainEngine;
  fetch?: FetchLike;
  now?: () => Date;
}

export interface TestEnterpriseConnectionResult {
  ok: boolean;
  message: string;
  checked_at: string;
}

const SUPPORTED_APP_TYPES: EnterpriseAppType[] = ['dingtalk', 'feishu'];

function stringField(source: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function requireString(label: string, value: string | undefined): string {
  if (value) return value;
  throw new Error(`${label} is required`);
}

function encryptedSecret(value: string): string {
  return value.startsWith('encrypted:') ? value : encrypt(value);
}

function unsupported(appType: string, checked_at: string): TestEnterpriseConnectionResult {
  return {
    ok: false,
    message: `unsupported_app_type '${appType}' (supported: ${SUPPORTED_APP_TYPES.join(', ')})`,
    checked_at,
  };
}

async function ensureTokenPersistenceApp(
  engine: BrainEngine | undefined,
  app: EnterpriseApp,
  config: Record<string, unknown> | undefined,
): Promise<void> {
  if (!engine) return;
  // Token managers write through enterprise_oauth_tokens, which has an app FK.
  // Pre-save connection probes create a hidden shell row without persisting secrets.
  await engine.executeRaw(
    `INSERT INTO enterprise_apps (
       app_id, app_type, display_name, credentials, api_base_url, config,
       enabled, bot_enabled, push_enabled, deleted_at
     ) VALUES ($1, $2, $3, '{}'::jsonb, $4, $5::jsonb, false, false, false, now())
     ON CONFLICT (app_id) DO NOTHING`,
    [
      app.appId,
      app.appType,
      app.displayName,
      stringField(config, ['apiBaseUrl', 'api_base_url']) ?? null,
      JSON.stringify({ connection_test_shell: true }),
    ],
  );
}

async function createEnterpriseApp(opts: TestEnterpriseConnectionOptions): Promise<EnterpriseApp> {
  const appType = opts.appType.trim().toLowerCase();
  const config = opts.config ?? {};
  if (appType === 'dingtalk') {
    const { DingtalkEnterpriseApp } = await import('./dingtalk/app.ts');
    const appKey = requireString(
      'dingtalk credential appKey/client_id',
      stringField(opts.credentials, ['appKey', 'app_key', 'client_id', 'clientId']),
    );
    const appSecret = requireString(
      'dingtalk credential appSecret/client_secret',
      stringField(opts.credentials, ['encryptedAppSecret', 'encrypted_app_secret', 'appSecret', 'app_secret', 'client_secret', 'clientSecret', 'secret']),
    );
    return new DingtalkEnterpriseApp({
      appId: opts.appId || `dingtalk-${appKey}`,
      displayName: opts.displayName || 'DingTalk Enterprise App',
      appKey,
      encryptedAppSecret: encryptedSecret(appSecret),
      corpId: stringField(opts.credentials, ['corpId', 'corp_id', 'tenant_id', 'tenantId'])
        ?? stringField(config, ['corpId', 'corp_id', 'tenant_id', 'tenantId']),
      token: stringField(opts.credentials, ['token', 'webhook_token']) ?? stringField(config, ['webhook_token']),
      signingSecret: stringField(opts.credentials, ['signingSecret', 'signing_secret']),
      apiBaseUrl: stringField(opts.credentials, ['apiBaseUrl', 'api_base_url']) ?? stringField(config, ['apiBaseUrl', 'api_base_url']),
      engine: opts.engine,
      fetch: opts.fetch,
      now: opts.now,
    });
  }

  if (appType === 'feishu') {
    const { FeishuEnterpriseApp } = await import('./feishu/app.ts');
    const clientId = requireString(
      'feishu credential app_id/client_id',
      stringField(opts.credentials, ['app_id', 'appId', 'client_id', 'clientId']),
    );
    const appSecret = requireString(
      'feishu credential app_secret/client_secret',
      stringField(opts.credentials, ['encryptedAppSecret', 'encrypted_app_secret', 'app_secret', 'appSecret', 'client_secret', 'clientSecret', 'secret']),
    );
    return new FeishuEnterpriseApp({
      appId: opts.appId || `feishu-${clientId}`,
      displayName: opts.displayName || 'Feishu Enterprise App',
      clientId,
      encryptedAppSecret: encryptedSecret(appSecret),
      tenantKey: stringField(opts.credentials, ['tenant_key', 'tenantKey', 'tenant_id', 'tenantId'])
        ?? stringField(config, ['tenant_key', 'tenantKey', 'tenant_id', 'tenantId']),
      apiBaseUrl: stringField(opts.credentials, ['apiBaseUrl', 'api_base_url']) ?? stringField(config, ['apiBaseUrl', 'api_base_url']),
      engine: opts.engine,
      fetch: opts.fetch,
      now: opts.now,
    });
  }

  throw new Error(`unsupported:${appType}`);
}

export async function testEnterpriseConnection(
  opts: TestEnterpriseConnectionOptions,
): Promise<TestEnterpriseConnectionResult> {
  const checked_at = (opts.now ?? (() => new Date()))().toISOString();
  const appType = opts.appType.trim().toLowerCase();
  if (!SUPPORTED_APP_TYPES.includes(appType as EnterpriseAppType)) {
    return unsupported(appType, checked_at);
  }

  try {
    const app = await createEnterpriseApp({ ...opts, appType });
    await ensureTokenPersistenceApp(opts.engine, app, opts.config);
    await app.tokenManager.refresh('tenant_access', 'app');
    return { ok: true, message: 'connection verified via token refresh', checked_at };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('unsupported:')) {
      return unsupported(appType, checked_at);
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `connection_failed: ${message}`, checked_at };
  }
}
