import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test';
import type { Subprocess } from 'bun';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createTcpServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgresEngine } from '../../src/core/postgres-engine.ts';
import { LATEST_VERSION } from '../../src/core/migrate.ts';
import { importFromContent } from '../../src/core/import-file.ts';
import {
  renderFactsTable,
  type FactKind,
  type FactNotability,
  type FactVisibility,
  type ParsedFact,
} from '../../src/core/facts-fence.ts';
import type { OperationContext } from '../../src/core/operations.ts';
import { EBRAIN_SOURCE_ID } from '../../src/ebrain/constants.ts';
import { createExecutive } from '../../src/ebrain/executives/create.ts';
import {
  dreamCycleEnterpriseHandler,
  ENTERPRISE_CYCLE_PARENT_JOB,
  ENTERPRISE_CYCLE_SHARD_JOB,
  type EnterpriseCycleParentResult,
  type EnterpriseCycleShardResult,
} from '../../src/ebrain/jobs/dream-cycle-enterprise.ts';
import { SHARD_COUNT } from '../../src/ebrain/cycle/shard.ts';
import {
  _setExecutiveBriefDepsForTest,
  runExecutiveBrief,
} from '../../src/ebrain/jobs/executive-brief.ts';
import { pushMorningBrief } from '../../src/ebrain/bot/push-orchestrator.ts';
import { handleImWebhook, type ImDecodedEvent } from '../../src/ebrain/bot/router.ts';
import type {
  BotAdapter,
  EnterpriseApp,
  IncomingRequest,
  PushContent,
  Reply,
} from '../../src/ebrain/apps/base/index.ts';

setDefaultTimeout(180_000);

const DATABASE_URL = process.env.DATABASE_URL;
const describeE2E = DATABASE_URL ? describe : describe.skip;
const REPO = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const ADMIN_BOOTSTRAP_TOKEN = 'K2AdminBootstrapToken0123456789abcdef';

type AppType = 'feishu' | 'dingtalk' | 'wecom' | 'tencent-meeting' | 'crm-custom';

interface FixtureFile {
  appId: string;
  appType: AppType;
  appName: string;
  connector: string;
  sourceId: string;
  objectType: string;
  path: string;
  adapterStatus: 'wired-app-adapter' | 'fixture-db-only';
}

interface FixtureEntity {
  slug: string;
  type: 'company' | 'person' | 'deal' | 'project';
  title: string;
  aliases?: string[];
}

interface FixtureFact {
  claim?: string;
  kind?: string;
  confidence?: number;
  visibility?: string;
  notability?: string;
  validFrom?: string;
  validUntil?: string;
  source?: string;
  context?: string;
  claimMetric?: string;
  claimValue?: number;
  claimUnit?: string;
  claimPeriod?: string;
}

interface NormalizedFixtureRecord {
  externalId: string;
  title: string;
  modifiedTime: string;
  bodyMarkdown: string;
  entity: FixtureEntity;
  facts: FixtureFact[];
  raw: unknown;
}

interface PushCall {
  userId: string;
  subject: string | undefined;
  bodyMarkdown: string;
}

interface ServeProc {
  proc: Subprocess;
  home: string;
  port: number;
  cookie: string;
  stderr: string;
}

const EXECUTIVE_IDS = ['ceo', 'cfo', 'coo', 'cto', 'cpo'] as const;

const K2_FIXTURE_FILES: FixtureFile[] = [
  {
    appId: 'k2-feishu',
    appType: 'feishu',
    appName: 'K2 Feishu Mock App',
    connector: 'docs',
    sourceId: 'k2-feishu-docs',
    objectType: 'doc',
    path: 'src/ebrain/apps/feishu/fixtures/docs-list.json',
    adapterStatus: 'fixture-db-only',
  },
  {
    appId: 'k2-dingtalk',
    appType: 'dingtalk',
    appName: 'K2 DingTalk Mock App',
    connector: 'im',
    sourceId: 'k2-dingtalk-im',
    objectType: 'im-message',
    path: 'src/ebrain/apps/dingtalk/fixtures/im-messages.json',
    adapterStatus: 'wired-app-adapter',
  },
  {
    appId: 'k2-wecom',
    appType: 'wecom',
    appName: 'K2 WeCom Mock App',
    connector: 'messages',
    sourceId: 'k2-wecom-messages',
    objectType: 'im-message',
    path: 'src/ebrain/apps/wecom/fixtures/messages.json',
    adapterStatus: 'fixture-db-only',
  },
  {
    appId: 'k2-tencent-meeting',
    appType: 'tencent-meeting',
    appName: 'K2 Tencent Meeting Mock App',
    connector: 'transcripts',
    sourceId: 'k2-tencent-transcripts',
    objectType: 'meeting-transcript',
    path: 'src/ebrain/apps/tencent-meeting/fixtures/transcripts.json',
    adapterStatus: 'fixture-db-only',
  },
  {
    appId: 'k2-crm',
    appType: 'crm-custom',
    appName: 'K2 CRM Mock App',
    connector: 'accounts',
    sourceId: 'k2-crm-accounts',
    objectType: 'account',
    path: 'src/ebrain/apps/crm/fixtures/accounts.json',
    adapterStatus: 'fixture-db-only',
  },
];

