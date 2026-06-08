import type { OperationContext } from '../../core/operations.ts';

export const EBRAIN_CONNECTOR_INCREMENTAL_JOB_NAME = 'ebrain-sync';
export const EBRAIN_CONNECTOR_INCREMENTAL_ALIAS_JOB_NAME = 'ebrain-connector-incremental';

export interface ConnectorIncrementalJobResult {
  jobName: string;
  sourceId: string;
  triggered: false;
  daemonContinuous: true;
  status: 'daemon_managed' | 'skipped' | 'not_found';
  reason: string;
}

interface EnterpriseIngestSourceRow {
  ingest_source_id: string;
  sync_enabled: boolean;
  deleted_at: string | Date | null;
}

export async function connectorIncrementalHandler(
  ctx: OperationContext,
  job: { name?: string; data: unknown },
): Promise<ConnectorIncrementalJobResult> {
  const sourceId = sourceIdFromJobData(job.data);
  if (!sourceId) {
    throw new Error('ebrain connector incremental job requires data.source_id or data.sourceId');
  }

  const rows = await ctx.engine.executeRaw<EnterpriseIngestSourceRow>(
    `SELECT ingest_source_id, sync_enabled, deleted_at
     FROM enterprise_ingest_sources
     WHERE ingest_source_id = $1`,
    [sourceId],
  );
  const row = rows[0];

  if (!row) {
    const reason = 'source is not present in enterprise_ingest_sources; the autopilot IngestionDaemon will create rows for registered sources during polling';
    ctx.logger.warn(`[connector-incremental] ${sourceId}: ${reason}`);
    return result(job, sourceId, 'not_found', reason);
  }

  if (row.deleted_at !== null && row.deleted_at !== undefined) {
    const reason = 'source row is soft-deleted; daemon polling is disabled for this source';
    ctx.logger.info(`[connector-incremental] ${sourceId}: ${reason}`);
    return result(job, sourceId, 'skipped', reason);
  }

  if (row.sync_enabled === false) {
    const reason = 'source row has sync_enabled=false; daemon polling is disabled for this source';
    ctx.logger.info(`[connector-incremental] ${sourceId}: ${reason}`);
    return result(job, sourceId, 'skipped', reason);
  }

  const reason = 'upstream IngestionDaemon exposes no triggerSourcePoll API; this source is managed by continuous autopilot daemon polling';
  ctx.logger.info(`[connector-incremental] ${sourceId}: ${reason}`);
  return result(job, sourceId, 'daemon_managed', reason);
}

function result(
  job: { name?: string },
  sourceId: string,
  status: ConnectorIncrementalJobResult['status'],
  reason: string,
): ConnectorIncrementalJobResult {
  return {
    jobName: job.name ?? EBRAIN_CONNECTOR_INCREMENTAL_JOB_NAME,
    sourceId,
    triggered: false,
    daemonContinuous: true,
    status,
    reason,
  };
}

function sourceIdFromJobData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const raw = record.source_id ?? record.sourceId ?? record.ingest_source_id ?? record.ingestSourceId;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}
