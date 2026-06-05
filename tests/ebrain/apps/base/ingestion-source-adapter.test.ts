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
import type {
  EnterpriseApp,
  EnterpriseConnector,
  EnterpriseIngestObject,
  RateLimitKey,
  TieredRateLimiter,
  TokenKind,
  TokenManager,
  TokenRefreshResult,
} from '../../../../src/ebrain/apps/base/index.ts';
import { BaseEnterpriseIngestionSource } from '../../../../src/ebrain/apps/base/index.ts';
import { toEnterpriseSlug } from '../../../../src/ebrain/sources/ingest-common.ts';
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

  makeTestObject(overrides: Partial<EnterpriseIngestObject> = {}): EnterpriseIngestObject {
    return this.makeEnterpriseObject({
      externalId: 'doc-helper',
      objectType: 'doc',
      title: 'Helper Doc',
      bodyMarkdown: 'Helper body',
      modifiedAt: '2026-05-20T00:00:00.000Z',
      url: 'https://example.test/helper',
      participants: ['user-helper'],
      rawRef: 'feishu://doc/doc-helper',
      metadata: { helper: true },
      ...overrides,
    });
  }

  protected async pollOnce(
    _ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ objects: EnterpriseIngestObject[]; cursorState: Record<string, unknown> }> {
    this.pollCalls += 1;
    this.cursors.push(cursorState);
    if (this.throwOnPoll) {
      throw new Error(`poll failed ${this.pollCalls}`);
    }
    if (this.pollGate) {
      await this.pollGate;
    }
    const externalId = `doc-${this.pollCalls}`;
    return {
      objects: [
        this.makeEnterpriseObject({
          externalId,
          objectType: 'doc',
          title: `Doc ${this.pollCalls}`,
          bodyMarkdown: `body-${this.pollCalls}`,
          modifiedAt: `2026-05-20T00:0${this.pollCalls}:00.000Z`,
          url: `https://example.test/docs/${externalId}`,
          participants: ['user-a', 'user-b'],
          classification: 'L1',
          raw: { id: externalId, body: `body-${this.pollCalls}` },
          rawRef: `feishu://doc/${externalId}`,
          metadata: { fixture: true },
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
  test('implements IngestionSource and upserts from initial and interval polls', async () => {
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

      expect(emitted).toEqual([]);
      const rows = await engine.executeRaw<{ external_id: string; page_slug: string; status: string }>(
        `SELECT external_id, page_slug, status
         FROM enterprise_ingest_objects
         WHERE ingest_source_id = $1
         ORDER BY external_id`,
        ['feishu-docs:tenant-acme'],
      );
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows).toContainEqual({
        external_id: 'doc-1',
        page_slug: toEnterpriseSlug('feishu', 'feishu-docs:tenant-acme', 'doc-1'),
        status: 'ingested',
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

  test('writes enterprise object rows and page provenance instead of daemon events', async () => {
    const { app } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });
    const emitted: IngestionEvent[] = [];

    await source.runGuarded(makeIngestionCtx({ emitted }));

    expect(emitted).toEqual([]);
    const expectedSlug = toEnterpriseSlug('feishu', 'feishu-docs:tenant-acme', 'doc-1');
    const objectRows = await engine.executeRaw<{
      external_id: string;
      object_type: string;
      page_slug: string;
      metadata: unknown;
    }>(
      `SELECT external_id, object_type, page_slug, metadata
       FROM enterprise_ingest_objects
       WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-docs:tenant-acme', 'doc-1'],
    );
    expect(objectRows).toHaveLength(1);
    expect(objectRows[0]).toMatchObject({
      external_id: 'doc-1',
      object_type: 'doc',
      page_slug: expectedSlug,
    });
    expect(toRecord(objectRows[0].metadata)).toMatchObject({
      source_type: 'feishu',
      object_type: 'doc',
      raw_inline: true,
    });

    const pageRows = await engine.executeRaw<{
      slug: string;
      frontmatter: unknown;
      provenance: unknown;
    }>(
      `SELECT slug, frontmatter, provenance
       FROM pages
       WHERE source_id = 'enterprise' AND slug = $1`,
      [expectedSlug],
    );
    expect(pageRows).toHaveLength(1);
    expect(toRecord(pageRows[0].frontmatter)).toMatchObject({
      external_id: 'doc-1',
      object_type: 'doc',
      url: 'https://example.test/docs/doc-1',
      participants: ['user-a', 'user-b'],
      classification: 'L1',
    });
    expect(toRecord(pageRows[0].provenance)).toMatchObject({
      ingest_source_id: 'feishu-docs:tenant-acme',
      external_id: 'doc-1',
      object_type: 'doc',
      source_type: 'feishu',
      url: 'https://example.test/docs/doc-1',
      participants: ['user-a', 'user-b'],
      metadata: {
        slug: expectedSlug,
        external_id: 'doc-1',
        object_type: 'doc',
        source_type: 'feishu',
        raw_ref: 'feishu://doc/doc-1',
      },
    });
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

  test('makeEnterpriseObject stamps source provenance metadata', () => {
    const { app } = makeEnterpriseApp();
    const source = new TestEnterpriseSource({
      id: 'feishu-docs:tenant-acme',
      kind: 'feishu-docs',
      app,
    });

    const obj = source.makeTestObject({
      externalId: 'doc-1',
    });
    const expectedSlug = toEnterpriseSlug('feishu', 'feishu-docs:tenant-acme', 'doc-1');

    expect(obj).toMatchObject({
      sourceId: 'feishu-docs:tenant-acme',
      sourceType: 'feishu',
      externalId: 'doc-1',
      objectType: 'doc',
      classification: 'L1',
      participants: ['user-helper'],
      metadata: {
        helper: true,
        slug: expectedSlug,
        ingest_source_id: 'feishu-docs:tenant-acme',
        external_id: 'doc-1',
        object_type: 'doc',
        source_type: 'feishu',
        url: 'https://example.test/helper',
        participants: ['user-helper'],
        classification: 'L1',
        raw_ref: 'feishu://doc/doc-helper',
      },
    });
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
