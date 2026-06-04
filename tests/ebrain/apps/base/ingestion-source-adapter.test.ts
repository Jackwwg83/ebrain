import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from 'bun:test';
import { PGLiteEngine } from '../../../../src/core/pglite-engine.ts';
import type {
  IngestionEvent,
  IngestionSource,
  IngestionSourceContext,
} from '../../../../src/core/ingestion/types.ts';
import {
  computeContentHash,
  validateIngestionEvent,
} from '../../../../src/core/ingestion/types.ts';
import type {
  EnterpriseApp,
  EnterpriseConnector,
  RateLimitKey,
  TieredRateLimiter,
  TokenKind,
  TokenManager,
  TokenRefreshResult,
} from '../../../../src/ebrain/apps/base/index.ts';
import { BaseEnterpriseIngestionSource } from '../../../../src/ebrain/apps/base/index.ts';
import { resetPgliteState } from '../../../../test/helpers/reset-pglite.ts';

setDefaultTimeout(30_000);

let engine: PGLiteEngine;

class FakeTokenManager implements TokenManager {
  expired = false;
  isExpiredCalls: Array<{ kind: TokenKind; scope?: string }> = [];
  refreshCalls: Array<{ kind: TokenKind; scope?: string }> = [];

  constructor(private readonly callOrder?: string[]) {}

  async getToken(_kind: TokenKind, _scope?: string): Promise<string> {
    return 'token';
  }

  async refresh(kind: TokenKind, scope?: string): Promise<TokenRefreshResult> {
    this.callOrder?.push('refresh');
    this.refreshCalls.push({ kind, scope });
    return { accessToken: 'fresh-token', expiresAt: new Date(Date.now() + 3600_000) };
  }

  async isExpired(kind: TokenKind, scope?: string): Promise<boolean> {
    this.isExpiredCalls.push({ kind, scope });
    return this.expired;
  }
}

class FakeRateLimiter implements TieredRateLimiter {
  acquired: RateLimitKey[][] = [];
  released: Array<Array<Omit<RateLimitKey, 'limit'>>> = [];

  constructor(private readonly callOrder?: string[]) {}

  async acquire(keys: RateLimitKey[]): Promise<void> {
    this.callOrder?.push('acquire');
    this.acquired.push(keys);
  }

  release(keys: Array<Omit<RateLimitKey, 'limit'>>): void {
    this.released.push(keys);
  }
}

class TestEnterpriseSource extends BaseEnterpriseIngestionSource {
  pollCalls = 0;
  cursors: Record<string, unknown>[] = [];
  throwOnPoll = false;
  nextCursor?: Record<string, unknown>;
  pollGate?: Promise<void>;

  async runGuarded(ctx: IngestionSourceContext): Promise<void> {
    this.ctx = ctx;
    await this.pollWithGuards();
  }

  isRunning(): boolean {
    return this.timer !== undefined;
  }

  getPollIntervalMs(): number {
    return this.pollIntervalMs;
  }

  setStopDrainGraceMs(ms: number): void {
    this.stopDrainGraceMs = ms;
  }

  makeTestEvent(opts: {
    source_uri: string;
    content_type: IngestionEvent['content_type'];
    content: string;
    trusted?: boolean;
  }): IngestionEvent {
    return this.makeEvent(opts);
  }

  protected async pollOnce(
    _ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ events: IngestionEvent[]; cursorState: Record<string, unknown> }> {
    this.pollCalls += 1;
    this.cursors.push(cursorState);
    if (this.throwOnPoll) {
      throw new Error(`poll failed ${this.pollCalls}`);
    }
    if (this.pollGate) {
      await this.pollGate;
    }
    return {
      events: [
        this.makeEvent({
          source_uri: `feishu://doc/${this.pollCalls}`,
          content_type: 'text/markdown',
          content: `body-${this.pollCalls}`,
        }),
      ],
      cursorState: this.nextCursor ?? { count: this.pollCalls },
    };
  }
}

beforeAll(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
});

afterAll(async () => {
  await engine.disconnect();
});

beforeEach(async () => {
  await resetPgliteState(engine);
  await seedEnterpriseApp();
});

