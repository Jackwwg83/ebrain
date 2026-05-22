import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { PGLiteEngine } from '../../src/core/pglite-engine.ts';
import { LATEST_VERSION } from '../../src/core/migrate.ts';
import { importFromContent } from '../../src/core/import-file.ts';
import { renderFactsTable, type FactKind, type FactNotability, type FactVisibility, type ParsedFact } from '../../src/core/facts-fence.ts';
import { runExtractFacts } from '../../src/core/cycle/extract-facts.ts';
import type { OperationContext } from '../../src/core/operations.ts';
import { EBRAIN_SOURCE_ID } from '../../src/ebrain/constants.ts';
import { refreshEntityAliases } from '../../src/ebrain/cycle/refresh-entity-aliases.ts';
import { SHARD_COUNT } from '../../src/ebrain/cycle/shard.ts';

setDefaultTimeout(90_000);

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

const FIXTURE_FILES: FixtureFile[] = [
  // DingTalk has concrete app/sub-connector adapters from Stage C2.
  { appId: 'dingtalk-k1', appType: 'dingtalk', appName: 'DingTalk K1 Fixtures', connector: 'im', sourceId: 'dingtalk-im', objectType: 'im-message', path: 'src/ebrain/apps/dingtalk/fixtures/im-messages.json', adapterStatus: 'wired-app-adapter' },
  { appId: 'dingtalk-k1', appType: 'dingtalk', appName: 'DingTalk K1 Fixtures', connector: 'docs', sourceId: 'dingtalk-docs', objectType: 'doc', path: 'src/ebrain/apps/dingtalk/fixtures/docs-list.json', adapterStatus: 'wired-app-adapter' },
  { appId: 'dingtalk-k1', appType: 'dingtalk', appName: 'DingTalk K1 Fixtures', connector: 'drive', sourceId: 'dingtalk-drive', objectType: 'drive-file', path: 'src/ebrain/apps/dingtalk/fixtures/drive-files.json', adapterStatus: 'wired-app-adapter' },
  { appId: 'dingtalk-k1', appType: 'dingtalk', appName: 'DingTalk K1 Fixtures', connector: 'calendar', sourceId: 'dingtalk-calendar', objectType: 'calendar-event', path: 'src/ebrain/apps/dingtalk/fixtures/calendar-events.json', adapterStatus: 'wired-app-adapter' },
  { appId: 'dingtalk-k1', appType: 'dingtalk', appName: 'DingTalk K1 Fixtures', connector: 'meeting', sourceId: 'dingtalk-meeting', objectType: 'meeting', path: 'src/ebrain/apps/dingtalk/fixtures/meeting-list.json', adapterStatus: 'wired-app-adapter' },
  { appId: 'dingtalk-k1', appType: 'dingtalk', appName: 'DingTalk K1 Fixtures', connector: 'approval', sourceId: 'dingtalk-approval', objectType: 'approval', path: 'src/ebrain/apps/dingtalk/fixtures/approvals.json', adapterStatus: 'wired-app-adapter' },

  // Feishu has the app shell now; K1 validates full fixture coverage before later adapter wiring.
  { appId: 'feishu-k1', appType: 'feishu', appName: 'Feishu K1 Fixtures', connector: 'docs', sourceId: 'feishu-docs', objectType: 'doc', path: 'src/ebrain/apps/feishu/fixtures/docs-list.json', adapterStatus: 'fixture-db-only' },
  { appId: 'feishu-k1', appType: 'feishu', appName: 'Feishu K1 Fixtures', connector: 'im', sourceId: 'feishu-im', objectType: 'im-message', path: 'src/ebrain/apps/feishu/fixtures/im-messages.json', adapterStatus: 'fixture-db-only' },
  { appId: 'feishu-k1', appType: 'feishu', appName: 'Feishu K1 Fixtures', connector: 'calendar', sourceId: 'feishu-calendar', objectType: 'calendar-event', path: 'src/ebrain/apps/feishu/fixtures/calendar-events.json', adapterStatus: 'fixture-db-only' },
  { appId: 'feishu-k1', appType: 'feishu', appName: 'Feishu K1 Fixtures', connector: 'mail', sourceId: 'feishu-mail', objectType: 'email', path: 'src/ebrain/apps/feishu/fixtures/mail-messages.json', adapterStatus: 'fixture-db-only' },
  { appId: 'feishu-k1', appType: 'feishu', appName: 'Feishu K1 Fixtures', connector: 'wiki', sourceId: 'feishu-wiki', objectType: 'wiki-page', path: 'src/ebrain/apps/feishu/fixtures/wiki-pages.json', adapterStatus: 'fixture-db-only' },
  { appId: 'feishu-k1', appType: 'feishu', appName: 'Feishu K1 Fixtures', connector: 'meeting', sourceId: 'feishu-meeting', objectType: 'meeting', path: 'src/ebrain/apps/feishu/fixtures/meeting-list.json', adapterStatus: 'fixture-db-only' },

  // WeCom/CRM/Tencent Meeting adapters are intentionally partial; K1 covers parse + DB import.
  { appId: 'wecom-k1', appType: 'wecom', appName: 'WeCom K1 Fixtures', connector: 'messages', sourceId: 'wecom-messages', objectType: 'im-message', path: 'src/ebrain/apps/wecom/fixtures/messages.json', adapterStatus: 'fixture-db-only' },
  { appId: 'wecom-k1', appType: 'wecom', appName: 'WeCom K1 Fixtures', connector: 'contacts', sourceId: 'wecom-contacts', objectType: 'contact', path: 'src/ebrain/apps/wecom/fixtures/contacts.json', adapterStatus: 'fixture-db-only' },
  { appId: 'wecom-k1', appType: 'wecom', appName: 'WeCom K1 Fixtures', connector: 'meetings', sourceId: 'wecom-meetings', objectType: 'meeting', path: 'src/ebrain/apps/wecom/fixtures/meetings.json', adapterStatus: 'fixture-db-only' },
  { appId: 'wecom-k1', appType: 'wecom', appName: 'WeCom K1 Fixtures', connector: 'departments', sourceId: 'wecom-departments', objectType: 'department', path: 'src/ebrain/apps/wecom/fixtures/departments.json', adapterStatus: 'fixture-db-only' },
  { appId: 'wecom-k1', appType: 'wecom', appName: 'WeCom K1 Fixtures', connector: 'approvals', sourceId: 'wecom-approvals', objectType: 'approval', path: 'src/ebrain/apps/wecom/fixtures/approvals.json', adapterStatus: 'fixture-db-only' },

  { appId: 'crm-k1', appType: 'crm-custom', appName: 'CRM K1 Fixtures', connector: 'accounts', sourceId: 'crm-accounts', objectType: 'account', path: 'src/ebrain/apps/crm/fixtures/accounts.json', adapterStatus: 'fixture-db-only' },
  { appId: 'crm-k1', appType: 'crm-custom', appName: 'CRM K1 Fixtures', connector: 'contacts', sourceId: 'crm-contacts', objectType: 'contact', path: 'src/ebrain/apps/crm/fixtures/contacts.json', adapterStatus: 'fixture-db-only' },
  { appId: 'crm-k1', appType: 'crm-custom', appName: 'CRM K1 Fixtures', connector: 'opportunities', sourceId: 'crm-opportunities', objectType: 'opportunity', path: 'src/ebrain/apps/crm/fixtures/opportunities.json', adapterStatus: 'fixture-db-only' },
  { appId: 'crm-k1', appType: 'crm-custom', appName: 'CRM K1 Fixtures', connector: 'leads', sourceId: 'crm-leads', objectType: 'lead', path: 'src/ebrain/apps/crm/fixtures/leads.json', adapterStatus: 'fixture-db-only' },
  { appId: 'crm-k1', appType: 'crm-custom', appName: 'CRM K1 Fixtures', connector: 'activities', sourceId: 'crm-activities', objectType: 'activity', path: 'src/ebrain/apps/crm/fixtures/activities.json', adapterStatus: 'fixture-db-only' },

  { appId: 'tencent-meeting-k1', appType: 'tencent-meeting', appName: 'Tencent Meeting K1 Fixtures', connector: 'meetings', sourceId: 'tencent-meeting-meetings', objectType: 'meeting', path: 'src/ebrain/apps/tencent-meeting/fixtures/meetings.json', adapterStatus: 'fixture-db-only' },
  { appId: 'tencent-meeting-k1', appType: 'tencent-meeting', appName: 'Tencent Meeting K1 Fixtures', connector: 'recordings', sourceId: 'tencent-meeting-recordings', objectType: 'meeting-recording', path: 'src/ebrain/apps/tencent-meeting/fixtures/recordings.json', adapterStatus: 'fixture-db-only' },
  { appId: 'tencent-meeting-k1', appType: 'tencent-meeting', appName: 'Tencent Meeting K1 Fixtures', connector: 'participants', sourceId: 'tencent-meeting-participants', objectType: 'meeting-participants', path: 'src/ebrain/apps/tencent-meeting/fixtures/participants.json', adapterStatus: 'fixture-db-only' },
  { appId: 'tencent-meeting-k1', appType: 'tencent-meeting', appName: 'Tencent Meeting K1 Fixtures', connector: 'transcripts', sourceId: 'tencent-meeting-transcripts', objectType: 'meeting-transcript', path: 'src/ebrain/apps/tencent-meeting/fixtures/transcripts.json', adapterStatus: 'fixture-db-only' },
  { appId: 'tencent-meeting-k1', appType: 'tencent-meeting', appName: 'Tencent Meeting K1 Fixtures', connector: 'attendance', sourceId: 'tencent-meeting-attendance', objectType: 'meeting-attendance', path: 'src/ebrain/apps/tencent-meeting/fixtures/attendance.json', adapterStatus: 'fixture-db-only' },
];

