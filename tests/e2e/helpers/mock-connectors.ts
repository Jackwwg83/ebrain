import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OperationContext } from '../../../src/core/operations.ts';
import type { ParsedFact } from '../../../src/core/facts-fence.ts';
import type {
  EnterpriseApp,
  EnterpriseAppType,
  EnterpriseConnector,
  EnterpriseIngestObject,
  EnterpriseIngestResult,
  EnterpriseObjectType,
  EnterpriseSourceType,
} from '../../../src/ebrain/apps/base/index.ts';
import { upsertEnterpriseObject } from '../../../src/ebrain/sources/ingest-common.ts';
import { checkCircuit, markIngestError, resetCircuit } from '../../../src/ebrain/sources/circuit-breaker.ts';
import { emitFactFence } from '../../../src/ebrain/sources/transformers/fact-fence-emitter.ts';

export interface MockConnectorFixture {
  appId: string;
  appType: EnterpriseAppType;
  sourceType: EnterpriseSourceType;
  appName: string;
  connector: string;
  sourceId: string;
  objectType: EnterpriseObjectType;
  path: string;
  adapterStatus: 'wired-app-adapter' | 'fixture-db-only' | 'mock-connector-adapter';
}

export interface FixtureEntity {
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
  raw: Record<string, unknown>;
}

export interface MockEnterpriseConnector extends EnterpriseConnector {
  readonly fixture: MockConnectorFixture;
  entities(): FixtureEntity[];
}

abstract class BaseMockConnector implements MockEnterpriseConnector {
  abstract readonly name: string;
  readonly app: EnterpriseApp;
  readonly fixture: MockConnectorFixture;
  private readonly seenEntities = new Map<string, FixtureEntity>();

  constructor(app: EnterpriseApp, fixture: MockConnectorFixture) {
    this.app = app;
    this.fixture = fixture;
  }