describe('BaseEnterpriseIngestionSource', () => {
  test('implements IngestionSource and emits from initial and interval polls', async () => {
    const { app, rateLimiter } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
      pollIntervalMs: 10,
    });
    const _contract: IngestionSource = source;
    const emitted: IngestionEvent[] = [];
    const ctx = makeIngestionCtx({ emitted });

    await source.start(ctx);
    try {
      expect(source.pollCalls).toBe(1);
      await waitFor(() => source.pollCalls >= 2);

      expect(emitted.length).toBeGreaterThanOrEqual(2);
      expect(emitted[0]).toMatchObject({
        source_id: 'feishu-docs:tenant-acme',
        source_kind: 'feishu-docs',
        source_uri: 'feishu://doc/1',
      });
      expect(rateLimiter.acquired.length).toBeGreaterThanOrEqual(2);
      expect(rateLimiter.released.length).toBe(rateLimiter.acquired.length);
    } finally {
      await source.stop();
    }
  });

  test('skips pollOnce when enterprise circuit is open', async () => {
    await seedIngestSource({
      id: 'feishu-docs:tenant-acme',
      circuitOpen: true,
    });
    const { app, rateLimiter } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
      pollIntervalMs: 60_000,
    });
    const emitted: IngestionEvent[] = [];

    await source.start(makeIngestionCtx({ emitted }));
    await source.stop();

    expect(source.pollCalls).toBe(0);
    expect(emitted).toEqual([]);
    expect(rateLimiter.acquired).toEqual([]);
  });

  test('refreshes expired OAuth token before polling', async () => {
    const { app, tokenManager } = makeEnterpriseApp();
    tokenManager.expired = true;
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });

    await source.runGuarded(makeIngestionCtx());

    expect(tokenManager.isExpiredCalls).toEqual([{ kind: 'tenant_access', scope: undefined }]);
    expect(tokenManager.refreshCalls).toEqual([{ kind: 'tenant_access', scope: undefined }]);
    expect(source.pollCalls).toBe(1);
  });

  test('refreshes expired OAuth token before acquiring poll rate limit', async () => {
    const callOrder: string[] = [];
    const { app, tokenManager } = makeEnterpriseApp({ callOrder });
    tokenManager.expired = true;
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });

    await source.runGuarded(makeIngestionCtx());

    expect(callOrder).toEqual(['refresh', 'acquire']);
    expect(source.pollCalls).toBe(1);
  });

  test('rejects non-positive or non-finite pollIntervalMs and keeps the default', () => {
    const { app } = makeEnterpriseApp();

    for (const pollIntervalMs of [0, -1, Number.NaN]) {
      expect(() => new TestEnterpriseSource({
        id: `feishu-docs:tenant-${String(pollIntervalMs)}`,
        kind: 'feishu-docs',
        app,
        pollIntervalMs,
      })).toThrow('pollIntervalMs must be positive finite');
    }

    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-default',
      kind: 'feishu-docs',
      app,
    });
    expect(source.getPollIntervalMs()).toBe(60_000);
  });

  test('reads and writes cursor_state in enterprise_ingest_sources', async () => {
    await seedIngestSource({
      id: 'feishu-docs:tenant-acme',
      cursorState: { page_token: 'before' },
    });
    const { app } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });
    source.nextCursor = { page_token: 'after', total_seen: 3 };

    await source.runGuarded(makeIngestionCtx());

    expect(source.cursors).toEqual([{ page_token: 'before' }]);
    const rows = await engine.executeRaw<{
      cursor_state: unknown;
      last_success_at: string | Date | null;
    }>(
      `SELECT cursor_state, last_success_at
       FROM enterprise_ingest_sources
       WHERE ingest_source_id = $1`,
      ['feishu-docs:tenant-acme'],
    );
    expect(toRecord(rows[0].cursor_state)).toEqual({ page_token: 'after', total_seen: 3 });
    expect(rows[0].last_success_at).toBeTruthy();
  });

  test('stops polling when ctx.abortSignal aborts', async () => {
    const controller = new AbortController();
    const { app } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
      pollIntervalMs: 60_000,
    });

    await source.start(makeIngestionCtx({ controller }));
    expect(source.pollCalls).toBe(1);
    expect(source.isRunning()).toBe(true);

    controller.abort();
    await waitFor(() => !source.isRunning());
    const callsAfterAbort = source.pollCalls;
    await sleep(20);

    expect(source.pollCalls).toBe(callsAfterAbort);
  });

  test('stop drains an in-flight poll before resolving', async () => {
    const { app } = makeEnterpriseApp();
    let releasePoll!: () => void;
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });
    source.nextCursor = { drained: true };
    source.pollGate = new Promise(resolve => {
      releasePoll = resolve;
    });

    const pollPromise = source.runGuarded(makeIngestionCtx());
    await waitFor(() => source.pollCalls === 1);

    let stopResolved = false;
    const stopPromise = source.stop().then(() => {
      stopResolved = true;
    });
    await sleep(20);
    expect(stopResolved).toBe(false);

    releasePoll();
    await stopPromise;
    await pollPromise;

    const rows = await engine.executeRaw<{ cursor_state: unknown }>(
      `SELECT cursor_state
       FROM enterprise_ingest_sources
       WHERE ingest_source_id = $1`,
      ['feishu-docs:tenant-acme'],
    );
    expect(toRecord(rows[0].cursor_state)).toEqual({ drained: true });
    expect(stopResolved).toBe(true);
  });

  test('stop returns after bounded grace when an in-flight poll hangs', async () => {
    const { app } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });
    source.setStopDrainGraceMs(20);
    source.pollGate = new Promise(() => {});

    const pollPromise = source.runGuarded(makeIngestionCtx());
    void pollPromise.catch(() => {});
    await waitFor(() => source.pollCalls === 1);

    const started = Date.now();
    await source.stop();
    const elapsed = Date.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(15);
    expect(elapsed).toBeLessThan(500);
  });

  test('records poll errors and opens circuit at existing threshold', async () => {
    const { app, rateLimiter } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });
    source.throwOnPoll = true;
    const ctx = makeIngestionCtx();

    for (let i = 0; i < 5; i += 1) {
      await source.runGuarded(ctx);
    }

    const rows = await engine.executeRaw<{
      consecutive_errors: number;
      last_error: string | null;
      open_seconds: number;
    }>(
      `SELECT consecutive_errors,
              last_error,
              extract(epoch from (circuit_open_until - now()))::int AS open_seconds
       FROM enterprise_ingest_sources
       WHERE ingest_source_id = $1`,
      ['feishu-docs:tenant-acme'],
    );

    expect(source.pollCalls).toBe(5);
    expect(rows[0].consecutive_errors).toBe(5);
    expect(rows[0].last_error).toBe('poll failed 5');
    expect(rows[0].open_seconds).toBeGreaterThan(25 * 60);
    expect(rateLimiter.released.length).toBe(5);

    const health = await source.healthCheck();
    expect(health.status).toBe('warn');
    expect(health.message).toContain('circuit open until');
  });

  test('makeEvent fills required upstream fields and computeContentHash', () => {
    const { app } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });

    const event = source.makeTestEvent({
      source_uri: 'feishu://doc/doc-1',
      content_type: 'text/plain',
      content: 'hello enterprise',
      trusted: false,
    });

    expect(event).toMatchObject({
      source_id: 'feishu-docs:tenant-acme',
      source_kind: 'feishu-docs',
      source_uri: 'feishu://doc/doc-1',
      content_type: 'text/plain',
      content: 'hello enterprise',
      content_hash: computeContentHash('hello enterprise'),
      untrusted_payload: true,
    });
    expect(Date.parse(event.received_at)).toBeGreaterThan(0);
    expect(validateIngestionEvent(event)).toBeNull();
  });
});

