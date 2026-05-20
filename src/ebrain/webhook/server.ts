import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { BrainEngine } from '../../core/engine.ts';
import type { EnterpriseApp, IncomingRequest } from '../apps/base/index.ts';
import type { ImProvider, ExpressLikeResponse, HandleImWebhookOpts } from '../bot/router.ts';
import { warnOnUnregisteredBotAllowedOps } from '../bot/router.ts';
import { dingtalkHandler } from './dingtalk-handler.ts';
import { feishuHandler } from './feishu-handler.ts';
import { reconcileWebhookGap } from './reconcile-worker.ts';
import { tencentMeetingHandler } from './tencent-meeting-handler.ts';
import { wecomHandler } from './wecom-handler.ts';

export interface ExpressLikeApp {
  post(path: string, ...handlers: Array<(...args: any[]) => unknown>): unknown;
}

export interface RegisterWebhookEndpointsOpts {
  engine: BrainEngine;
  apps: Map<string, EnterpriseApp>;
  logger?: { warn?(msg: string): void; error?(msg: string): void };
}

type RuntimeHandler = (
  req: IncomingRequest,
  res: ExpressLikeResponse,
  opts: HandleImWebhookOpts,
) => Promise<unknown>;

const IM_WEBHOOK_ROUTES: Array<{ provider: ImProvider; path: string; handler: RuntimeHandler }> = [
  { provider: 'feishu', path: '/webhook/feishu/event', handler: feishuHandler },
  { provider: 'dingtalk', path: '/webhook/dingtalk/event', handler: dingtalkHandler },
  { provider: 'wecom', path: '/webhook/wecom/event', handler: wecomHandler },
  { provider: 'tencent-meeting', path: '/webhook/tencent-meeting/event', handler: tencentMeetingHandler },
];

export function registerWebhookEndpoints(app: ExpressLikeApp, opts: RegisterWebhookEndpointsOpts): void {
  warnOnUnregisteredBotAllowedOps(opts.logger ?? console);
  const rawWebhookBody = express.raw({ type: '*/*', limit: '2mb' });

  for (const route of IM_WEBHOOK_ROUTES) {
    app.post(route.path, rawWebhookBody, (req: unknown, res: ExpressLikeResponse) => (
      route.handler(toIncomingRequest(req), res, {
        engine: opts.engine,
        app: opts.apps.get(route.provider) ?? null,
        logger: opts.logger,
      })
    ));
  }

  app.post('/webhook/reconcile', rawWebhookBody, (req: unknown, res: ExpressLikeResponse) => {
    if (!verifyReconcileRequest(req)) {
      return sendResponse(res, 401, { ok: false, error: 'unauthorized' });
    }
    const since = readSince(req) ?? new Date(Date.now() - 15 * 60_000);
    void reconcileWebhookGap(opts.engine, { since }).catch(error => {
      opts.logger?.warn?.(`[ebrain webhook] reconcile failed: ${error instanceof Error ? error.message : String(error)}`);
    });
    return sendResponse(res, 200, { ok: true });
  });
}

export async function loadEnabledEnterpriseApps(
  engine: BrainEngine,
  logger: { warn?(msg: string): void } = console,
): Promise<Map<string, EnterpriseApp>> {
  const apps = new Map<string, EnterpriseApp>();
  const rows = await engine.executeRaw<EnterpriseAppRow>(
    `SELECT app_id, app_type, display_name, credentials, config, api_base_url, enabled, bot_enabled, push_enabled,
            consecutive_errors, circuit_open_until
     FROM enterprise_apps
     WHERE deleted_at IS NULL
       AND enabled = true
       AND (bot_enabled = true OR push_enabled = true)`,
  );

  for (const row of rows) {
    if (row.app_type !== 'dingtalk') {
      logger.warn?.(`[ebrain webhook] ${row.app_type} app loader not implemented in D2; endpoint remains registered`);
      continue;
    }
    const app = await createDingtalkEnterpriseApp(row, engine, logger);
    if (app) apps.set('dingtalk', app);
  }
  return apps;
}

