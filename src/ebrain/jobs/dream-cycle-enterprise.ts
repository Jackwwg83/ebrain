import type { OperationContext } from '../../core/operations.ts';
import { MinionQueue } from '../../core/minions/queue.ts';
import type {
  ChildDoneMessage,
  ChildOutcome,
  MinionJob,
  MinionJobContext,
} from '../../core/minions/types.ts';
import { detectFactConflicts } from '../conflicts/detect.ts';
import { EBRAIN_SOURCE_ID } from '../constants.ts';
import { markIngestError, resetCircuit } from '../sources/circuit-breaker.ts';
import {
  extractFactsEnterprise,
  type ExtractFactsEnterpriseResult,
} from '../cycle/extract-facts-enterprise.ts';
import { precomputeBriefs, type PrecomputeBriefsResult } from '../cycle/precompute-briefs.ts';
import { refreshCompiledTruth, type RefreshCompiledTruthResult } from '../cycle/refresh-compiled-truth.ts';
import { refreshEntityAliases, type RefreshEntityAliasesResult } from '../cycle/refresh-entity-aliases.ts';
import { listSlugsInShard, SHARD_COUNT, assertValidShardIdx } from '../cycle/shard.ts';

export const ENTERPRISE_CYCLE_PARENT_JOB = 'ebrain-enterprise-cycle';
export const ENTERPRISE_CYCLE_SHARD_JOB = 'ebrain-enterprise-cycle-shard';

type EnterpriseCycleJob = (MinionJob | MinionJobContext | { id?: number; name?: string; data: Record<string, unknown> }) & {
  log?: (message: string) => Promise<void>;
  readInbox?: () => Promise<Array<{ payload: unknown }>>;
  signal?: AbortSignal;
};

export interface EnterpriseCycleParentResult {
  shardsCompleted: number;
  shardsFailed: number;
  totalDuration: number;
  childJobIds?: number[];
  waitingForChildren?: boolean;
}

export interface PhaseRecord {
  phase: string;
  status: 'ok' | 'error';
  durationMs: number;
  result?: unknown;
  error?: string;
}

export interface EnterpriseCycleShardResult {
  shardIdx: number;
  changedPages: number;
  aliasesRefreshed: number;
  factsInserted: number;
  conflictsDetected: number;
  conflictsInserted: number;
  pagesUpdated: number;
  briefsGenerated: number;
  failedPhases: number;
  durationMs: number;
  phases: PhaseRecord[];
}

interface ChangedPageScanResult {
  slugsChanged: string[];
}

interface PhaseFns {
  changedPageScan(
    ctx: OperationContext,
    args: { shardIdx: number; since?: Date; job: EnterpriseCycleJob },
  ): Promise<ChangedPageScanResult>;
  entityAliasRefresh(
    ctx: OperationContext,
    args: { shardIdx: number; changedSlugs: string[]; job: EnterpriseCycleJob },
  ): Promise<RefreshEntityAliasesResult>;
  factClaimExtraction(
    ctx: OperationContext,
    args: { shardIdx: number; changedSlugs: string[]; job: EnterpriseCycleJob },
  ): Promise<ExtractFactsEnterpriseResult>;
  conflictDetection(
    ctx: OperationContext,
    args: { shardIdx: number; changedSlugs: string[]; job: EnterpriseCycleJob },
  ): Promise<{ conflictsDetected: number; conflictsInserted: number }>;
  compiledTruthRefresh(
    ctx: OperationContext,
    args: { shardIdx: number; changedSlugs: string[]; job: EnterpriseCycleJob },
  ): Promise<RefreshCompiledTruthResult>;
  briefPrecompute(
    ctx: OperationContext,
    args: { shardIdx: number; changedSlugs: string[]; job: EnterpriseCycleJob },
  ): Promise<PrecomputeBriefsResult>;
}

let phaseFnsForTest: Partial<PhaseFns> | null = null;

function defaultPhaseFns(): PhaseFns {
  return {
    async changedPageScan(ctx, args) {
      const slugsChanged = await listSlugsInShard(ctx, args.shardIdx, { since: args.since });
      return { slugsChanged };
    },
    async entityAliasRefresh(ctx, args) {
      return refreshEntityAliases(ctx, { shardIdx: args.shardIdx, changedSlugs: args.changedSlugs });
    },
    async factClaimExtraction(ctx, args) {
      return extractFactsEnterprise(ctx, {
        sourceId: EBRAIN_SOURCE_ID,
        slugs: args.changedSlugs,
      });
    },
    async conflictDetection(ctx) {
      return detectFactConflicts(ctx);
    },
    async compiledTruthRefresh(ctx, args) {
      return refreshCompiledTruth(ctx, { shardIdx: args.shardIdx, changedSlugs: args.changedSlugs });
    },
    async briefPrecompute(ctx, args) {
      return precomputeBriefs(ctx, { shardIdx: args.shardIdx });
    },
  };
}

