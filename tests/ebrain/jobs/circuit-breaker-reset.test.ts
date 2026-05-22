import { describe, expect, test } from 'bun:test';
import type { OperationContext } from '../../../src/core/operations.ts';
import { runCircuitBreakerReset } from '../../../src/ebrain/jobs/circuit-breaker-reset.ts';
import { withEngine } from '../executives/helpers.ts';

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

describe('runCircuitBreakerReset', () => {
  test('resets only expired circuit breakers', async () => {
    await withEngine(async (engine) => {
      await engine.executeRaw(
        `INSERT INTO enterprise_ingest_sources (
           ingest_source_id, ingest_source_type, display_name, consecutive_errors, circuit_open_until
         ) VALUES
           ('expired-source', 'feishu', 'Expired Source', 6, now() - interval '1 minute'),
           ('future-source', 'dingtalk', 'Future Source', 7, now() + interval '10 minutes'),
           ('closed-source', 'wecom', 'Closed Source', 0, NULL)`,
      );

      const result = await runCircuitBreakerReset(ctx(engine));
      const rows = await engine.executeRaw<{
        ingest_source_id: string;
        consecutive_errors: number;
        circuit_open_until: string | Date | null;
      }>(
        `SELECT ingest_source_id, consecutive_errors, circuit_open_until
         FROM enterprise_ingest_sources
         ORDER BY ingest_source_id`,
      );

      expect(result.resetCount).toBe(1);
      expect(result.ingestSourceIds).toEqual(['expired-source']);
      expect(rows.find(row => row.ingest_source_id === 'expired-source')).toMatchObject({
        consecutive_errors: 0,
        circuit_open_until: null,
      });
      expect(rows.find(row => row.ingest_source_id === 'future-source')?.consecutive_errors).toBe(7);
      expect(rows.find(row => row.ingest_source_id === 'future-source')?.circuit_open_until).not.toBeNull();
    });
  });
});