let engine: PostgresEngine;
let ctx: OperationContext;
let originalFetch: typeof fetch;
let server: ServeProc | null = null;

beforeAll(async () => {
  if (!DATABASE_URL) return;
  originalFetch = globalThis.fetch;
  globalThis.fetch = localOnlyFetch(originalFetch);

  engine = new PostgresEngine();
  await engine.connect({ database_url: DATABASE_URL });
  await engine.initSchema();
  ctx = makeCtx(engine);
});

afterAll(async () => {
  _setExecutiveBriefDepsForTest(null);
  await stopAdminServer(server);
  server = null;
  if (engine) await engine.disconnect();
  if (originalFetch) globalThis.fetch = originalFetch;
});

if (!DATABASE_URL) {
  test.skip('K2 Postgres E2E skipped (DATABASE_URL unset)', () => {});
}

describeE2E('Ebrain K2 Postgres full flow', () => {
  test('runs fresh Postgres -> v200 -> 5 apps -> fixtures -> enterprise cycle -> webhook -> brief push -> admin stats', async () => {
    expect(K2_FIXTURE_FILES).toHaveLength(5);

    // 1. fresh Postgres start: the runner owns Docker lifecycle; the test verifies the live DB target.
    await resetDatabase();
    const dbRows = await engine.executeRaw<{ db: string; vector_installed: boolean }>(
      `SELECT current_database() AS db,
              EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector_installed`,
    );
    expect(dbRows[0]?.db).toBe(expectedDatabaseName());
    expect(dbRows[0]?.vector_installed).toBe(true);
    expect(await countRows('executives')).toBe(0);

    // 2. v200 migrate apply.
    expect(Number(await engine.getConfig('version'))).toBe(LATEST_VERSION);
    expect(LATEST_VERSION).toBeGreaterThanOrEqual(200);
    await expectTables(['enterprise_apps', 'enterprise_oauth_tokens', 'executives', 'enterprise_fact_conflicts']);

    // 3. create 5 executives through the E1 helper.
    for (const [index, executiveId] of EXECUTIVE_IDS.entries()) {
      const profile = await createExecutive(engine, {
        executiveId,
        email: `${executiveId}@example.test`,
        displayName: `${executiveId.toUpperCase()} Example`,
        role: executiveId.toUpperCase(),
        soulPath: `executives/${executiveId}/SOUL.md`,
        timezone: 'Asia/Shanghai',
        locale: 'zh-CN',
        feishuUserId: index === 0 ? 'fs-user-1' : `fs-user-${index + 1}`,
        dingtalkUserId: `dt-user-${index + 1}`,
        wecomUserId: `wc-user-${index + 1}`,
        pushPreferences: {
          morning_brief: { enabled: true, time: '08:00', provider: 'dingtalk', channel: 'user' },
          critical_signal: { enabled: true, provider: 'dingtalk', channel: 'user' },
          conflict_alert: { enabled: true, provider: 'dingtalk', channel: 'user' },
        },
      });
      expect(profile.executiveId).toBe(executiveId);
      expect(profile.locale).toBe('zh-CN');
    }
    expect(await countRows('executives', 'deleted_at IS NULL AND active = true')).toBe(5);

    // 4. register 5 EnterpriseApps with mock OAuth credentials, without hitting a vendor OAuth API.
    for (const fixture of K2_FIXTURE_FILES) {
      await seedEnterpriseApp(fixture);
      await seedMockOauthToken(fixture);
    }
    const appCoverage = await engine.executeRaw<{ app_type: string; app_count: string; token_count: string }>(
      `SELECT a.app_type,
              COUNT(DISTINCT a.app_id)::text AS app_count,
              COUNT(t.app_id)::text AS token_count
         FROM enterprise_apps a
         LEFT JOIN enterprise_oauth_tokens t ON t.app_id = a.app_id
        GROUP BY a.app_type
        ORDER BY a.app_type`,
    );
    expect(appCoverage.map(row => row.app_type)).toEqual(['crm-custom', 'dingtalk', 'feishu', 'tencent-meeting', 'wecom']);
    expect(appCoverage.every(row => row.app_count === '1' && row.token_count === '1')).toBe(true);

    // 5. sync 5 connector fixture sets through the K1 import-file shape.
    const importedSlugs: string[] = [];
    const entitySlugs = new Map<string, FixtureEntity>();
    let recordsImported = 0;
    for (const fixture of K2_FIXTURE_FILES) {
      await seedEnterpriseIngestSource(fixture);
      const records = await loadFixtureRecords(fixture);
      expect(records.length, `${fixture.sourceId} should have fixture records`).toBeGreaterThan(0);
      for (let i = 0; i < records.length; i++) {
        const normalized = normalizeFixtureRecord(fixture, records[i], i);
        entitySlugs.set(normalized.entity.slug, normalized.entity);
        importedSlugs.push(await importFixtureRecord(fixture, normalized));
        recordsImported += 1;
      }
    }
    for (const entity of entitySlugs.values()) {
      await importEntityPage(entity);
    }
    expect(recordsImported).toBeGreaterThanOrEqual(5);
    expect(await countRows('enterprise_ingest_sources')).toBe(5);
    expect(await countRows('enterprise_ingest_objects')).toBe(recordsImported);
    expect(await countRows('pages', `source_id = '${EBRAIN_SOURCE_ID}' AND slug LIKE 'k2-fixtures/%'`)).toBe(recordsImported);

    // 6. run F2 enterprise-cycle directly: parent fan-out plus all 8 child shards and 6 phases.
    const cycleResult = await runEnterpriseCycleForAllShards();
    expect(cycleResult.parent.waitingForChildren).toBe(true);
    expect(cycleResult.parent.childJobIds).toHaveLength(SHARD_COUNT);
    expect(cycleResult.shards).toHaveLength(SHARD_COUNT);
    expect(cycleResult.shards.every(result => result.phases.length === 6)).toBe(true);
    expect(cycleResult.shards.every(result => result.failedPhases === 0)).toBe(true);
    expect(cycleResult.totals.changedPages).toBeGreaterThanOrEqual(recordsImported);
    expect(cycleResult.totals.factsInserted).toBeGreaterThanOrEqual(recordsImported);
    expect(cycleResult.totals.conflictsDetected).toBeGreaterThanOrEqual(1);
    expect(cycleResult.totals.conflictsInserted).toBeGreaterThanOrEqual(1);
    expect(await countRows('facts', `source_id = '${EBRAIN_SOURCE_ID}'`)).toBeGreaterThanOrEqual(recordsImported);
    expect(await countRows('enterprise_fact_conflicts', `status = 'open'`)).toBeGreaterThanOrEqual(1);
    await markCycleCompleted(cycleResult.shards);

    // 7. simulate a Feishu webhook @brain event through the D2 webhook router.
    const webhookSubmissions: Array<{ job: { name: string; queue?: string; data: Record<string, unknown> }; opts: Record<string, unknown> }> = [];
    (engine as unknown as { submitJob: unknown }).submitJob = async (
      job: { name: string; queue?: string; data: Record<string, unknown> },
      opts: Record<string, unknown>,
    ) => {
      webhookSubmissions.push({ job, opts });
      return { id: 7001 };
    };
    const webhookRes = makeRes();
    await handleImWebhook('feishu', makeIncomingRequest(), webhookRes.res, {
      engine: engine as never,
      app: makeWebhookApp(),
      logger: { warn() {}, error() {}, info() {} },
    });
    await waitUntil(() => webhookSubmissions.length === 1, 'webhook subagent enqueue');
    expect(webhookRes.calls.status).toEqual([200]);
    expect(webhookSubmissions[0].job.name).toBe('subagent');
    expect(webhookSubmissions[0].job.data.prompt).toContain('@brain');
    expect((webhookSubmissions[0].job.data.auth as { executiveId?: string }).executiveId).toBe('ceo');
    expect((webhookSubmissions[0].job.data.ctx as { remote?: boolean }).remote).toBe(true);
    expect(webhookSubmissions[0].opts).toEqual({ allowProtectedSubmit: true });

    // 8. generate/push briefs with a mock BotAdapter and inspect pushToUser calls.
    const { apps, pushCalls } = makePushApps();
    _setExecutiveBriefDepsForTest({
      async pushMorningBrief(briefEngine, executiveId, content) {
        return pushMorningBrief(briefEngine, executiveId, content, { apps });
      },
    });
    for (const executiveId of EXECUTIVE_IDS) {
      const result = await runExecutiveBrief(ctx, {
        executiveId,
        dateUtc: new Date('2026-05-22T00:00:00.000Z'),
      });
      expect(result.pushed, executiveId).toBe(true);
      expect(result.briefSlug).toBe(`briefs/daily/2026-05-22-${executiveId}`);
    }
    expect(pushCalls).toHaveLength(5);
    expect(pushCalls.map(call => call.userId).sort()).toEqual(['dt-user-1', 'dt-user-2', 'dt-user-3', 'dt-user-4', 'dt-user-5']);
    expect(await countRows('pages', `source_id = '${EBRAIN_SOURCE_ID}' AND slug LIKE 'briefs/daily/2026-05-22-%'`)).toBe(5);

    // 9. call the real H1 admin dashboard stats endpoint and inspect its payload.
    server = await startAdminServer();
    const stats = await adminFetch(server, '/admin/api/ebrain/stats');
    expect(stats.status).toBe(200);
    const body = await stats.json() as {
      active_executives: number;
      briefs_today: number;
      brief_success_rate: number | null;
      open_conflicts: number;
      last_cycle_at: string | null;
      cycle_status: string;
      cycle_phases: Array<{ phase: string; status: string; updated_at: string | null }>;
    };
    expect(body.active_executives).toBe(5);
    expect(body.briefs_today).toBe(5);
    expect(body.brief_success_rate).toBe(1);
    expect(body.open_conflicts).toBeGreaterThanOrEqual(1);
    expect(body.last_cycle_at).not.toBeNull();
    expect(body.cycle_status).toBe('warn');
    expect(body.cycle_phases).toHaveLength(6);
    expect(body.cycle_phases.every(phase => phase.updated_at !== null)).toBe(true);
  });
});