function resolvePhaseFns(): PhaseFns {
  return { ...defaultPhaseFns(), ...(phaseFnsForTest ?? {}) };
}

export function _setEnterpriseCyclePhaseFnsForTest(overrides: Partial<PhaseFns> | null): void {
  phaseFnsForTest = overrides;
}

function jobShardIdx(job: EnterpriseCycleJob): number | null {
  const raw = job.data?.shardIdx;
  return typeof raw === 'number' && Number.isInteger(raw) ? raw : null;
}

function jobId(job: EnterpriseCycleJob): number | null {
  return typeof job.id === 'number' ? job.id : null;
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function childJobIdsFromData(data: Record<string, unknown>): number[] {
  if (!Array.isArray(data.childJobIds)) return [];
  return data.childJobIds.filter((id): id is number => Number.isInteger(id));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function logJob(job: EnterpriseCycleJob, message: string): Promise<void> {
  if (typeof job.log !== 'function') return;
  try {
    await job.log(message);
  } catch {
    // Job stacktrace writes are best-effort; phase execution should continue.
  }
}

async function markPhaseSuccess(ctx: OperationContext, ingestSourceId: string | undefined): Promise<void> {
  if (!ingestSourceId) return;
  try {
    await resetCircuit(ctx, ingestSourceId);
  } catch (error) {
    ctx.logger.warn(`enterprise cycle resetCircuit skipped for ${ingestSourceId}: ${errorMessage(error)}`);
  }
}

async function markPhaseFailure(
  ctx: OperationContext,
  ingestSourceId: string | undefined,
  error: Error,
): Promise<void> {
  if (!ingestSourceId) return;
  try {
    await markIngestError(ctx, { ingestSourceId, error });
  } catch (markError) {
    ctx.logger.warn(`enterprise cycle markIngestError skipped for ${ingestSourceId}: ${errorMessage(markError)}`);
  }
}

async function runPhase<T>(
  ctx: OperationContext,
  job: EnterpriseCycleJob,
  ingestSourceId: string | undefined,
  phase: string,
  fn: () => Promise<T>,
): Promise<{ record: PhaseRecord; value: T | null }> {
  const started = Date.now();
  try {
    const value = await fn();
    await markPhaseSuccess(ctx, ingestSourceId);
    const record: PhaseRecord = {
      phase,
      status: 'ok',
      durationMs: Date.now() - started,
      result: value,
    };
    await logJob(job, `[enterprise-cycle] ${phase} ok`);
    return { record, value };
  } catch (error) {
    const message = errorMessage(error);
    const err = error instanceof Error ? error : new Error(message);
    await markPhaseFailure(ctx, ingestSourceId, err);
    ctx.logger.warn(`[enterprise-cycle] ${phase} failed: ${message}`);
    await logJob(job, `[enterprise-cycle] ${phase} failed: ${message}`);
    return {
      record: {
        phase,
        status: 'error',
        durationMs: Date.now() - started,
        error: message,
      },
      value: null,
    };
  }
}

function asNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function runEnterpriseCycleShard(
  ctx: OperationContext,
  job: EnterpriseCycleJob,
  shardIdx: number,
): Promise<EnterpriseCycleShardResult> {
  assertValidShardIdx(shardIdx);
  const started = Date.now();
  const fns = resolvePhaseFns();
  const phases: PhaseRecord[] = [];
  const ingestSourceId = typeof job.data.ingestSourceId === 'string' ? job.data.ingestSourceId : undefined;
  const since = parseDate(job.data.since ?? job.data.lastCycleAt ?? job.data.last_cycle_at);
  let changedSlugs: string[] = [];
  let aliasesRefreshed = 0;
  let factsInserted = 0;
  let conflictsDetected = 0;
  let conflictsInserted = 0;
  let pagesUpdated = 0;
  let briefsGenerated = 0;

  const scan = await runPhase(ctx, job, ingestSourceId, 'phase 1: changed page scan', () =>
    fns.changedPageScan(ctx, { shardIdx, since, job }));
  phases.push(scan.record);
  if (scan.value) changedSlugs = scan.value.slugsChanged;

  const aliases = await runPhase(ctx, job, ingestSourceId, 'phase 2: entity alias/link refresh', () =>
    fns.entityAliasRefresh(ctx, { shardIdx, changedSlugs, job }));
  phases.push(aliases.record);
  if (aliases.value) aliasesRefreshed = asNumber(aliases.value.aliasesRefreshed);

  const facts = await runPhase(ctx, job, ingestSourceId, 'phase 3: fact claim extraction', () =>
    fns.factClaimExtraction(ctx, { shardIdx, changedSlugs, job }));
  phases.push(facts.record);
  if (facts.value) factsInserted = asNumber(facts.value.factsInserted);

  const conflicts = await runPhase(ctx, job, ingestSourceId, 'phase 4: conflict detection', () =>
    fns.conflictDetection(ctx, { shardIdx, changedSlugs, job }));
  phases.push(conflicts.record);
  if (conflicts.value) {
    conflictsDetected = asNumber(conflicts.value.conflictsDetected);
    conflictsInserted = asNumber(conflicts.value.conflictsInserted);
  }

  const compiledTruth = await runPhase(ctx, job, ingestSourceId, 'phase 5: compiled truth refresh', () =>
    fns.compiledTruthRefresh(ctx, { shardIdx, changedSlugs, job }));
  phases.push(compiledTruth.record);
  if (compiledTruth.value) pagesUpdated = asNumber(compiledTruth.value.pagesUpdated);

  const briefs = await runPhase(ctx, job, ingestSourceId, 'phase 6: executive brief precompute', () =>
    fns.briefPrecompute(ctx, { shardIdx, changedSlugs, job }));
  phases.push(briefs.record);
  if (briefs.value) briefsGenerated = asNumber(briefs.value.briefsGenerated);

  return {
    shardIdx,
    changedPages: changedSlugs.length,
    aliasesRefreshed,
    factsInserted,
    conflictsDetected,
    conflictsInserted,
    pagesUpdated,
    briefsGenerated,
    failedPhases: phases.filter((phase) => phase.status === 'error').length,
    durationMs: Date.now() - started,
    phases,
  };
}

type EngineSubmitJob = (
  job: { name: string; queue?: string; data: Record<string, unknown> },
  opts?: Record<string, unknown>,
) => Promise<{ id?: number } | number | unknown>;

function engineSubmitJob(ctx: OperationContext): EngineSubmitJob | null {
  const candidate = (ctx.engine as { submitJob?: unknown }).submitJob;
  return typeof candidate === 'function' ? candidate.bind(ctx.engine) as EngineSubmitJob : null;
}

async function submitShardJob(
  ctx: OperationContext,
  parentJobId: number,
  shardIdx: number,
  parentData: Record<string, unknown>,
): Promise<number> {
  const data = {
    ...parentData,
    childJobIds: undefined,
    fanoutStartedAt: undefined,
    shardIdx,
  };
  delete data.childJobIds;
  delete data.fanoutStartedAt;

  const idempotencyKey = `enterprise-cycle:${parentJobId}:shard:${shardIdx}`;
  const submitJob = engineSubmitJob(ctx);
  if (submitJob) {
    const submitted = await submitJob(
      { name: ENTERPRISE_CYCLE_SHARD_JOB, queue: 'default', data },
      {
        parent_job_id: parentJobId,
        on_child_fail: 'continue',
        max_stalled: 3,
        idempotency_key: idempotencyKey,
      },
    );
    if (typeof submitted === 'number') return submitted;
    if (submitted && typeof submitted === 'object' && typeof (submitted as { id?: unknown }).id === 'number') {
      return (submitted as { id: number }).id;
    }
    throw new Error('engine.submitJob did not return a child job id');
  }

  const queue = new MinionQueue(ctx.engine);
  const child = await queue.add(ENTERPRISE_CYCLE_SHARD_JOB, data, {
    parent_job_id: parentJobId,
    on_child_fail: 'continue',
    max_stalled: 3,
    idempotency_key: idempotencyKey,
  });
  return child.id;
}

async function persistParentFanout(
  ctx: OperationContext,
  parentJobId: number,
  childJobIds: number[],
  fanoutStartedAt: string,
): Promise<void> {
  await ctx.engine.executeRaw(
    `UPDATE minion_jobs
        SET data = data || $1::jsonb,
            progress = $2::jsonb,
            updated_at = now()
      WHERE id = $3`,
    [
      JSON.stringify({ childJobIds, fanoutStartedAt }),
      JSON.stringify({ phase: 'fanout', childJobIds, shardCount: SHARD_COUNT }),
      parentJobId,
    ],
  );
}

async function fanOutShardJobs(
  ctx: OperationContext,
  job: EnterpriseCycleJob,
): Promise<EnterpriseCycleParentResult> {
  const parentJobId = jobId(job);
  if (parentJobId === null) {
    throw new Error('enterprise cycle parent job requires a numeric job id for child fan-out');
  }

  const startedAt = new Date().toISOString();
  const childJobIds: number[] = [];
  for (let shardIdx = 0; shardIdx < SHARD_COUNT; shardIdx += 1) {
    childJobIds.push(await submitShardJob(ctx, parentJobId, shardIdx, job.data));
  }
  await persistParentFanout(ctx, parentJobId, childJobIds, startedAt);
  await logJob(job, `[enterprise-cycle] fan-out submitted ${childJobIds.length} shard jobs`);

  return {
    shardsCompleted: 0,
    shardsFailed: 0,
    totalDuration: 0,
    childJobIds,
    waitingForChildren: true,
  };
}

function parseChildDone(payload: unknown): ChildDoneMessage | null {
  const obj = typeof payload === 'string' ? safeParse(payload) : payload;
  if (!obj || typeof obj !== 'object') return null;
  const rec = obj as Record<string, unknown>;
  if (rec.type !== 'child_done' || typeof rec.child_id !== 'number') return null;
  return {
    type: 'child_done',
    child_id: rec.child_id,
    job_name: typeof rec.job_name === 'string' ? rec.job_name : '',
    result: rec.result,
    outcome: typeof rec.outcome === 'string' ? rec.outcome as ChildOutcome : undefined,
    error: typeof rec.error === 'string' ? rec.error : null,
  };
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function loadChildDoneMessages(
  ctx: OperationContext,
  job: EnterpriseCycleJob,
): Promise<ChildDoneMessage[]> {
  const parentJobId = jobId(job);
  if (parentJobId === null) return [];

  try {
    const rows = await ctx.engine.executeRaw<{ payload: unknown }>(
      `SELECT payload
         FROM minion_inbox
        WHERE job_id = $1
          AND payload->>'type' = 'child_done'
        ORDER BY sent_at ASC`,
      [parentJobId],
    );
    return rows.map((row) => parseChildDone(row.payload)).filter((msg): msg is ChildDoneMessage => msg !== null);
  } catch (error) {
    if (typeof job.readInbox !== 'function') throw error;
    const inbox = await job.readInbox();
    return inbox.map((row) => parseChildDone(row.payload)).filter((msg): msg is ChildDoneMessage => msg !== null);
  }
}

function phaseFailed(result: unknown): boolean {
  return Boolean(
    result &&
    typeof result === 'object' &&
    typeof (result as { failedPhases?: unknown }).failedPhases === 'number' &&
    (result as { failedPhases: number }).failedPhases > 0
  );
}

async function aggregateShardJobs(
  ctx: OperationContext,
  job: EnterpriseCycleJob,
): Promise<EnterpriseCycleParentResult> {
  const expectedChildIds = childJobIdsFromData(job.data);
  const messages = await loadChildDoneMessages(ctx, job);
  const byChildId = new Map<number, ChildDoneMessage>();
  for (const message of messages) byChildId.set(message.child_id, message);

  let shardsCompleted = 0;
  let shardsFailed = 0;
  for (const childId of expectedChildIds) {
    const message = byChildId.get(childId);
    if (!message) {
      shardsFailed += 1;
      continue;
    }
    const outcome = message.outcome ?? 'complete';
    if (outcome === 'complete' && !phaseFailed(message.result)) {
      shardsCompleted += 1;
    } else {
      shardsFailed += 1;
    }
  }

  const fanoutStartedAt = parseDate(job.data.fanoutStartedAt);
  const totalDuration = fanoutStartedAt ? Date.now() - fanoutStartedAt.getTime() : 0;
  await logJob(job, `[enterprise-cycle] aggregate complete=${shardsCompleted} failed=${shardsFailed}`);
  return {
    shardsCompleted,
    shardsFailed,
    totalDuration,
    childJobIds: expectedChildIds,
  };
}

export async function runEnterpriseCycleParent(
  ctx: OperationContext,
  job: EnterpriseCycleJob,
): Promise<EnterpriseCycleParentResult> {
  const childJobIds = childJobIdsFromData(job.data);
  if (childJobIds.length === SHARD_COUNT) {
    return aggregateShardJobs(ctx, job);
  }
  return fanOutShardJobs(ctx, job);
}

export async function dreamCycleEnterpriseHandler(
  ctx: OperationContext,
  job: EnterpriseCycleJob,
): Promise<EnterpriseCycleParentResult | EnterpriseCycleShardResult> {
  const shardIdx = jobShardIdx(job);
  if (shardIdx === null) {
    return runEnterpriseCycleParent(ctx, job);
  }
  return runEnterpriseCycleShard(ctx, job, shardIdx);
}

export const __testing = {
  parseChildDone,
  childJobIdsFromData,
  phaseFailed,
  runEnterpriseCycleParent,
  runEnterpriseCycleShard,
};
