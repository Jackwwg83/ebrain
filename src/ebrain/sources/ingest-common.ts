import crypto from 'node:crypto';
import type { OperationContext } from '../../core/operations.ts';
import type { ChunkInput, PageType } from '../../core/types.ts';
import { chunkText } from '../../core/chunkers/recursive.ts';
import type { EnterpriseIngestObject } from '../apps/base/index.ts';
import { EBRAIN_SOURCE_ID } from '../constants.ts';
import { resetCircuit } from './circuit-breaker.ts';

const RAW_INLINE_LIMIT_BYTES = 100_000;

export function stableHash(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function slugSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return normalized || stableHash(value).slice(0, 12);
}

function collisionResistantSlugSegment(value: string): string {
  const slug = slugSegment(value);
  return `${slug}-${stableHash(value).slice(0, 16)}`;
}

export function toEnterpriseSlug(sourceType: string, sourceId: string, externalId: string): string {
  return [
    slugSegment(sourceType),
    collisionResistantSlugSegment(sourceId),
    collisionResistantSlugSegment(externalId),
  ].join('/');
}

export function toEnterpriseSourceRef(sourceId: string, externalId: string): string {
  return `source=${encodeURIComponent(sourceId)};external=${encodeURIComponent(externalId)}`;
}

function contentHashForObject(obj: EnterpriseIngestObject): string {
  return stableHash(JSON.stringify({
    title: obj.title,
    bodyMarkdown: obj.bodyMarkdown,
    modifiedAt: obj.modifiedAt ?? null,
    raw: obj.raw ?? null,
  }));
}

function rawRefForObject(raw: unknown): string | null {
  if (raw === undefined) return null;
  const encoded = JSON.stringify(raw);
  if (encoded === undefined) return null;
  if (Buffer.byteLength(encoded, 'utf8') > RAW_INLINE_LIMIT_BYTES) return null;
  return encoded;
}

function pageTypeForObject(objectType: EnterpriseIngestObject['objectType']): PageType {
  switch (objectType) {
    case 'meeting':
    case 'meeting-transcript':
      return 'meeting';
    case 'calendar-event':
      return 'calendar-event';
    case 'email':
      return 'email';
    default:
      return 'note';
  }
}

function chunksForBody(bodyMarkdown: string): ChunkInput[] {
  const body = bodyMarkdown.trim();
  if (!body) return [];
  return chunkText(body).map((chunk, index) => ({
    chunk_index: index,
    chunk_text: chunk.text,
    chunk_source: 'compiled_truth',
    token_count: Math.ceil(chunk.text.length / 4),
  }));
}

function provenanceForObject(obj: EnterpriseIngestObject): Record<string, unknown> {
  return {
    ingest_source_id: obj.sourceId,
    external_id: obj.externalId,
    object_type: obj.objectType,
    source_type: obj.sourceType,
    url: obj.url ?? null,
    participants: obj.participants ?? [],
    metadata: obj.metadata ?? {},
  };
}

function frontmatterForObject(obj: EnterpriseIngestObject, enterpriseRef: string): Record<string, unknown> {
  return {
    enterprise_source_type: obj.sourceType,
    enterprise_source_ref: enterpriseRef,
    external_id: obj.externalId,
    object_type: obj.objectType,
    url: obj.url ?? undefined,
    participants: obj.participants ?? undefined,
    owner_org_unit: obj.ownerOrgUnit ?? undefined,
    classification: obj.classification ?? 'L1',
    metadata: obj.metadata ?? undefined,
  };
}