function localOnlyFetch(realFetch: typeof fetch): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const rawUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
    const url = new URL(rawUrl);
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      return realFetch(input, init);
    }
    throw new Error(`K2 E2E forbids external network fetch: ${url.href}`);
  }) as typeof fetch;
}

function makeCtx(pg: PostgresEngine): OperationContext {
  return {
    engine: pg,
    config: { engine: 'postgres', database_url: DATABASE_URL },
    logger: { info() {}, warn() {}, error() {} },
    dryRun: false,
    remote: false,
    sourceId: EBRAIN_SOURCE_ID,
  } as OperationContext;
}

function expectedDatabaseName(): string {
  if (!DATABASE_URL) return 'ebrain_e2e';
  try {
    const parsed = new URL(DATABASE_URL);
    return parsed.pathname.replace(/^\//, '') || 'ebrain_e2e';
  } catch {
    return 'ebrain_e2e';
  }
}

async function resetDatabase(): Promise<void> {
  await engine.executeRaw(
    `TRUNCATE enterprise_oauth_tokens,
              enterprise_ingest_objects,
              enterprise_ingest_sources,
              enterprise_entity_aliases,
              enterprise_fact_conflicts,
              facts,
              pages,
              sources,
              executives,
              minion_inbox,
              minion_jobs
       RESTART IDENTITY CASCADE`,
  );
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config)
     VALUES ($1, $2, $3::jsonb), ($4, $5, $6::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [
      'default',
      'default',
      JSON.stringify({ stage: 'K2', default: true }),
      EBRAIN_SOURCE_ID,
      EBRAIN_SOURCE_ID,
      JSON.stringify({ stage: 'K2', postgres_e2e: true }),
    ],
  );
}

