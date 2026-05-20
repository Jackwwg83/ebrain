import { afterEach, beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import type { EnterpriseIngestObject } from '../../../src/ebrain/apps/base/index.ts';
import {
  stableHash,
  toEnterpriseSourceRef,
  toEnterpriseSlug,
  upsertEnterpriseObject,
} from '../../../src/ebrain/sources/ingest-common.ts';

let engine: PGLiteEngine;
let ctx: OperationContext;

setDefaultTimeout(20_000);

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function makeCtx(engine: PGLiteEngine): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote: false,
    sourceId: 'default',
  } as OperationContext;
}

async function seedIngestSource(id = 'feishu-im', type = 'feishu'): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_ingest_sources (ingest_source_id, ingest_source_type, display_name)
     VALUES ($1, $2, $3)`,
    [id, type, `${type} source`],
  );
}

function ingestObject(overrides: Partial<EnterpriseIngestObject> = {}): EnterpriseIngestObject {
  return {
    sourceId: 'feishu-im',
    sourceType: 'feishu',
    externalId: 'msg-123',
    objectType: 'im-message',
    title: 'Message 123',
    bodyMarkdown: 'Hello from enterprise ingest.',
    modifiedAt: '2026-05-20T00:00:00.000Z',
    url: 'https://example.test/messages/msg-123',
    participants: ['user-a', 'user-b'],
    ownerOrgUnit: 'finance',
    classification: 'L1',
    raw: { id: 'msg-123', text: 'Hello from enterprise ingest.' },
    metadata: { channel: 'general' },
    ...overrides,
  };
}

beforeEach(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  ctx = makeCtx(engine);
  await seedIngestSource();
});

afterEach(async () => {
  await engine.disconnect();
});

describe('upsertEnterpriseObject', () => {
  test('stableHash returns deterministic sha256 hex', () => {
    const first = stableHash('same payload');
    const second = stableHash('same payload');
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  test('toEnterpriseSlug is deterministic for source type, source id, and external id', () => {
    const expected = `feishu/feishu-im-${stableHash('feishu-im').slice(0, 16)}/msg-123-${stableHash('msg-123').slice(0, 16)}`;
    expect(toEnterpriseSlug('feishu', 'feishu-im', 'msg-123')).toBe(expected);
    const lossy = toEnterpriseSlug('Feishu', 'feishu-im', 'Msg 123');
    expect(lossy).toStartWith(`feishu/feishu-im-${stableHash('feishu-im').slice(0, 16)}/msg-123-`);
    expect(lossy).toMatch(/^feishu\/feishu-im-[a-f0-9]{16}\/msg-123-[a-f0-9]{16}$/);
  });

  test('toEnterpriseSlug keeps lossy source id and external id normalization collision-resistant', () => {
    const sourceWithSlash = toEnterpriseSlug('feishu', 'team/a', 'msg-123');
    const sourceWithColon = toEnterpriseSlug('feishu', 'team:a', 'msg-123');
    const withSlash = toEnterpriseSlug('feishu', 'feishu-im', 'msg/123');
    const withColon = toEnterpriseSlug('feishu', 'feishu-im', 'msg:123');
    const withSpace = toEnterpriseSlug('feishu', 'feishu-im', 'msg 123');
    const withSafeMimic = toEnterpriseSlug(
      'feishu',
      'feishu-im',
      `msg-123-${stableHash('msg/123').slice(0, 16)}`,
    );

    expect(sourceWithSlash).not.toBe(sourceWithColon);
    expect(sourceWithSlash).toStartWith('feishu/team-a-');
    expect(sourceWithColon).toStartWith('feishu/team-a-');
    expect(new Set([withSlash, withColon, withSpace, withSafeMimic]).size).toBe(4);
    expect(withSlash).toStartWith(`feishu/feishu-im-${stableHash('feishu-im').slice(0, 16)}/msg-123-`);
    expect(withColon).toStartWith(`feishu/feishu-im-${stableHash('feishu-im').slice(0, 16)}/msg-123-`);
    expect(withSpace).toStartWith(`feishu/feishu-im-${stableHash('feishu-im').slice(0, 16)}/msg-123-`);
  });

  test('toEnterpriseSourceRef preserves source and external id boundaries', async () => {
    expect(toEnterpriseSourceRef('a:b', 'c')).toBe('source=a%3Ab;external=c');
    expect(toEnterpriseSourceRef('a', 'b:c')).toBe('source=a;external=b%3Ac');
    expect(toEnterpriseSourceRef('a:b', 'c')).not.toBe(toEnterpriseSourceRef('a', 'b:c'));

    await seedIngestSource('a:b', 'feishu');
    await seedIngestSource('a', 'feishu');
    const first = await upsertEnterpriseObject(ctx, ingestObject({
      sourceId: 'a:b',
      externalId: 'c',
      title: 'Boundary first',
    }));
    const second = await upsertEnterpriseObject(ctx, ingestObject({
      sourceId: 'a',
      externalId: 'b:c',
      title: 'Boundary second',
    }));
    const rows = await engine.executeRaw<{ enterprise_source_ref: string }>(
      `SELECT enterprise_source_ref
       FROM pages
       WHERE source_id = 'enterprise'
         AND slug IN ($1, $2)
       ORDER BY enterprise_source_ref`,
      [first.slug, second.slug],
    );

    expect(rows.map((row) => row.enterprise_source_ref)).toEqual([
      'source=a%3Ab;external=c',
      'source=a;external=b%3Ac',
    ]);
  });

  test('first upsert returns changed true and writes an ingested object row', async () => {
    const result = await upsertEnterpriseObject(ctx, ingestObject());
    expect(result).toEqual({ changed: true, slug: toEnterpriseSlug('feishu', 'feishu-im', 'msg-123') });

    const rows = await engine.executeRaw<{ status: string; page_slug: string; content_hash: string }>(
      `SELECT status, page_slug, content_hash FROM enterprise_ingest_objects
       WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('ingested');
    expect(rows[0].page_slug).toBe(result.slug);
    expect(rows[0].content_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('first upsert creates enterprise page metadata and chunks', async () => {
    await upsertEnterpriseObject(ctx, ingestObject());

    const pageRows = await engine.executeRaw<{
      source_id: string;
      enterprise_source_type: string;
      enterprise_source_ref: string;
      object_hash: string;
      last_ingested_at: string;
    }>(
      `SELECT source_id, enterprise_source_type, enterprise_source_ref, object_hash, last_ingested_at
       FROM pages WHERE source_id = 'enterprise' AND slug = $1`,
      [toEnterpriseSlug('feishu', 'feishu-im', 'msg-123')],
    );
    expect(pageRows).toHaveLength(1);
    expect(pageRows[0].enterprise_source_type).toBe('feishu');
    expect(pageRows[0].enterprise_source_ref).toBe('source=feishu-im;external=msg-123');
    expect(pageRows[0].object_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(pageRows[0].last_ingested_at).toBeDefined();

    const chunkRows = await engine.executeRaw<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM content_chunks cc
       JOIN pages p ON p.id = cc.page_id
       WHERE p.source_id = 'enterprise' AND p.slug = $1`,
      [toEnterpriseSlug('feishu', 'feishu-im', 'msg-123')],
    );
    expect(chunkRows[0].count).toBeGreaterThan(0);
  });

  test('second identical upsert returns changed false and keeps one object row', async () => {
    await upsertEnterpriseObject(ctx, ingestObject());
    const second = await upsertEnterpriseObject(ctx, ingestObject());

    const rows = await engine.executeRaw<{ count: number; status: string }>(
      `SELECT count(*)::int AS count, max(status) AS status
       FROM enterprise_ingest_objects
       WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );
    expect(second.changed).toBe(false);
    expect(rows[0].count).toBe(1);
    expect(rows[0].status).toBe('ingested');
  });

  test('identical content still refreshes page governance metadata', async () => {
    await upsertEnterpriseObject(ctx, ingestObject());

    const second = await upsertEnterpriseObject(ctx, ingestObject({
      url: 'https://example.test/messages/msg-123-updated',
      participants: ['user-c'],
      ownerOrgUnit: 'legal',
      classification: 'L3',
      metadata: { channel: 'board' },
    }));
    const rows = await engine.executeRaw<{
      owner_org_unit: string | null;
      classification: string | null;
      provenance: Record<string, unknown>;
      frontmatter: Record<string, unknown>;
    }>(
      `SELECT owner_org_unit, classification, provenance, frontmatter
       FROM pages WHERE source_id = 'enterprise' AND slug = $1`,
      [toEnterpriseSlug('feishu', 'feishu-im', 'msg-123')],
    );

    expect(second.changed).toBe(false);
    expect(rows[0].owner_org_unit).toBe('legal');
    expect(rows[0].classification).toBe('L3');
    expect(rows[0].provenance).toMatchObject({
      participants: ['user-c'],
      metadata: { channel: 'board' },
      url: 'https://example.test/messages/msg-123-updated',
    });
    expect(rows[0].frontmatter).toMatchObject({
      owner_org_unit: 'legal',
      classification: 'L3',
      participants: ['user-c'],
      metadata: { channel: 'board' },
      url: 'https://example.test/messages/msg-123-updated',
    });
  });

  test('existing seen row with same hash still writes page and advances to ingested', async () => {
    const obj = ingestObject();
    const hash = stableHash(JSON.stringify({
      title: obj.title,
      bodyMarkdown: obj.bodyMarkdown,
      modifiedAt: obj.modifiedAt,
      raw: obj.raw,
    }));
    await engine.executeRaw(
      `INSERT INTO enterprise_ingest_objects (
         ingest_source_id, external_id, object_type, content_hash, status
       ) VALUES ($1, $2, $3, $4, 'seen')`,
      [obj.sourceId, obj.externalId, obj.objectType, hash],
    );

    const result = await upsertEnterpriseObject(ctx, obj);
    const rows = await engine.executeRaw<{ status: string; page_slug: string | null }>(
      `SELECT status, page_slug FROM enterprise_ingest_objects WHERE ingest_source_id = $1 AND external_id = $2`,
      [obj.sourceId, obj.externalId],
    );

    expect(result.changed).toBe(true);
    expect(rows[0].status).toBe('ingested');
    expect(rows[0].page_slug).toBe(toEnterpriseSlug('feishu', 'feishu-im', 'msg-123'));
  });

  test('100 identical upserts keep enterprise_ingest_objects idempotent at one row', async () => {
    const obj = ingestObject();
    for (let i = 0; i < 100; i += 1) {
      await upsertEnterpriseObject(ctx, obj);
    }

    const rows = await engine.executeRaw<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM enterprise_ingest_objects
       WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );
    expect(rows[0].count).toBe(1);
  });

  test('bodyMarkdown changes return changed true and replace content_hash', async () => {
    await upsertEnterpriseObject(ctx, ingestObject());
    const before = await engine.executeRaw<{ content_hash: string }>(
      `SELECT content_hash FROM enterprise_ingest_objects WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );

    const second = await upsertEnterpriseObject(ctx, ingestObject({ bodyMarkdown: 'Edited enterprise body.' }));
    const after = await engine.executeRaw<{ content_hash: string }>(
      `SELECT content_hash FROM enterprise_ingest_objects WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );

    expect(second.changed).toBe(true);
    expect(after[0].content_hash).not.toBe(before[0].content_hash);
  });

  test('modifiedAt participates in content_hash', async () => {
    await upsertEnterpriseObject(ctx, ingestObject());
    const before = await engine.executeRaw<{ content_hash: string }>(
      `SELECT content_hash FROM enterprise_ingest_objects WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );

    const second = await upsertEnterpriseObject(ctx, ingestObject({ modifiedAt: '2026-05-20T01:00:00.000Z' }));
    const after = await engine.executeRaw<{ content_hash: string }>(
      `SELECT content_hash FROM enterprise_ingest_objects WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );

    expect(second.changed).toBe(true);
    expect(after[0].content_hash).not.toBe(before[0].content_hash);
  });

  test('raw payload participates in content_hash and stores inline raw_ref under the v1 limit', async () => {
    await upsertEnterpriseObject(ctx, ingestObject());
    const before = await engine.executeRaw<{ content_hash: string }>(
      `SELECT content_hash FROM enterprise_ingest_objects WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );

    const second = await upsertEnterpriseObject(ctx, ingestObject({ raw: { id: 'msg-123', text: 'changed raw' } }));
    const after = await engine.executeRaw<{ content_hash: string; raw_ref: string }>(
      `SELECT content_hash, raw_ref FROM enterprise_ingest_objects WHERE ingest_source_id = $1 AND external_id = $2`,
      ['feishu-im', 'msg-123'],
    );

    expect(second.changed).toBe(true);
    expect(after[0].content_hash).not.toBe(before[0].content_hash);
    expect(JSON.parse(after[0].raw_ref)).toEqual({ id: 'msg-123', text: 'changed raw' });
  });

  test('empty body deletes stale chunks on a changed upsert', async () => {
    await upsertEnterpriseObject(ctx, ingestObject());
    await upsertEnterpriseObject(ctx, ingestObject({ bodyMarkdown: '' }));

    const rows = await engine.executeRaw<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM content_chunks cc
       JOIN pages p ON p.id = cc.page_id
       WHERE p.source_id = 'enterprise' AND p.slug = $1`,
      [toEnterpriseSlug('feishu', 'feishu-im', 'msg-123')],
    );
    expect(rows[0].count).toBe(0);
  });

  test('successful upsert resets source circuit state', async () => {
    await engine.executeRaw(
      `UPDATE enterprise_ingest_sources
       SET consecutive_errors = 4,
           circuit_open_until = now() + INTERVAL '30 minutes',
           last_error = 'previous failure'
       WHERE ingest_source_id = $1`,
      ['feishu-im'],
    );

    await upsertEnterpriseObject(ctx, ingestObject());
    const rows = await engine.executeRaw<{
      consecutive_errors: number;
      circuit_open_until: string | null;
      last_success_at: string | null;
    }>(
      `SELECT consecutive_errors, circuit_open_until, last_success_at
       FROM enterprise_ingest_sources WHERE ingest_source_id = $1`,
      ['feishu-im'],
    );

    expect(rows[0].consecutive_errors).toBe(0);
    expect(rows[0].circuit_open_until).toBeNull();
    expect(rows[0].last_success_at).toBeDefined();
  });

  test('multiple external ids under one ingest source create distinct rows and slugs', async () => {
    await upsertEnterpriseObject(ctx, ingestObject({ externalId: 'msg-123' }));
    await upsertEnterpriseObject(ctx, ingestObject({ externalId: 'msg-456' }));

    const rows = await engine.executeRaw<{ count: number }>(
      `SELECT count(*)::int AS count FROM enterprise_ingest_objects WHERE ingest_source_id = $1`,
      ['feishu-im'],
    );
    expect(rows[0].count).toBe(2);
    expect(toEnterpriseSlug('feishu', 'feishu-im', 'msg-456')).not.toBe(toEnterpriseSlug('feishu', 'feishu-im', 'msg-123'));
  });
});