let engine: PGLiteEngine;
let ctx: OperationContext;
let originalFetch: typeof fetch;

function makeCtx(engine: PGLiteEngine): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: { info() {}, warn() {}, error() {} },
    dryRun: false,
    remote: false,
    sourceId: EBRAIN_SOURCE_ID,
  } as OperationContext;
}

beforeAll(async () => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    throw new Error(`K1 smoke is fixture-only; attempted network fetch for ${String(input)}`);
  }) as typeof fetch;

  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  ctx = makeCtx(engine);
  await seedEnterpriseSource();
});

afterAll(async () => {
  globalThis.fetch = originalFetch;
  if (engine) await engine.disconnect();
});

describe('Ebrain K1 PGLite fixture smoke', () => {
  test('imports 5 app fixture sets through gbrain import-file path and writes enterprise artifacts', async () => {
    expect(FIXTURE_FILES.length).toBeGreaterThanOrEqual(20);
    expect(Number(await engine.getConfig('version'))).toBe(LATEST_VERSION);
    expect(LATEST_VERSION).toBeGreaterThanOrEqual(200);

    const importedSlugs: string[] = [];
    const entitySlugs = new Map<string, FixtureEntity>();
    let recordsImported = 0;

    for (const fixture of FIXTURE_FILES) {
      await seedEnterpriseApp(fixture);
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
    for (let shardIdx = 0; shardIdx < SHARD_COUNT; shardIdx++) {
      await refreshEntityAliases(ctx, { shardIdx, changedSlugs: [...entitySlugs.keys()] });
    }

    const factsResult = await runExtractFacts(engine, {
      sourceId: EBRAIN_SOURCE_ID,
      slugs: importedSlugs,
    });
    expect(factsResult.guardTriggered).toBe(false);
    expect(factsResult.warnings).toEqual([]);
    expect(factsResult.pagesScanned).toBe(importedSlugs.length);
    expect(factsResult.factsInserted).toBeGreaterThanOrEqual(importedSlugs.length);

    const sourceCount = await countRows('enterprise_ingest_sources');
    const objectCount = await countRows('enterprise_ingest_objects');
    const fixturePageCount = await countRows('pages', `source_id = '${EBRAIN_SOURCE_ID}' AND slug LIKE 'k1-fixtures/%'`);
    const factCount = await countRows('facts', `source_id = '${EBRAIN_SOURCE_ID}'`);
    const aliasCount = await countRows('enterprise_entity_aliases');
    const claimRows = await engine.executeRaw<{ page_slug: string; claim_text: string }>(
      `SELECT page_slug, claim_text
         FROM enterprise_fact_claims_view
        ORDER BY page_slug
        LIMIT 5`,
    );

    expect(sourceCount).toBe(FIXTURE_FILES.length);
    expect(objectCount).toBe(recordsImported);
    expect(fixturePageCount).toBe(recordsImported);
    expect(factCount).toBeGreaterThanOrEqual(recordsImported);
    expect(aliasCount).toBeGreaterThanOrEqual(entitySlugs.size);
    expect(claimRows.length).toBeGreaterThan(0);
    expect(claimRows[0]!.claim_text).toContain('fixture');

    const appCoverage = await engine.executeRaw<{ app_type: string; count: string }>(
      `SELECT app_type, count(*)::text AS count
         FROM enterprise_apps
        GROUP BY app_type
        ORDER BY app_type`,
    );
    expect(appCoverage.map((row) => row.app_type).sort()).toEqual([
      'crm-custom',
      'dingtalk',
      'feishu',
      'tencent-meeting',
      'wecom',
    ]);
  });
});

async function seedEnterpriseSource(): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [EBRAIN_SOURCE_ID, EBRAIN_SOURCE_ID, JSON.stringify({ fixture: 'k1-smoke' })],
  );
}