async function expectTables(tables: string[]): Promise<void> {
  const rows = await engine.executeRaw<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])
      ORDER BY table_name`,
    [tables],
  );
  expect(rows.map(row => row.table_name)).toEqual([...tables].sort());
}

async function seedEnterpriseApp(fixture: FixtureFile): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_apps (
       app_id,
       app_type,
       display_name,
       credentials,
       api_base_url,
       config,
       enabled,
       bot_enabled,
       push_enabled
     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, true, true, true)`,
    [
      fixture.appId,
      fixture.appType,
      fixture.appName,
      JSON.stringify({
        oauth_mode: 'mock',
        client_id: `${fixture.appId}-client`,
        client_secret_ref: 'mock-only-not-a-real-secret',
      }),
      `https://${fixture.appType}.example.invalid`,
      JSON.stringify({ stage: 'K2', fixture_path: fixture.path, network: 'disabled' }),
    ],
  );
}

async function seedMockOauthToken(fixture: FixtureFile): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_oauth_tokens (
       app_id,
       token_kind,
       scope_key,
       access_token,
       refresh_token,
       expires_at,
       scopes,
       metadata
     ) VALUES ($1, 'tenant_access', 'tenant:k2', $2, $3, now() + interval '2 hours', $4::text[], $5::jsonb)`,
    [
      fixture.appId,
      `mock-access-token-${fixture.appId}`,
      `mock-refresh-token-${fixture.appId}`,
      ['fixture.read', 'fixture.write'],
      JSON.stringify({ mocked: true, vendor_oauth_called: false }),
    ],
  );
}

async function seedEnterpriseIngestSource(fixture: FixtureFile): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_ingest_sources (
       ingest_source_id,
       parent_app_id,
       ingest_source_type,
       display_name,
       connector_config,
       last_success_at
     ) VALUES ($1, $2, $3, $4, $5::jsonb, now())`,
    [
      fixture.sourceId,
      fixture.appId,
      fixture.appType,
      `${fixture.appName} ${fixture.connector}`,
      JSON.stringify({
        connector: fixture.connector,
        fixture_path: fixture.path,
        adapter_status: fixture.adapterStatus,
      }),
    ],
  );
}

