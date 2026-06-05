import type {
  IngestionSource,
  IngestionSourceContext,
  IngestionSourceHealth,
  IngestionSourceMode,
} from '../../../core/ingestion/types.ts';
import type { OperationContext } from '../../../core/operations.ts';
import {
  checkCircuit,
  markIngestError,
  resetCircuit,
} from '../../sources/circuit-breaker.ts';
import {
  toEnterpriseSlug,
  upsertEnterpriseObject,
} from '../../sources/ingest-common.ts';
import type { EnterpriseApp } from './enterprise-app.ts';
import type { RateLimitKey } from './tiered-rate-limiter.ts';
import type { TokenKind } from './token-manager.ts';
import type { EnterpriseIngestObject } from './types.ts';

export interface BaseIngestionSourceOpts {
  /** Unique source instance id, e.g. 'feishu-docs:tenant-acme'. */
  id: string;
  /** Source kind taxonomy, e.g. 'feishu-docs' / 'dingtalk-im'. */
  kind: string;
  /** Owning EnterpriseApp instance. */
  app: EnterpriseApp;
  /** Polling interval in ms. Defaults to 60 seconds. */
  pollIntervalMs?: number;
  /** Source operating mode. Defaults to 'trickle'. */
  mode?: IngestionSourceMode;
}

interface CursorRow {
  cursor_state: unknown;
}

interface HealthRow {
  last_success_at: string | Date | null;
  last_error_at: string | Date | null;
  last_error: string | null;
  consecutive_errors: number;
  circuit_open_until: string | Date | null;
  circuit_open: boolean;
}

/**
 * Base adapter for ebrain enterprise pull connectors that need to run under
 * upstream's push-style IngestionSource daemon contract.
 */
export abstract class BaseEnterpriseIngestionSource implements IngestionSource {
  readonly id: string;
  readonly kind: string;
  readonly mode: IngestionSourceMode;

  protected app: EnterpriseApp;
  protected pollIntervalMs: number;
  protected ctx?: IngestionSourceContext;
  protected timer?: ReturnType<typeof setInterval>;
  protected lastSuccessAt?: Date;
  protected lastErrorAt?: Date;
  protected lastError?: string;

  private abortHandler?: () => void;
  private inFlightPoll?: Promise<void>;
  private stopping = false;

  protected stopDrainGraceMs = 30_000;

  constructor(opts: BaseIngestionSourceOpts) {
    this.id = opts.id;
    this.kind = opts.kind;
    this.app = opts.app;
    const interval = opts.pollIntervalMs ?? 60_000;
    if (!Number.isFinite(interval) || interval <= 0) {
      throw new Error(`pollIntervalMs must be positive finite, got: ${interval}`);
    }
    this.pollIntervalMs = interval;
    this.mode = opts.mode ?? 'trickle';
  }