function makeEnterpriseApp(opts: { callOrder?: string[] } = {}): {
  app: EnterpriseApp;
  tokenManager: FakeTokenManager;
  rateLimiter: FakeRateLimiter;
} {
  const tokenManager = new FakeTokenManager(opts.callOrder);
  const rateLimiter = new FakeRateLimiter(opts.callOrder);
  return {
    tokenManager,
    rateLimiter,
    app: {
      appId: 'test-app',
      appType: 'feishu',
      displayName: 'Test App',
      tokenManager,
      rateLimiter,
      subConnectors: [] as EnterpriseConnector[],
      enabled: true,
      botEnabled: false,
      pushEnabled: false,
      consecutiveErrors: 0,
    },
  };
}

function makeIngestionCtx(opts: {
  emitted?: IngestionEvent[];
  controller?: AbortController;
} = {}): IngestionSourceContext {
  const emitted = opts.emitted ?? [];
  const controller = opts.controller ?? new AbortController();
  return {
    emit(event: IngestionEvent): void {
      emitted.push(event);
    },
    engine,
    logger: { info() {}, warn() {}, error() {} },
    abortSignal: controller.signal,
    config: {},
  };
}

async function seedEnterpriseApp(appId = 'test-app'): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_apps (app_id, app_type, display_name, credentials, config)
     VALUES ($1, 'feishu', 'Test App', '{}'::jsonb, '{}'::jsonb)
     ON CONFLICT (app_id) DO NOTHING`,
    [appId],
  );
}

async function seedIngestSource(opts: {
  id: string;
  cursorState?: Record<string, unknown>;
  circuitOpen?: boolean;
}): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_ingest_sources (
       ingest_source_id,
       parent_app_id,
       ingest_source_type,
       display_name,
       cursor_state,
       circuit_open_until
     ) VALUES ($1, 'test-app', 'feishu-docs', 'Feishu Docs', $2::jsonb, ${opts.circuitOpen ? "now() + INTERVAL '30 minutes'" : 'NULL'})
     ON CONFLICT (ingest_source_id) DO UPDATE SET
       cursor_state = EXCLUDED.cursor_state,
       circuit_open_until = EXCLUDED.circuit_open_until`,
    [opts.id, JSON.stringify(opts.cursorState ?? {})],
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>;
  return value as Record<string, unknown>;
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await sleep(5);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