async function loadFixtureRecords(fixture: FixtureFile): Promise<unknown[]> {
  const payload = await Bun.file(join(process.cwd(), fixture.path)).json();
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['items', 'records', 'messages', 'docs', 'events', 'files', 'meetings']) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  throw new Error(`Fixture ${fixture.path} must be a JSON array or object with an array payload`);
}

function normalizeFixtureRecord(fixture: FixtureFile, raw: unknown, index: number): NormalizedFixtureRecord {
  const record = isRecord(raw) ? raw : {};
  const externalId = firstString(record, ['id', 'externalId', 'messageId', 'docId', 'fileId', 'eventId', 'meetingId', 'approvalId'])
    ?? `${fixture.sourceId}-${index + 1}`;
  const title = firstString(record, ['title', 'summary', 'name', 'subject'])
    ?? `${fixture.sourceId} fixture ${index + 1}`;
  const modifiedTime = firstString(record, ['modifiedTime', 'updatedAt', 'createTime', 'startTime'])
    ?? '2026-05-22T00:00:00.000Z';
  const bodyMarkdown = firstString(record, ['bodyMarkdown', 'markdown', 'text', 'description', 'transcriptMarkdown'])
    ?? `Synthetic ${fixture.sourceId} fixture record.`;
  const entity = normalizeEntity(record.entity);
  const baseFacts = Array.isArray(record.facts)
    ? record.facts.filter(isRecord) as FixtureFact[]
    : [defaultFact(fixture, title, entity, index)];
  const facts = [...baseFacts, ...k2ConflictFacts(fixture, entity, index)];
  return { externalId, title, modifiedTime, bodyMarkdown, entity, facts, raw };
}

function normalizeEntity(value: unknown): FixtureEntity {
  if (!isRecord(value)) {
    return {
      slug: 'companies/acme-example',
      type: 'company',
      title: 'Acme Example',
      aliases: ['Acme Example', 'Acme'],
    };
  }
  const slug = typeof value.slug === 'string' && value.slug.trim() ? value.slug : 'companies/acme-example';
  const type = ['company', 'person', 'deal', 'project'].includes(String(value.type))
    ? value.type as FixtureEntity['type']
    : 'company';
  const title = typeof value.title === 'string' && value.title.trim() ? value.title : titleFromSlug(slug);
  const aliases = Array.isArray(value.aliases)
    ? value.aliases.filter((alias): alias is string => typeof alias === 'string')
    : undefined;
  return { slug, type, title, aliases };
}

function defaultFact(fixture: FixtureFile, title: string, entity: FixtureEntity, index: number): FixtureFact {
  return {
    claim: `${entity.title} fixture ${title} was imported from ${fixture.sourceId}.`,
    kind: index % 3 === 0 ? 'event' : 'fact',
    confidence: 0.9,
    visibility: 'world',
    notability: 'medium',
    validFrom: '2026-05-22',
    source: fixture.sourceId,
  };
}

function k2ConflictFacts(fixture: FixtureFile, entity: FixtureEntity, index: number): FixtureFact[] {
  if (entity.slug !== 'companies/acme-example' || index !== 0) return [];
  if (fixture.appType === 'feishu') {
    return [{
      claim: 'Acme Example K2 fixture reports monthly recurring revenue of 50000 USD from Feishu docs.',
      kind: 'fact',
      confidence: 0.88,
      visibility: 'world',
      notability: 'high',
      validFrom: '2026-05-22',
      source: fixture.sourceId,
      claimMetric: 'mrr',
      claimValue: 50000,
      claimUnit: 'USD',
      claimPeriod: 'monthly',
    }];
  }
  if (fixture.appType === 'crm-custom') {
    return [{
      claim: 'Acme Example K2 fixture reports monthly recurring revenue of 62000 USD from CRM accounts.',
      kind: 'fact',
      confidence: 0.9,
      visibility: 'world',
      notability: 'high',
      validFrom: '2026-05-22',
      source: fixture.sourceId,
      claimMetric: 'mrr',
      claimValue: 62000,
      claimUnit: 'USD',
      claimPeriod: 'monthly',
    }];
  }
  return [];
}