  async start(ctx: IngestionSourceContext): Promise<void> {
    if (this.timer) {
      throw new Error(`BaseEnterpriseIngestionSource.start: source '${this.id}' is already running`);
    }

    this.stopping = false;
    this.ctx = ctx;
    this.abortHandler = () => {
      void this.stop();
    };
    ctx.abortSignal.addEventListener('abort', this.abortHandler, { once: true });

    await this.pollWithGuards();

    if (ctx.abortSignal.aborted || this.stopping) {
      await this.stop();
      return;
    }

    this.timer = setInterval(() => {
      void this.pollWithGuards().catch((error) => {
        ctx.logger.error(`[${this.id}] unhandled poll error: ${errorMessage(error)}`);
      });
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    this.stopping = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (this.inFlightPoll) {
      let drainTimer: ReturnType<typeof setTimeout> | undefined;
      const poll = this.inFlightPoll;
      await Promise.race([
        poll.catch(() => undefined),
        new Promise<void>((resolve) => {
          drainTimer = setTimeout(resolve, this.stopDrainGraceMs);
        }),
      ]);
      if (drainTimer) {
        clearTimeout(drainTimer);
      }
    }

    if (this.ctx && this.abortHandler) {
      this.ctx.abortSignal.removeEventListener('abort', this.abortHandler);
    }
    this.abortHandler = undefined;
  }

  async healthCheck(): Promise<IngestionSourceHealth> {
    const ctx = this.requireContext();
    const rows = await ctx.engine.executeRaw<HealthRow>(
      `SELECT last_success_at,
              last_error_at,
              last_error,
              consecutive_errors,
              circuit_open_until,
              COALESCE(circuit_open_until > now(), false) AS circuit_open
       FROM enterprise_ingest_sources
       WHERE ingest_source_id = $1
         AND deleted_at IS NULL`,
      [this.id],
    );

    const row = rows[0];
    if (!row) {
      return { status: 'fail', message: `source '${this.id}' is not registered` };
    }

    this.lastSuccessAt = toDate(row.last_success_at);
    this.lastErrorAt = toDate(row.last_error_at);
    this.lastError = row.last_error ?? undefined;

    const parts = [
      this.lastSuccessAt ? `last_success_at=${this.lastSuccessAt.toISOString()}` : undefined,
      this.lastErrorAt ? `last_error_at=${this.lastErrorAt.toISOString()}` : undefined,
      row.last_error ? `last_error=${row.last_error}` : undefined,
    ].filter((part): part is string => Boolean(part));

    if (row.circuit_open) {
      const until = toDate(row.circuit_open_until)?.toISOString() ?? String(row.circuit_open_until);
      return {
        status: 'warn',
        message: [`circuit open until ${until}`, ...parts].join('; '),
      };
    }

    if (row.consecutive_errors > 0) {
      return {
        status: 'warn',
        message: [`${row.consecutive_errors} consecutive error(s)`, ...parts].join('; '),
      };
    }

    return { status: 'ok', message: parts.join('; ') || 'ready' };
  }

  /**
   * Subclasses fetch vendor records and return enterprise ingest objects plus
   * the new persisted cursor.
   */
  protected abstract pollOnce(
    ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ objects: EnterpriseIngestObject[]; cursorState: Record<string, unknown> }>;

  protected async pollWithGuards(): Promise<void> {
    const ctx = this.requireContext();
    if (this.stopping) return;
    if (ctx.abortSignal.aborted) return;
    if (this.inFlightPoll) {
      ctx.logger.warn(`[${this.id}] poll skipped because a previous poll is still running`);
      return;
    }

    const poll = this.runPollWithGuards(ctx);
    this.inFlightPoll = poll;

    try {
      await poll;
    } finally {
      if (this.inFlightPoll === poll) {
        this.inFlightPoll = undefined;
      }
    }
  }

  private async runPollWithGuards(ctx: IngestionSourceContext): Promise<void> {
    let acquiredKeys: RateLimitKey[] = [];

    try {
      await this.ensureSourceRow(ctx);

      if (await checkCircuit(this.operationCtx(ctx), this.id)) {
        ctx.logger.warn(`[${this.id}] poll skipped because circuit is open`);
        return;
      }
      if (this.stopping || ctx.abortSignal.aborted) return;

      await this.refreshTokenIfNeeded();
      if (this.stopping || ctx.abortSignal.aborted) return;

      acquiredKeys = this.rateLimitKeys();
      if (acquiredKeys.length > 0) {
        await this.app.rateLimiter.acquire(acquiredKeys);
      }

      if (this.stopping || ctx.abortSignal.aborted) return;

      const cursorState = await this.readCursorState(ctx);
      if (this.stopping || ctx.abortSignal.aborted) return;
      const result = await this.pollOnce(ctx, cursorState);

      // Sync-1d will switch this internal write path to ctx.emit + custom dispatcher.
      for (const obj of result.objects) {
        await upsertEnterpriseObject(this.operationCtx(ctx), obj);
      }

      await this.writeCursorState(ctx, result.cursorState);
      await resetCircuit(this.operationCtx(ctx), this.id);
      this.lastSuccessAt = new Date();
      this.lastError = undefined;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.lastErrorAt = new Date();
      this.lastError = normalized.message;
      ctx.logger.error(`[${this.id}] poll failed: ${normalized.message}`);
      await markIngestError(this.operationCtx(ctx), {
        ingestSourceId: this.id,
        error: normalized,
      });
    } finally {
      if (acquiredKeys.length > 0) {
        this.app.rateLimiter.release(
          acquiredKeys.map(({ tier, key }) => ({ tier, key })),
        );
      }
    }
  }

  protected makeEnterpriseObject(opts: {
    sourceId?: EnterpriseIngestObject['sourceId'];
    sourceType?: EnterpriseIngestObject['sourceType'];
    externalId: EnterpriseIngestObject['externalId'];
    objectType: EnterpriseIngestObject['objectType'];
    title: EnterpriseIngestObject['title'];
    bodyMarkdown: EnterpriseIngestObject['bodyMarkdown'];
    modifiedAt?: EnterpriseIngestObject['modifiedAt'];
    url?: EnterpriseIngestObject['url'];
    participants?: EnterpriseIngestObject['participants'];
    ownerOrgUnit?: EnterpriseIngestObject['ownerOrgUnit'];
    classification?: EnterpriseIngestObject['classification'];
    raw?: EnterpriseIngestObject['raw'];
    metadata?: EnterpriseIngestObject['metadata'];
    rawRef?: string;
  }): EnterpriseIngestObject {
    const sourceId = opts.sourceId ?? this.id;
    const sourceType: EnterpriseIngestObject['sourceType'] = opts.sourceType ?? this.app.appType;
    const participants = opts.participants ?? [];
    const classification = opts.classification ?? 'L1';
    const slug = toEnterpriseSlug(sourceType, sourceId, opts.externalId);

    return {
      sourceId,
      sourceType,
      externalId: opts.externalId,
      objectType: opts.objectType,
      title: opts.title,
      bodyMarkdown: opts.bodyMarkdown,
      modifiedAt: opts.modifiedAt,
      url: opts.url,
      participants,
      ownerOrgUnit: opts.ownerOrgUnit,
      classification,
      raw: opts.raw,
      metadata: {
        ...(opts.metadata ?? {}),
        slug,
        ingest_source_id: sourceId,
        external_id: opts.externalId,
        object_type: opts.objectType,
        source_type: sourceType,
        url: opts.url ?? null,
        participants,
        classification,
        raw_ref: opts.rawRef ?? null,
      },
    };
  }

  protected tokenKind(): TokenKind {
    return 'tenant_access';
  }

  protected tokenScope(): string | undefined {
    return undefined;
  }

  protected rateLimitKeys(): RateLimitKey[] {
    return [
      {
        tier: 'app',
        key: `${this.app.appType}:${this.app.appId}:${this.kind}:poll`,
        limit: 1,
      },
      {
        tier: 'tenant',
        key: `${this.kind}:${this.id}:poll`,
        limit: 1,
      },
    ];
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    const kind = this.tokenKind();
    const scope = this.tokenScope();
    if (await this.app.tokenManager.isExpired(kind, scope)) {
      await this.app.tokenManager.refresh(kind, scope);
    }
  }

  private async ensureSourceRow(ctx: IngestionSourceContext): Promise<void> {
    await ctx.engine.executeRaw(
      `INSERT INTO enterprise_ingest_sources (
         ingest_source_id,
         parent_app_id,
         ingest_source_type,
         display_name,
         connector_config
       ) VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (ingest_source_id) DO UPDATE SET
         parent_app_id = EXCLUDED.parent_app_id,
         ingest_source_type = EXCLUDED.ingest_source_type,
         display_name = EXCLUDED.display_name,
         updated_at = now()`,
      [
        this.id,
        this.app.appId,
        this.kind,
        `${this.app.displayName} ${this.kind}`,
        JSON.stringify({
          adapter: 'BaseEnterpriseIngestionSource',
          mode: this.mode,
        }),
      ],
    );
  }

  private async readCursorState(ctx: IngestionSourceContext): Promise<Record<string, unknown>> {
    const rows = await ctx.engine.executeRaw<CursorRow>(
      `SELECT cursor_state
       FROM enterprise_ingest_sources
       WHERE ingest_source_id = $1`,
      [this.id],
    );
    return toRecord(rows[0]?.cursor_state);
  }

  private async writeCursorState(
    ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<void> {
    await ctx.engine.executeRaw(
      `UPDATE enterprise_ingest_sources
       SET cursor_state = $2::jsonb,
           last_success_at = now(),
           updated_at = now()
       WHERE ingest_source_id = $1`,
      [this.id, JSON.stringify(cursorState)],
    );
  }

  private requireContext(): IngestionSourceContext {
    if (!this.ctx) {
      throw new Error(`BaseEnterpriseIngestionSource '${this.id}' has not been started`);
    }
    return this.ctx;
  }

  private operationCtx(ctx: IngestionSourceContext): OperationContext {
    return {
      engine: ctx.engine,
      config: { engine: ctx.engine.kind },
      logger: ctx.logger,
      dryRun: false,
      remote: false,
      sourceId: 'enterprise',
    } as OperationContext;
  }
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
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toDate(value: string | Date | null): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
