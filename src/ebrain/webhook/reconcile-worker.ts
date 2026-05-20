import type { BrainEngine } from '../../core/engine.ts';
import type { OperationContext } from '../../core/operations.ts';

export const EBRAIN_WEBHOOK_RECONCILE_JOB_NAME = 'ebrain-webhook-reconcile';

export interface WebhookGapRow {
  ingest_source_id: string;
  external_id: string;
  object_type: string;
  last_seen_at: string | Date;
}

export interface WebhookGapResult {
  since: string;
  gaps: WebhookGapRow[];
  checked: number;
}

export async function reconcileWebhookGap(
  engine: BrainEngine,
  opts: { since: Date },
): Promise<WebhookGapResult> {
  const rows = await engine.executeRaw<WebhookGapRow>(
    `SELECT ingest_source_id, external_id, object_type, last_seen_at
     FROM enterprise_ingest_objects
     WHERE last_seen_at < $1::timestamptz
       AND status IN ('seen', 'changed', 'failed')
     ORDER BY last_seen_at ASC
     LIMIT 100`,
    [opts.since.toISOString()],
  );
  return { since: opts.since.toISOString(), gaps: rows, checked: rows.length };
}

export function registerWebhookReconcileHandler(worker: {
  register(name: string, handler: (ctx: OperationContext, job: { data: unknown }) => Promise<WebhookGapResult>): void;
}): void {
  worker.register(EBRAIN_WEBHOOK_RECONCILE_JOB_NAME, async (ctx, job) => {
    const data = job.data && typeof job.data === 'object' ? job.data as { since?: unknown } : {};
    const since = typeof data.since === 'string' ? new Date(data.since) : new Date(Date.now() - 15 * 60_000);
    return reconcileWebhookGap(ctx.engine, { since });
  });
}
