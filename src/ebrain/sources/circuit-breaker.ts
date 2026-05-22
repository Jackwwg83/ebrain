import type { OperationContext } from '../../core/operations.ts';

const CIRCUIT_ERROR_THRESHOLD = 5;
export async function markIngestError(
  ctx: OperationContext,
  args: { ingestSourceId: string; error: Error },
): Promise<void> {
  await ctx.engine.executeRaw(
    `UPDATE enterprise_ingest_sources
     SET consecutive_errors = consecutive_errors + 1,
         last_error = $2,
         last_error_at = now(),
         circuit_open_until = CASE
           WHEN consecutive_errors + 1 >= $3 THEN now() + INTERVAL '30 minutes'
           ELSE circuit_open_until
         END,
         updated_at = now()
     WHERE ingest_source_id = $1`,
    [args.ingestSourceId, args.error.message, CIRCUIT_ERROR_THRESHOLD],
  );
}

export async function checkCircuit(
  ctx: OperationContext,
  ingestSourceId: string,
): Promise<boolean> {
  const rows = await ctx.engine.executeRaw<{ open: boolean }>(
    `SELECT COALESCE(circuit_open_until > now(), false) AS open
     FROM enterprise_ingest_sources
     WHERE ingest_source_id = $1`,
    [ingestSourceId],
  );
  return rows[0]?.open === true;
}

export async function resetCircuit(
  ctx: OperationContext,
  ingestSourceId: string,
): Promise<void> {
  await ctx.engine.executeRaw(
    `UPDATE enterprise_ingest_sources
     SET consecutive_errors = 0,
         circuit_open_until = NULL,
         last_success_at = now(),
         updated_at = now()
     WHERE ingest_source_id = $1`,
    [ingestSourceId],
  );
}

export interface ResetExpiredCircuitResult {
  resetCount: number;
  ingestSourceIds: string[];
}

export async function resetExpired(ctx: OperationContext): Promise<ResetExpiredCircuitResult> {
  const rows = await ctx.engine.executeRaw<{ ingest_source_id: string }>(
    `UPDATE enterprise_ingest_sources
     SET consecutive_errors = 0,
         circuit_open_until = NULL,
         updated_at = now()
     WHERE circuit_open_until IS NOT NULL
       AND circuit_open_until <= now()
       AND deleted_at IS NULL
     RETURNING ingest_source_id`,
  );
  return {
    resetCount: rows.length,
    ingestSourceIds: rows.map(row => row.ingest_source_id),
  };
}