async function seedEnterpriseApp(fixture: FixtureFile): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_apps (app_id, app_type, display_name, credentials, config, enabled, bot_enabled, push_enabled)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, true, false, false)
     ON CONFLICT (app_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       config = EXCLUDED.config,
       updated_at = now()`,
    [
      fixture.appId,
      fixture.appType,
      fixture.appName,
      JSON.stringify({ synthetic_fixture: true }),
      JSON.stringify({ stage: 'K1', network: 'disabled' }),
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
     ) VALUES ($1, $2, $3, $4, $5::jsonb, now())
     ON CONFLICT (ingest_source_id) DO UPDATE SET
       parent_app_id = EXCLUDED.parent_app_id,
       display_name = EXCLUDED.display_name,
       connector_config = EXCLUDED.connector_config,
       last_success_at = now(),
       updated_at = now()`,
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
  const path = join(process.cwd(), fixture.path);
  const payload = await Bun.file(path).json();
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
  const facts = Array.isArray(record.facts)
    ? record.facts.filter(isRecord) as FixtureFact[]
    : [defaultFact(fixture, title, entity, index)];
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
  const aliases = Array.isArray(value.aliases) ? value.aliases.filter((alias): alias is string => typeof alias === 'string') : undefined;
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

async function importFixtureRecord(fixture: FixtureFile, record: NormalizedFixtureRecord): Promise<string> {
  const slug = `k1-fixtures/${fixture.appType}/${fixture.connector}/${slugSegment(record.externalId)}`;
  const enterpriseRef = `source=${encodeURIComponent(fixture.sourceId)};external=${encodeURIComponent(record.externalId)}`;
  const facts = record.facts.map((fact, index) => toParsedFact(fact, fixture, record, index));
  const content = [
    '---',
    'type: note',
    'tags:',
    '  - ebrain-k1-smoke',
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
      JSON.stringify({ fixture_path: fixture.path, connector: fixture.connector }),
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
     ) VALUES ($1, $2, $3, $4, $5, $6, 'ingested', $7, now(), now(), $8::jsonb)
     ON CONFLICT (ingest_source_id, external_id) DO UPDATE SET
       object_type = EXCLUDED.object_type,
       version_ref = EXCLUDED.version_ref,
       content_hash = EXCLUDED.content_hash,
       page_slug = EXCLUDED.page_slug,
       status = 'ingested',
       raw_ref = EXCLUDED.raw_ref,
       last_seen_at = now(),
       last_ingested_at = now(),
       metadata = EXCLUDED.metadata`,
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
    '  - ebrain-k1-smoke',
    '---',
    '',
    `# ${entity.title}`,
    '',
    `Synthetic entity page for K1 fixture alias refresh: ${entity.slug}.`,
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
        SET enterprise_source_type = 'k1-fixture-entity',
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
  return slug.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'K1 Fixture Entity';
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