async function ensureEnterprisePageSource(ctx: OperationContext): Promise<void> {
  await ctx.engine.executeRaw(
    `INSERT INTO sources (id, name, config)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [EBRAIN_SOURCE_ID, EBRAIN_SOURCE_ID, JSON.stringify({ federated: true })],
  );
}

async function updateEnterprisePageMetadata(
  ctx: OperationContext,
  args: {
    obj: EnterpriseIngestObject;
    slug: string;
    enterpriseRef: string;
    contentHash: string;
    provenance: Record<string, unknown>;
    frontmatter: Record<string, unknown>;
  },
): Promise<boolean> {
  const rows = await ctx.engine.executeRaw<{ slug: string }>(
    `UPDATE pages
     SET enterprise_source_type = $1,
         enterprise_source_ref = $2,
         owner_org_unit = $3,
         classification = $4,
         provenance = $5::jsonb,
         object_hash = $6,
         last_ingested_at = now(),
         frontmatter = $7::jsonb,
         updated_at = now()
     WHERE source_id = $8 AND slug = $9 AND deleted_at IS NULL
     RETURNING slug`,
    [
      args.obj.sourceType,
      args.enterpriseRef,
      args.obj.ownerOrgUnit ?? null,
      args.obj.classification ?? 'L1',
      JSON.stringify(args.provenance),
      args.contentHash,
      JSON.stringify(args.frontmatter),
      EBRAIN_SOURCE_ID,
      args.slug,
    ],
  );
  return rows.length > 0;
}

export async function upsertEnterpriseObject(
  ctx: OperationContext,
  obj: EnterpriseIngestObject,
): Promise<{ changed: boolean; slug: string }> {
  const slug = toEnterpriseSlug(obj.sourceType, obj.sourceId, obj.externalId);
  const contentHash = contentHashForObject(obj);
  const versionRef = obj.modifiedAt ?? null;
  const rawRef = rawRefForObject(obj.raw);
  const metadata = {
    ...(obj.metadata ?? {}),
    source_type: obj.sourceType,
    object_type: obj.objectType,
    raw_inline: rawRef !== null,
  };
  const provenance = provenanceForObject(obj);
  const enterpriseRef = toEnterpriseSourceRef(obj.sourceId, obj.externalId);
  const frontmatter = frontmatterForObject(obj, enterpriseRef);

  return ctx.engine.transaction(async (tx) => {
    await ensureEnterprisePageSource({ ...ctx, engine: tx });

    const existing = await tx.executeRaw<{ content_hash: string; page_slug: string | null; status: string }>(
      `SELECT content_hash, page_slug, status
       FROM enterprise_ingest_objects
       WHERE ingest_source_id = $1 AND external_id = $2`,
      [obj.sourceId, obj.externalId],
    );

    if (
      existing[0]?.content_hash === contentHash &&
      existing[0].status === 'ingested' &&
      existing[0].page_slug
    ) {
      const pageUpdated = await updateEnterprisePageMetadata({ ...ctx, engine: tx }, {
        obj,
        slug: existing[0].page_slug,
        enterpriseRef,
        contentHash,
        provenance,
        frontmatter,
      });
      if (pageUpdated) {
        await tx.executeRaw(
          `UPDATE enterprise_ingest_objects
           SET last_seen_at = now(),
               version_ref = COALESCE($3, version_ref),
               metadata = $4::jsonb
           WHERE ingest_source_id = $1 AND external_id = $2`,
          [obj.sourceId, obj.externalId, versionRef, JSON.stringify(metadata)],
        );
        await resetCircuit({ ...ctx, engine: tx }, obj.sourceId);
        return { changed: false, slug: existing[0].page_slug ?? slug };
      }
    }

    const txOpts = { sourceId: EBRAIN_SOURCE_ID };
    await tx.putPage(slug, {
      type: pageTypeForObject(obj.objectType),
      title: obj.title,
      compiled_truth: obj.bodyMarkdown,
      timeline: '',
      frontmatter,
      content_hash: contentHash,
    }, txOpts);

    const chunks = chunksForBody(obj.bodyMarkdown);
    if (chunks.length > 0) {
      await tx.upsertChunks(slug, chunks, txOpts);
    } else {
      await tx.deleteChunks(slug, txOpts);
    }

    await updateEnterprisePageMetadata({ ...ctx, engine: tx }, {
      obj,
      slug,
      enterpriseRef,
      contentHash,
      provenance,
      frontmatter,
    });

    await tx.executeRaw(
      `INSERT INTO enterprise_ingest_objects (
         ingest_source_id, external_id, object_type, version_ref, content_hash,
         page_slug, status, raw_ref, last_seen_at, last_ingested_at, error, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, 'ingested', $7, now(), now(), NULL, $8::jsonb)
       ON CONFLICT (ingest_source_id, external_id) DO UPDATE SET
         object_type = EXCLUDED.object_type,
         version_ref = EXCLUDED.version_ref,
         content_hash = EXCLUDED.content_hash,
         page_slug = EXCLUDED.page_slug,
         status = 'ingested',
         raw_ref = EXCLUDED.raw_ref,
         last_seen_at = now(),
         last_ingested_at = now(),
         error = NULL,
         metadata = EXCLUDED.metadata`,
      [
        obj.sourceId,
        obj.externalId,
        obj.objectType,
        versionRef,
        contentHash,
        slug,
        rawRef,
        JSON.stringify(metadata),
      ],
    );
    await resetCircuit({ ...ctx, engine: tx }, obj.sourceId);

    return { changed: true, slug };
  });
}
