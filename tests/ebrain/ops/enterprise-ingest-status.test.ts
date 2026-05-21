import { describe, expect, test } from 'bun:test';
import type { BrainEngine } from '../../../src/core/engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import { enterprise_ingest_status } from '../../../src/ebrain/ops/enterprise-ingest-status.ts';
import { withEngine } from '../executives/helpers.ts';

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function makeCtx(engine: OperationContext['engine'], remote: boolean): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote,
    sourceId: 'enterprise',
  };
}

function makeCtxWithUndefinedRemote(engine: OperationContext['engine']): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote: undefined,
    sourceId: 'enterprise',
  } as unknown as OperationContext;
}

describe('enterprise_ingest_status operation', () => {
  test('declares admin local-only scope and rejects remote callers', async () => {
    expect(enterprise_ingest_status.scope).toBe('admin');
    expect(enterprise_ingest_status.localOnly).toBe(true);

    let caught: unknown;
    try {
      await enterprise_ingest_status.handler(makeCtx({} as BrainEngine, true), {});
    } catch (error) {
      caught = error;
    }

    expect((caught as { code?: string }).code).toBe('permission_denied');
  });

  test('rejects direct calls when remote is undefined', async () => {
    let caught: unknown;
    try {
      await enterprise_ingest_status.handler(makeCtxWithUndefinedRemote({} as BrainEngine), {});
    } catch (error) {
      caught = error;
    }

    expect((caught as { code?: string }).code).toBe('permission_denied');
  });

  test('reads real ingest-source status locally', async () => {
    await withEngine(async (engine) => {
      await engine.executeRaw(
        `INSERT INTO enterprise_ingest_sources (
           ingest_source_id, ingest_source_type, display_name, last_success_at,
           last_error, circuit_open_until
         )
         VALUES (
           'dingtalk-main', 'dingtalk', 'DingTalk Main',
           '2026-05-20T00:00:00.000Z', 'rate limited', '2099-01-01T00:00:00.000Z'
         )`,
      );
      await engine.executeRaw(
        `INSERT INTO enterprise_ingest_objects (
           ingest_source_id, external_id, object_type, content_hash, page_slug, status
         )
         VALUES
           ('dingtalk-main', 'msg-1', 'message', 'hash-1', 'dingtalk/msg-1', 'ingested'),
           ('dingtalk-main', 'msg-2', 'message', 'hash-2', NULL, 'seen')`,
      );

      const result = await enterprise_ingest_status.handler(
        makeCtx(engine, false),
        { source_type: 'dingtalk' },
      ) as Array<Record<string, unknown>>;

      expect(result).toEqual([{
        source_id: 'dingtalk-main',
        source_type: 'dingtalk',
        last_sync_at: expect.any(String),
        last_error: 'rate limited',
        circuit_state: 'open',
        page_count: 1,
      }]);
    });
  }, 30_000);
});
