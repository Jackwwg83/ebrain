import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import {
  checkCircuit,
  markIngestError,
  resetCircuit,
} from '../../../src/ebrain/sources/circuit-breaker.ts';

let engine: PGLiteEngine;
let ctx: OperationContext;

function makeCtx(engine: PGLiteEngine): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: { info() {}, warn() {}, error() {} },
    dryRun: false,
    remote: false,
    sourceId: 'default',
  } as OperationContext;
}

async function seedSource(id = 'feishu-im'): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_ingest_sources (ingest_source_id, ingest_source_type, display_name)
     VALUES ($1, 'feishu', 'Feishu IM')`,
    [id],
  );
}

beforeEach(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  ctx = makeCtx(engine);
  await seedSource();
}, 30_000);

afterEach(async () => {
  await engine.disconnect();
});

describe('enterprise ingest circuit breaker', () => {
  test('markIngestError opens the circuit for 30 minutes after 5 consecutive errors', async () => {
    for (let i = 0; i < 5; i += 1) {
      await markIngestError(ctx, { ingestSourceId: 'feishu-im', error: new Error(`boom-${i}`) });
    }

    const rows = await engine.executeRaw<{
      consecutive_errors: number;
      last_error: string;
      open_seconds: number;
    }>(
      `SELECT consecutive_errors, last_error,
              extract(epoch from (circuit_open_until - now()))::int AS open_seconds
       FROM enterprise_ingest_sources WHERE ingest_source_id = $1`,
      ['feishu-im'],
    );
    expect(rows[0].consecutive_errors).toBe(5);
    expect(rows[0].last_error).toBe('boom-4');
    expect(rows[0].open_seconds).toBeGreaterThan(25 * 60);
  });

  test('checkCircuit returns true when circuit_open_until is in the future', async () => {
    await engine.executeRaw(
      `UPDATE enterprise_ingest_sources
       SET circuit_open_until = now() + INTERVAL '30 minutes'
       WHERE ingest_source_id = $1`,
      ['feishu-im'],
    );

    expect(await checkCircuit(ctx, 'feishu-im')).toBe(true);
  });

  test('resetCircuit clears consecutive errors and records last_success_at', async () => {
    for (let i = 0; i < 5; i += 1) {
      await markIngestError(ctx, { ingestSourceId: 'feishu-im', error: new Error('boom') });
    }

    await resetCircuit(ctx, 'feishu-im');
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

  test('checkCircuit returns false after circuit_open_until expires', async () => {
    await engine.executeRaw(
      `UPDATE enterprise_ingest_sources
       SET circuit_open_until = now() - INTERVAL '1 minute'
       WHERE ingest_source_id = $1`,
      ['feishu-im'],
    );

    expect(await checkCircuit(ctx, 'feishu-im')).toBe(false);
  });
});