async function importFixtureRecord(fixture: FixtureFile, record: NormalizedFixtureRecord): Promise<string> {
  const slug = `k2-fixtures/${fixture.appType}/${fixture.connector}/${slugSegment(record.externalId)}`;
  const enterpriseRef = `source=${encodeURIComponent(fixture.sourceId)};external=${encodeURIComponent(record.externalId)}`;
  const facts = record.facts.map((fact, index) => toParsedFact(fact, fixture, record, index));
  const content = [
    '---',
    'type: note',
    'tags:',
    '  - ebrain-k2-e2e',
    `app: ${fixture.appType}`,
    `connector: ${fixture.connector}`,
    `enterprise_source_ref: ${enterpriseRef}`,
    '---',
    '',
    `# ${record.title}`,
    '',
    record.bodyMarkdown,
    '',
    '## Fixture Metadata',
    '',
    `- app: ${fixture.appType}`,
    `- connector: ${fixture.connector}`,
    `- source_id: ${fixture.sourceId}`,
    `- external_id: ${record.externalId}`,
    `- fixture_path: ${fixture.path}`,
    `- adapter_status: ${fixture.adapterStatus}`,
    '',
    '## Facts',
    '',
    renderFactsTable(facts),
    '',
  ].join('\n');

  const result = await importFromContent(engine, slug, content, {
    noEmbed: true,
    sourceId: EBRAIN_SOURCE_ID,
    filename: `${record.externalId}.md`,
  });
  expect(result.status, `${fixture.sourceId}/${record.externalId}`).toBe('imported');

  const contentHash = createHash('sha256').update(content).digest('hex');
  await engine.executeRaw(
    `UPDATE pages
        SET enterprise_source_type = $1,
            enterprise_source_ref = $2,
            classification = 'L1',
            provenance = $3::jsonb,
            object_hash = $4,
            last_ingested_at = now(),
            updated_at = now()
      WHERE source_id = $5 AND slug = $6`,
    [
      fixture.appType,
      enterpriseRef,
      JSON.stringify({ fixture_path: fixture.path, connector: fixture.connector, stage: 'K2' }),
      contentHash,
      EBRAIN_SOURCE_ID,
      slug,
    ],
  );
  await engine.executeRaw(
    `INSERT INTO enterprise_ingest_objects (
       ingest_source_id,
       external_id,
       object_type,
       version_ref,
       content_hash,
       page_slug,
       status,
       raw_ref,
       last_seen_at,
       last_ingested_at,
       metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, 'ingested', $7, now(), now(), $8::jsonb)`,
    [
      fixture.sourceId,
      record.externalId,
      fixture.objectType,
      record.modifiedTime,
      contentHash,
      slug,
      JSON.stringify(record.raw),
      JSON.stringify({ fixture_path: fixture.path, app_type: fixture.appType, connector: fixture.connector }),
    ],
  );
  return slug;
}

async function importEntityPage(entity: FixtureEntity): Promise<void> {
  const aliases = entity.aliases ?? [entity.title];
  const content = [
    '---',
    `type: ${entity.type}`,
    'aliases:',
    ...aliases.map((alias) => `  - ${quoteYaml(alias)}`),
    'entity_aliases:',
    ...aliases.map((alias) => `  - ${quoteYaml(alias)}`),
    'tags:',
    '  - ebrain-k2-e2e',
    'compiled_truth: {}',
    '---',
    '',
    `# ${entity.title}`,
    '',
    `Synthetic entity page for K2 fixture alias refresh: ${entity.slug}.`,
    '',
  ].join('\n');
  const result = await importFromContent(engine, entity.slug, content, {
    noEmbed: true,
    sourceId: EBRAIN_SOURCE_ID,
    filename: `${entity.slug.split('/').pop() ?? 'entity'}.md`,
  });
  expect(['imported', 'skipped']).toContain(result.status);
  await engine.executeRaw(
    `UPDATE pages
        SET enterprise_source_type = 'k2-fixture-entity',
            last_ingested_at = now(),
            updated_at = now()
      WHERE source_id = $1 AND slug = $2`,
    [EBRAIN_SOURCE_ID, entity.slug],
  );
}

function toParsedFact(
  fact: FixtureFact,
  fixture: FixtureFile,
  record: NormalizedFixtureRecord,
  index: number,
): ParsedFact {
  const parsed: ParsedFact = {
    rowNum: index + 1,
    claim: fact.claim ?? `${record.entity.title} has fixture coverage in ${fixture.sourceId}.`,
    kind: parseKind(fact.kind),
    confidence: typeof fact.confidence === 'number' ? fact.confidence : 0.9,
    visibility: parseVisibility(fact.visibility),
    notability: parseNotability(fact.notability),
    validFrom: fact.validFrom ?? '2026-05-22',
    validUntil: fact.validUntil,
    source: fact.source ?? fixture.sourceId,
    context: fact.context ?? `fixture_path=${fixture.path}`,
    active: true,
  };
  if (fact.claimMetric) parsed.claimMetric = fact.claimMetric;
  if (typeof fact.claimValue === 'number') parsed.claimValue = fact.claimValue;
  if (fact.claimUnit) parsed.claimUnit = fact.claimUnit;
  if (fact.claimPeriod) parsed.claimPeriod = fact.claimPeriod;
  return parsed;
}

