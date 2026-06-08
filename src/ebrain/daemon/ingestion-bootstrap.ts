import type { BrainEngine } from '../../core/engine.ts';
import {
  IngestionDaemon,
  type IngestionDispatcher,
} from '../../core/ingestion/daemon.ts';
import type { IngestionSource } from '../../core/ingestion/types.ts';
import type { Logger } from '../../core/operations.ts';
import type { EnterpriseApp } from '../apps/base/index.ts';
import { decrypt, encrypt } from '../secrets/crypto.ts';

export const ENTERPRISE_INGESTION_SHUTDOWN_GRACE_MS = 10_000;

export interface EnterpriseAppBootstrapRow {
  app_id: string;
  app_type: string;
  display_name: string;
  credentials: unknown;
  api_base_url: string | null;
  config: unknown;
  enabled: boolean;
  bot_enabled: boolean;
  push_enabled: boolean;
}

export type EnterpriseAppFactory = (
  row: EnterpriseAppBootstrapRow,
  deps: { engine: BrainEngine; logger: Logger },
) => Promise<EnterpriseApp | null>;

interface EnterpriseSourceGateRow {
  sync_enabled: boolean;
  deleted_at: string | Date | null;
}

let daemonSingleton: IngestionDaemon | null = null;
let bootstrapInFlight: Promise<IngestionDaemon> | null = null;
let enterpriseAppFactoryForTest: EnterpriseAppFactory | null = null;

const noopEnterpriseDispatcher: IngestionDispatcher = async () => ({ kind: 'queued' });

export async function bootstrapEnterpriseIngestionDaemon(
  engine: BrainEngine,
  logger: Logger,
): Promise<IngestionDaemon> {
  if (daemonSingleton) return daemonSingleton;
  if (bootstrapInFlight) return bootstrapInFlight;

  bootstrapInFlight = createEnterpriseIngestionDaemon(engine, logger)
    .then((daemon) => {
      daemonSingleton = daemon;
      return daemon;
    })
    .finally(() => {
      bootstrapInFlight = null;
    });

  return bootstrapInFlight;
}

export function _setEnterpriseAppFactoryForTest(factory: EnterpriseAppFactory | null): void {
  enterpriseAppFactoryForTest = factory;
}

export async function _resetEnterpriseIngestionDaemonForTest(graceMs = 1_000): Promise<void> {
  const daemon = daemonSingleton;
  daemonSingleton = null;
  bootstrapInFlight = null;
  enterpriseAppFactoryForTest = null;
  if (daemon) {
    await daemon.stop(graceMs).catch(() => undefined);
  }
}

async function createEnterpriseIngestionDaemon(
  engine: BrainEngine,
  logger: Logger,
): Promise<IngestionDaemon> {
  const daemon = new IngestionDaemon({
    engine,
    logger,
    dispatch: noopEnterpriseDispatcher,
  });

  let rows: EnterpriseAppBootstrapRow[] = [];
  let registered = 0;
  let skipped = 0;

  try {
    rows = await engine.executeRaw<EnterpriseAppBootstrapRow>(
      `SELECT app_id,
              app_type,
              display_name,
              credentials,
              api_base_url,
              config,
              enabled,
              bot_enabled,
              push_enabled
       FROM enterprise_apps
       WHERE enabled = true
         AND deleted_at IS NULL
       ORDER BY app_id`,
    );
  } catch (error) {
    logger.warn(
      `[ebrain ingestion] enterprise_apps scan failed; starting with 0 sources: ${errorMessage(error)}`,
    );
  }

  for (const row of rows) {
    const app = await loadEnterpriseApp(row, engine, logger);
    if (!app) {
      skipped += 1;
      continue;
    }

    const sources = app.subConnectors.filter(isIngestionSource);
    if (sources.length === 0) {
      logger.info(
        `[ebrain ingestion] app ${row.app_id} (${row.app_type}) has no IngestionSource sub-connectors; skipped`,
      );
      skipped += 1;
      continue;
    }

    for (const source of sources) {
      try {
        const skipReason = await sourceSkipReason(engine, source.id);
        if (skipReason) {
          skipped += 1;
          logger.info(`[ebrain ingestion] source ${source.id} skipped: ${skipReason}`);
          continue;
        }

        daemon.register({
          source,
          config: {
            enterprise_app_id: row.app_id,
            enterprise_app_type: row.app_type,
            enterprise_display_name: row.display_name,
            app_config: toRecord(row.config),
          },
        });
        registered += 1;
      } catch (error) {
        skipped += 1;
        logger.warn(
          `[ebrain ingestion] source ${source.id} registration skipped: ${errorMessage(error)}`,
        );
      }
    }
  }

  try {
    await daemon.start();
    logger.info(
      `[ebrain ingestion] IngestionDaemon started; registered_sources=${registered}, skipped=${skipped}`,
    );
  } catch (error) {
    logger.warn(
      `[ebrain ingestion] IngestionDaemon start failed; autopilot continues without blocking: ${errorMessage(error)}`,
    );
  }

  return daemon;
}