  async runIncremental(ctx: OperationContext): Promise<EnterpriseIngestResult> {
    await this.ensureIngestSource(ctx);
    const records = await loadFixtureRecords(this.fixture.path);
    const cursorAdvanced = cursorForRecords(records);

    if (await checkCircuit(ctx, this.fixture.sourceId)) {
      return { objectsIngested: 0, objectsSkipped: records.length, errors: 0, cursorAdvanced };
    }

    const rateKeys = [
      { tier: 'app' as const, key: `${this.app.appId}:${this.name}`, limit: 100 },
      { tier: 'tenant' as const, key: `k2:${this.fixture.sourceId}`, limit: 100 },
    ];
    await this.app.rateLimiter.acquire(rateKeys);
    await this.app.tokenManager.getToken('tenant_access', 'tenant:k2');

    let objectsIngested = 0;
    let objectsSkipped = 0;
    let errors = 0;
    this.seenEntities.clear();

    try {
      for (const [index, raw] of records.entries()) {
        try {
          const normalized = normalizeFixtureRecord(this.fixture, raw, index);
          this.seenEntities.set(normalized.entity.slug, normalized.entity);
          const result = await upsertEnterpriseObject(ctx, this.toObject(normalized));
          if (result.changed) objectsIngested += 1;
          else objectsSkipped += 1;
        } catch (error) {
          errors += 1;
          await markIngestError(ctx, {
            ingestSourceId: this.fixture.sourceId,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    } finally {
      this.app.rateLimiter.release(rateKeys.map(({ tier, key }) => ({ tier, key })));
    }

    if (errors === 0) {
      await resetCircuit(ctx, this.fixture.sourceId);
      await this.updateCursor(ctx, cursorAdvanced, records.length);
    }

    return { objectsIngested, objectsSkipped, errors, cursorAdvanced };
  }

  async runBackfill(ctx: OperationContext, _opts: { since?: string }): Promise<EnterpriseIngestResult> {
    return this.runIncremental(ctx);
  }

  async transform(raw: unknown): Promise<EnterpriseIngestObject> {
    return this.toObject(normalizeFixtureRecord(this.fixture, raw, 0));
  }

  entities(): FixtureEntity[] {
    return [...this.seenEntities.values()];
  }

  private toObject(record: NormalizedFixtureRecord): EnterpriseIngestObject {
    const rawUrl = firstString(record.raw, ['url', 'webUrl', 'link']);
    const participants = [
      firstString(record.raw, ['owner_id', 'ownerUserId', 'senderUserId', 'hostUserId']),
      ...stringArray(record.raw.participants),
    ].filter((value): value is string => Boolean(value));
    return {
      sourceId: this.fixture.sourceId,
      sourceType: this.fixture.sourceType,
      externalId: record.externalId,
      objectType: this.fixture.objectType,
      title: record.title,
      bodyMarkdown: bodyMarkdownFor(this.fixture, record),
      modifiedAt: record.modifiedTime,
      url: rawUrl,
      participants: unique(participants),
      ownerOrgUnit: firstString(record.raw, ['department', 'ownerOrgUnit', 'orgUnit']),
      classification: 'L1',
      raw: record.raw,
      metadata: {
        stage: 'K2',
        fixture_path: this.fixture.path,
        connector: this.fixture.connector,
        adapter_status: this.fixture.adapterStatus,
        entity_slug: record.entity.slug,
        vendor_raw_keys: Object.keys(record.raw).sort(),
      },
    };
  }

  private async ensureIngestSource(ctx: OperationContext): Promise<void> {
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
         connector_config = EXCLUDED.connector_config,
         updated_at = now()`,
      [
        this.fixture.sourceId,
        this.fixture.appId,
        this.fixture.sourceType,
        `${this.fixture.appName} ${this.fixture.connector}`,
        JSON.stringify({
          connector: this.fixture.connector,
          fixture_path: this.fixture.path,
          adapter_status: this.fixture.adapterStatus,
          mock_connector: true,
        }),
      ],
    );
  }

  private async updateCursor(ctx: OperationContext, cursorAdvanced: string | undefined, recordCount: number): Promise<void> {
    await ctx.engine.executeRaw(
      `UPDATE enterprise_ingest_sources
          SET cursor_state = $2::jsonb,
              updated_at = now()
        WHERE ingest_source_id = $1`,
      [
        this.fixture.sourceId,
        JSON.stringify({
          last_seen_at: cursorAdvanced ?? null,
          fixture_path: this.fixture.path,
          connector: this.fixture.connector,
          records_seen: recordCount,
        }),
      ],
    );
  }
}

export class MockFeishuConnector extends BaseMockConnector {
  readonly name = 'feishu-docs';
}

export class MockDingtalkConnector extends BaseMockConnector {
  readonly name = 'dingtalk-im';
}

export class MockWecomConnector extends BaseMockConnector {
  readonly name = 'wecom-messages';
}

export class MockCrmConnector extends BaseMockConnector {
  readonly name = 'crm-accounts';
}

export class MockTencentMeetingConnector extends BaseMockConnector {
  readonly name = 'tencent-meeting-transcripts';
}

export function createMockConnectors(
  apps: Map<string, EnterpriseApp>,
  fixtures: readonly MockConnectorFixture[],
): MockEnterpriseConnector[] {
  return fixtures.map((fixture) => {
    const app = apps.get(fixture.appId);
    if (!app) throw new Error(`Missing mock EnterpriseApp for ${fixture.appId}`);
    switch (fixture.sourceType) {
      case 'feishu':
        return new MockFeishuConnector(app, fixture);
      case 'dingtalk':
        return new MockDingtalkConnector(app, fixture);
      case 'wecom':
        return new MockWecomConnector(app, fixture);
      case 'tencent-meeting':
        return new MockTencentMeetingConnector(app, fixture);
      case 'crm-shenxiao':
      case 'crm-fenxiang':
        return new MockCrmConnector(app, fixture);
      default:
        throw new Error(`Unsupported K2 mock connector source type: ${fixture.sourceType}`);
    }
  });
}

async function loadFixtureRecords(fixturePath: string): Promise<Record<string, unknown>[]> {
  const payload = JSON.parse(await readFile(join(process.cwd(), fixturePath), 'utf8')) as unknown;
  const records = Array.isArray(payload) ? payload : arrayPayload(payload);
  return records.map((record, index) => {
    if (!isRecord(record)) throw new Error(`Fixture ${fixturePath} record ${index} must be an object`);
    return record;
  });
}

function arrayPayload(payload: unknown): unknown[] {
  if (isRecord(payload)) {
    for (const key of ['items', 'records', 'messages', 'docs', 'events', 'files', 'meetings']) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  throw new Error('Fixture must be a JSON array or object with an array payload');
}

function normalizeFixtureRecord(
  fixture: MockConnectorFixture,
  raw: Record<string, unknown>,
  index: number,
): NormalizedFixtureRecord {
  const externalId = firstString(raw, ['docToken', 'id', 'externalId', 'messageId', 'docId', 'fileId', 'eventId', 'meetingId', 'approvalId'])
    ?? `${fixture.sourceId}-${index + 1}`;
  const title = firstString(raw, ['title', 'summary', 'name', 'subject', 'conversationTitle'])
    ?? `${fixture.sourceId} fixture ${index + 1}`;
  const modifiedTime = firstString(raw, ['last_modified', 'modifiedTime', 'updatedAt', 'createTime', 'startTime'])
    ?? '2026-05-22T00:00:00.000Z';
  const bodyMarkdown = firstString(raw, ['content', 'bodyMarkdown', 'markdown', 'text', 'description', 'transcriptMarkdown'])
    ?? `Synthetic ${fixture.sourceId} fixture record.`;
  const entity = normalizeEntity(raw.entity);
  const baseFacts = Array.isArray(raw.facts)
    ? raw.facts.filter(isRecord) as FixtureFact[]
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

function defaultFact(
  fixture: MockConnectorFixture,
  title: string,
  entity: FixtureEntity,
  index: number,
): FixtureFact {
  return {
    claim: `${entity.title} fixture ${title} was transformed by ${fixture.sourceId}.`,
    kind: index % 3 === 0 ? 'event' : 'fact',
    confidence: 0.9,
    visibility: 'world',
    notability: 'medium',
    validFrom: '2026-05-22',
    source: fixture.sourceId,
  };
}

function k2ConflictFacts(fixture: MockConnectorFixture, entity: FixtureEntity, index: number): FixtureFact[] {
  if (entity.slug !== 'companies/acme-example' || index !== 0) return [];
  if (fixture.sourceType === 'feishu') {
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
  if (fixture.sourceType === 'crm-shenxiao' || fixture.sourceType === 'crm-fenxiang') {
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

function bodyMarkdownFor(fixture: MockConnectorFixture, record: NormalizedFixtureRecord): string {
  const facts = record.facts.map((fact, index) => toParsedFact(fact, fixture, record, index));
  return [
    `# ${record.title}`,
    '',
    record.bodyMarkdown,
    '',
    '## Fixture Metadata',
    '',
    `- app: ${fixture.sourceType}`,
    `- connector: ${fixture.connector}`,
    `- source_id: ${fixture.sourceId}`,
    `- external_id: ${record.externalId}`,
    `- fixture_path: ${fixture.path}`,
    `- adapter_status: ${fixture.adapterStatus}`,
    '- transform_path: mock-enterprise-connector',
    '',
    '## Facts',
    '',
    emitFactFence(facts),
    '',
  ].join('\n');
}

function toParsedFact(
  fact: FixtureFact,
  fixture: MockConnectorFixture,
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

function cursorForRecords(records: Record<string, unknown>[]): string | undefined {
  const latest = records
    .map((record) => firstString(record, ['last_modified', 'modifiedTime', 'updatedAt', 'createTime', 'startTime']))
    .filter((value): value is string => typeof value === 'string')
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return latest === undefined ? undefined : new Date(latest).toISOString();
}

function parseKind(value: string | undefined): ParsedFact['kind'] {
  return value === 'event' || value === 'preference' || value === 'commitment' || value === 'belief' || value === 'fact'
    ? value
    : 'fact';
}

function parseVisibility(value: string | undefined): ParsedFact['visibility'] {
  return value === 'private' || value === 'world' ? value : 'world';
}

function parseNotability(value: string | undefined): ParsedFact['notability'] {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
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

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function titleFromSlug(slug: string): string {
  return slug.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'K2 Fixture Entity';
}