async function runEnterpriseCycleForAllShards(): Promise<{
  parent: EnterpriseCycleParentResult;
  shards: EnterpriseCycleShardResult[];
  totals: {
    changedPages: number;
    factsInserted: number;
    conflictsDetected: number;
    conflictsInserted: number;
  };
}> {
  const fanoutSubmissions: Array<{ data: Record<string, unknown> }> = [];
  (engine as unknown as { submitJob: unknown }).submitJob = async (
    job: { data: Record<string, unknown> },
  ) => {
    fanoutSubmissions.push({ data: job.data });
    return { id: 6000 + fanoutSubmissions.length };
  };

  const parent = await dreamCycleEnterpriseHandler(ctx, {
    id: 5001,
    name: ENTERPRISE_CYCLE_PARENT_JOB,
    data: {},
  } as never) as EnterpriseCycleParentResult;
  expect(fanoutSubmissions.map(entry => entry.data.shardIdx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

  delete (engine as unknown as { submitJob?: unknown }).submitJob;
  const shards: EnterpriseCycleShardResult[] = [];
  for (let shardIdx = 0; shardIdx < SHARD_COUNT; shardIdx += 1) {
    const result = await dreamCycleEnterpriseHandler(ctx, {
      id: 5100 + shardIdx,
      name: ENTERPRISE_CYCLE_SHARD_JOB,
      data: { shardIdx },
    } as never) as EnterpriseCycleShardResult;
    shards.push(result);
  }

  return {
    parent,
    shards,
    totals: {
      changedPages: shards.reduce((sum, result) => sum + result.changedPages, 0),
      factsInserted: shards.reduce((sum, result) => sum + result.factsInserted, 0),
      conflictsDetected: shards.reduce((sum, result) => sum + result.conflictsDetected, 0),
      conflictsInserted: shards.reduce((sum, result) => sum + result.conflictsInserted, 0),
    },
  };
}

async function markCycleCompleted(shards: EnterpriseCycleShardResult[]): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO minion_jobs (name, queue, status, data, result, started_at, finished_at, updated_at)
     VALUES ('ebrain-enterprise-cycle', 'default', 'completed', $1::jsonb, $2::jsonb, now(), now(), now())`,
    [
      JSON.stringify({ stage: 'K2', direct_handler: true }),
      JSON.stringify({ shards: shards.length, failedPhases: shards.reduce((sum, result) => sum + result.failedPhases, 0) }),
    ],
  );
}

function makeIncomingRequest(): IncomingRequest {
  return {
    headers: { 'x-k2-signature': 'mock-ok' },
    rawBody: JSON.stringify({ event: { message: { text: '@brain summarize enterprise risks' } } }),
  };
}

function makeWebhookApp(): EnterpriseApp {
  return {
    appId: 'k2-feishu',
    appType: 'feishu',
    displayName: 'K2 Feishu Mock App',
    enabled: true,
    botEnabled: true,
    pushEnabled: true,
    consecutiveErrors: 0,
    tokenManager: {
      async getToken() { return 'mock-token'; },
      async refresh() { return { accessToken: 'mock-token', expiresAt: new Date(Date.now() + 3600_000) }; },
      async isExpired() { return false; },
    },
    rateLimiter: { async acquire() {}, release() {} },
    webhookHandler: {
      async verify(_req: IncomingRequest) { return true; },
      async decode(_req: IncomingRequest): Promise<ImDecodedEvent> {
        return {
          eventId: 'evt-k2-feishu-1',
          eventType: 'message.created',
          receivedAt: new Date('2026-05-22T01:00:00.000Z'),
          payload: {
            message: {
              senderUserId: 'fs-user-1',
              conversationId: 'fs-channel-k2',
              text: '@brain summarize enterprise risks',
            },
          },
          sender: { userId: 'fs-user-1' },
          channelId: 'fs-channel-k2',
          messageText: '@brain summarize enterprise risks',
        } as ImDecodedEvent;
      },
    },
    botAdapter: makeNoopBotAdapter(),
    subConnectors: [],
  };
}

function makePushApps(): { apps: Map<string, EnterpriseApp>; pushCalls: PushCall[] } {
  const pushCalls: PushCall[] = [];
  const botAdapter: BotAdapter = {
    onMention() {},
    async sendReply() {},
    async pushToUser(userId: string, content: PushContent) {
      pushCalls.push({ userId, subject: content.subject, bodyMarkdown: content.bodyMarkdown });
    },
    async pushToChannel() {
      throw new Error('K2 brief push should use user channel');
    },
  };
  const app: EnterpriseApp = {
    appId: 'k2-dingtalk',
    appType: 'dingtalk',
    displayName: 'K2 DingTalk Mock App',
    enabled: true,
    botEnabled: true,
    pushEnabled: true,
    consecutiveErrors: 0,
    tokenManager: {
      async getToken() { return 'mock-token'; },
      async refresh() { return { accessToken: 'mock-token', expiresAt: new Date(Date.now() + 3600_000) }; },
      async isExpired() { return false; },
    },
    rateLimiter: { async acquire() {}, release() {} },
    webhookHandler: { async verify() { return true; }, async decode() { throw new Error('unused'); } },
    botAdapter,
    subConnectors: [],
  };
  return { apps: new Map([['dingtalk', app]]), pushCalls };
}

function makeNoopBotAdapter(): BotAdapter {
  return {
    onMention() {},
    async sendReply(_channelId: string, _reply: Reply) {},
    async pushToUser() {},
    async pushToChannel() {},
  };
}

function makeRes() {
  const calls: { status: number[]; bodies: unknown[] } = { status: [], bodies: [] };
  const res = {
    status(code: number) {
      calls.status.push(code);
      return res;
    },
    json(body: unknown) {
      calls.bodies.push(body);
      return body;
    },
    send(body: unknown) {
      calls.bodies.push(body);
      return body;
    },
  };
  return { res, calls };
}

async function startAdminServer(): Promise<ServeProc> {
  const port = await freePort();
  const home = mkdtempSync(join(tmpdir(), 'ebrain-k2-admin-'));
  mkdirSync(join(home, '.gbrain'), { recursive: true });
  writeFileSync(
    join(home, '.gbrain', 'config.json'),
    JSON.stringify({ engine: 'postgres', database_url: DATABASE_URL, embedding_dimensions: 1536 }, null, 2) + '\n',
  );

  let stderr = '';
  const proc = Bun.spawn(
    [
      'bun',
      'run',
      `${REPO}/src/cli.ts`,
      'serve',
      '--http',
      '--port',
      String(port),
      '--bind',
      '127.0.0.1',
      '--public-url',
      `http://127.0.0.1:${port}`,
      '--suppress-bootstrap-token',
    ],
    {
      cwd: REPO,
      env: {
        ...process.env,
        HOME: home,
        GBRAIN_HOME: home,
        DATABASE_URL: DATABASE_URL ?? '',
        GBRAIN_DATABASE_URL: DATABASE_URL ?? '',
        GBRAIN_ADMIN_BOOTSTRAP_TOKEN: ADMIN_BOOTSTRAP_TOKEN,
        OPENAI_API_KEY: '',
        ANTHROPIC_API_KEY: '',
      },
      stdout: 'ignore',
      stderr: 'pipe',
    },
  );
  void readStream(proc.stderr, chunk => { stderr += chunk; });

  try {
    await waitForHealth(port, () => stderr);
    const login = await originalFetch(`http://127.0.0.1:${port}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: ADMIN_BOOTSTRAP_TOKEN }),
    });
    expect(login.status).toBe(200);
    const rawCookie = login.headers.get('set-cookie');
    expect(rawCookie).toBeTruthy();
    return { proc, home, port, cookie: rawCookie!.split(';')[0], stderr };
  } catch (err) {
    await stopAdminServer({ proc, home, port, cookie: '', stderr });
    throw err;
  }
}

async function stopAdminServer(s: ServeProc | null): Promise<void> {
  if (!s) return;
  try { s.proc.kill('SIGTERM'); } catch { /* already dead */ }
  await Promise.race([s.proc.exited, sleep(1_000)]);
  try { s.proc.kill('SIGKILL'); } catch { /* already dead */ }
  rmSync(s.home, { recursive: true, force: true });
}

async function adminFetch(s: ServeProc, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Cookie', s.cookie);
  return fetch(`http://127.0.0.1:${s.port}${path}`, { ...init, headers });
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createTcpServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port);
        else reject(new Error('no free port'));
      });
    });
  });
}