async function loadEnterpriseApp(
  row: EnterpriseAppBootstrapRow,
  engine: BrainEngine,
  logger: Logger,
): Promise<EnterpriseApp | null> {
  try {
    const factory = enterpriseAppFactoryForTest ?? createEnterpriseAppFromRow;
    const app = await factory(row, { engine, logger });
    if (!app) {
      logger.info(`[ebrain ingestion] app ${row.app_id} (${row.app_type}) skipped: no migrated ingestion adapter`);
      return null;
    }
    return app;
  } catch (error) {
    logger.warn(
      `[ebrain ingestion] app ${row.app_id} (${row.app_type}) skipped: ${errorMessage(error)}`,
    );
    return null;
  }
}

async function createEnterpriseAppFromRow(
  row: EnterpriseAppBootstrapRow,
  deps: { engine: BrainEngine; logger: Logger },
): Promise<EnterpriseApp | null> {
  if (row.app_type !== 'dingtalk') {
    return null;
  }

  const { DingtalkEnterpriseApp } = await import('../apps/dingtalk/app.ts');
  const credentials = toRecord(row.credentials);
  const config = toRecord(row.config);
  const appKey = requireString(
    'dingtalk appKey/client_id',
    stringField(credentials, ['appKey', 'app_key', 'client_id', 'clientId'])
      ?? stringField(config, ['appKey', 'app_key', 'client_id', 'clientId']),
  );
  const secret = requireString(
    'dingtalk encryptedAppSecret/appSecret/client_secret',
    stringField(credentials, ['encryptedAppSecret', 'encrypted_app_secret', 'appSecret', 'app_secret', 'client_secret', 'clientSecret', 'secret'])
      ?? stringField(config, ['encryptedAppSecret', 'encrypted_app_secret', 'appSecret', 'app_secret', 'client_secret', 'clientSecret', 'secret']),
  );

  return new DingtalkEnterpriseApp({
    appId: row.app_id,
    displayName: row.display_name,
    appKey,
    encryptedAppSecret: normalizeEncryptedSecret(secret),
    corpId: stringField(credentials, ['corpId', 'corp_id', 'tenant_id', 'tenantId'])
      ?? stringField(config, ['corpId', 'corp_id', 'tenant_id', 'tenantId']),
    aesKey: stringField(credentials, ['aesKey', 'aes_key'])
      ?? stringField(config, ['aesKey', 'aes_key']),
    token: stringField(credentials, ['token', 'webhook_token'])
      ?? stringField(config, ['token', 'webhook_token']),
    signingSecret: stringField(credentials, ['signingSecret', 'signing_secret'])
      ?? stringField(config, ['signingSecret', 'signing_secret']),
    allowPlaintextWebhook: booleanField(config, ['allowPlaintextWebhook', 'allow_plaintext_webhook']),
    apiBaseUrl: stringField(credentials, ['apiBaseUrl', 'api_base_url'])
      ?? stringField(config, ['apiBaseUrl', 'api_base_url'])
      ?? row.api_base_url
      ?? undefined,
    engine: deps.engine,
    enabled: row.enabled,
    botEnabled: row.bot_enabled,
    pushEnabled: row.push_enabled,
  });
}

async function sourceSkipReason(engine: BrainEngine, sourceId: string): Promise<string | null> {
  const rows = await engine.executeRaw<EnterpriseSourceGateRow>(
    `SELECT sync_enabled, deleted_at
     FROM enterprise_ingest_sources
     WHERE ingest_source_id = $1`,
    [sourceId],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.deleted_at !== null && row.deleted_at !== undefined) return 'enterprise_ingest_sources row is soft-deleted';
  if (row.sync_enabled === false) return 'enterprise_ingest_sources.sync_enabled=false';
  return null;
}

function isIngestionSource(value: unknown): value is IngestionSource {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<IngestionSource>;
  return typeof candidate.id === 'string'
    && typeof candidate.kind === 'string'
    && typeof candidate.start === 'function'
    && typeof candidate.stop === 'function';
}

function normalizeEncryptedSecret(secret: string): string {
  if (secret.startsWith('encrypted:')) {
    decrypt(secret);
    return secret;
  }
  return encrypt(secret);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return toRecord(parsed);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function stringField(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function booleanField(source: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function requireString(label: string, value: string | undefined): string {
  if (value) return value;
  throw new Error(`${label} is required`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