interface EnterpriseAppRow {
  app_id: string;
  app_type: string;
  display_name: string;
  credentials: unknown;
  config: unknown;
  api_base_url: string | null;
  enabled: boolean;
  bot_enabled: boolean;
  push_enabled: boolean;
  consecutive_errors: number;
  circuit_open_until: string | Date | null;
}

async function createDingtalkEnterpriseApp(
  row: EnterpriseAppRow,
  engine: BrainEngine,
  logger: { warn?(msg: string): void },
): Promise<EnterpriseApp | null> {
  const credentials = asRecord(row.credentials);
  const config = asRecord(row.config);
  const appKey = readString(credentials, 'appKey') ?? readString(config, 'appKey');
  const encryptedAppSecret = readString(credentials, 'encryptedAppSecret') ?? readString(config, 'encryptedAppSecret');
  if (!appKey || !encryptedAppSecret) {
    logger.warn?.(`[ebrain webhook] dingtalk app ${row.app_id} missing appKey/encryptedAppSecret; skipped`);
    return null;
  }

  const { DingtalkEnterpriseApp } = await import('../apps/dingtalk/index.ts');
  return new DingtalkEnterpriseApp({
    appId: row.app_id,
    appKey,
    encryptedAppSecret,
    displayName: row.display_name,
    corpId: readString(credentials, 'corpId') ?? readString(config, 'corpId'),
    aesKey: readString(credentials, 'aesKey') ?? readString(config, 'aesKey'),
    token: readString(credentials, 'token') ?? readString(config, 'token'),
    signingSecret: readString(credentials, 'signingSecret') ?? readString(config, 'signingSecret'),
    allowPlaintextWebhook: readBoolean(credentials, 'allowPlaintextWebhook') ?? readBoolean(config, 'allowPlaintextWebhook'),
    apiBaseUrl: row.api_base_url ?? readString(config, 'apiBaseUrl') ?? undefined,
    enabled: row.enabled,
    botEnabled: row.bot_enabled,
    pushEnabled: row.push_enabled,
    engine,
  });
}

function toIncomingRequest(req: unknown): IncomingRequest {
  const request = req as {
    headers?: Record<string, string | string[] | undefined>;
    rawBody?: string | Uint8Array;
    body?: unknown;
    query?: Record<string, string | string[] | undefined>;
    url?: string;
  };
  const incoming = {
    headers: request.headers ?? {},
    rawBody: request.rawBody ?? rawBodyFromBody(request.body),
  } as IncomingRequest & { query?: typeof request.query; url?: string };
  if (request.query) incoming.query = request.query;
  if (request.url) incoming.url = request.url;
  return incoming;
}

function verifyReconcileRequest(req: unknown): boolean {
  const expected = process.env.EBRAIN_WEBHOOK_RECONCILE_TOKEN;
  if (!expected) return false;
  const token = readHeader(req, 'x-ebrain-reconcile-token') ?? readBearerToken(readHeader(req, 'authorization'));
  return token ? safeCompare(token, expected) : false;
}

function readHeader(req: unknown, name: string): string | null {
  const headers = (req as { headers?: Record<string, string | string[] | undefined> }).headers ?? {};
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null;
  return typeof value === 'string' ? value : null;
}

function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? null;
}

function safeCompare(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function rawBodyFromBody(body: unknown): string | Uint8Array {
  if (typeof body === 'string') return body;
  if (body instanceof Uint8Array) return body;
  if (body === undefined || body === null) return '';
  return JSON.stringify(body);
}

function readSince(req: unknown): Date | null {
  const raw = rawBodyFromBody((req as { rawBody?: string | Uint8Array; body?: unknown }).rawBody ?? (req as { body?: unknown }).body);
  const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text) as { since?: unknown };
    if (typeof parsed.since !== 'string') return null;
    const since = new Date(parsed.since);
    return Number.isNaN(since.getTime()) ? null : since;
  } catch {
    return null;
  }
}

function sendResponse(res: ExpressLikeResponse, status: number, body: unknown): unknown {
  const target = res.status(status) ?? res;
  if (typeof target.json === 'function') return target.json(body);
  if (typeof target.send === 'function') return target.send(body);
  if (typeof target.end === 'function') return target.end();
  return target;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}