async function waitForHealth(port: number, stderr: () => string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await originalFetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1_500) });
      if (res.ok) return;
    } catch {
      // Server is still starting.
    }
    await sleep(250);
  }
  throw new Error(`admin server did not become healthy on ${port}:\n${stderr().slice(-1200)}`);
}

async function readStream(stream: ReadableStream<Uint8Array> | null, onChunk: (chunk: string) => void): Promise<void> {
  if (!stream) return;
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) onChunk(Buffer.from(value).toString('utf8'));
    }
  } catch {
    // The process was killed during teardown.
  }
}

async function waitUntil(predicate: () => boolean, label: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(20);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function countRows(table: string, where?: string): Promise<number> {
  const rows = await engine.executeRaw<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${table}${where ? ` WHERE ${where}` : ''}`,
  );
  return Number(rows[0]?.count ?? 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function slugSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function titleFromSlug(slug: string): string {
  return slug.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'K2 Fixture Entity';
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function parseKind(value: string | undefined): FactKind {
  return value === 'event' || value === 'preference' || value === 'commitment' || value === 'belief' || value === 'fact'
    ? value
    : 'fact';
}

function parseVisibility(value: string | undefined): FactVisibility {
  return value === 'private' || value === 'world' ? value : 'world';
}

function parseNotability(value: string | undefined): FactNotability {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
}
