import { describe, expect, setDefaultTimeout, test } from 'bun:test';
import type { OperationContext } from '../../../src/core/operations.ts';
import {
  EBRAIN_CONNECTOR_INCREMENTAL_JOB_NAME,
  connectorIncrementalHandler,
} from '../../../src/ebrain/jobs/connector-incremental.ts';
import { withEngine } from '../executives/helpers.ts';

setDefaultTimeout(60_000);

describe('connectorIncrementalHandler', () => {
  test('reports daemon-managed source when upstream daemon has no trigger API', async () => {
    await withEngine(async (engine) => {
      await seedSource(engine, 'dingtalk-docs:dingtalk-prod');

      const result = await connectorIncrementalHandler(ctx(engine), {
        name: EBRAIN_CONNECTOR_INCREMENTAL_JOB_NAME,
        data: { source_id: 'dingtalk-docs:dingtalk-prod' },
      });

      expect(result).toMatchObject({
        sourceId: 'dingtalk-docs:dingtalk-prod',
        triggered: false,
        daemonContinuous: true,
        status: 'daemon_managed',
      });
      expect(result.reason).toContain('no triggerSourcePoll API');
    });
  });

  test('skips disabled and soft-deleted sources without pretending to poll', async () => {
    await withEngine(async (engine) => {
      await seedSource(engine, 'disabled-source', { syncEnabled: false });
      await seedSource(engine, 'deleted-source', { deleted: true });

      const disabled = await connectorIncrementalHandler(ctx(engine), {
        data: { sourceId: 'disabled-source' },
      });
      const deleted = await connectorIncrementalHandler(ctx(engine), {
        data: { source_id: 'deleted-source' },
      });

      expect(disabled.status).toBe('skipped');
      expect(disabled.triggered).toBe(false);
      expect(deleted.status).toBe('skipped');
      expect(deleted.triggered).toBe(false);
    });
  });

  test('requires a source id', async () => {
    await withEngine(async (engine) => {
      await expect(connectorIncrementalHandler(ctx(engine), { data: {} })).rejects.toThrow(
        'requires data.source_id or data.sourceId',
      );
    });
  });
});

function ctx(engine: any): OperationContext {
  return {
    engine,
    config: { engine: engine.kind },
    logger: { info() {}, warn() {}, error() {} },
    dryRun: false,
    remote: false,
    sourceId: 'enterprise',
  } as OperationContext;
}

async function seedSource(
  engine: any,
  sourceId: string,
  opts: { syncEnabled?: boolean; deleted?: boolean } = {},
): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_ingest_sources (
       ingest_source_id, ingest_source_type, display_name, sync_enabled, deleted_at
     ) VALUES ($1, 'dingtalk', $1, $2, $3)`,
    [sourceId, opts.syncEnabled ?? true, opts.deleted ? new Date().toISOString() : null],
  );
}
