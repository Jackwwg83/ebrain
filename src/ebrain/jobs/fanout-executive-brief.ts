import type { OperationContext } from '../../core/operations.ts';
import { MinionQueue } from '../../core/minions/queue.ts';
import type { ExecutiveProfile } from '../types.ts';
import { listExecutiveProfiles } from '../executives/load-profile.ts';
import { EXECUTIVE_BRIEF_JOB, formatDateInTimezone } from './executive-brief.ts';

export const EXECUTIVE_BRIEF_FANOUT_JOB = 'ebrain-executive-brief-fanout';

type FanoutJob = {
  id?: number;
  data?: Record<string, unknown>;
};

type EngineSubmitJob = (
  job: { name: string; queue?: string; data: Record<string, unknown> },
  opts?: Record<string, unknown>,
) => Promise<{ id?: number } | number | unknown>;

export interface FanoutExecutiveBriefResult {
  submitted: number;
  failed_submissions: number;
  child_ids: number[];
  childJobIds: number[];
  failures: FanoutSubmissionFailure[];
  dateUtc: string;
}

export interface FanoutSubmissionFailure {
  executiveId: string;
  error: string;
}

function normalizeDateUtc(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function validTimezone(timezone: string | undefined): string {
  const candidate = timezone || 'Asia/Shanghai';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return 'UTC';
  }
}

function childIdFromSubmitResult(result: unknown): number {
  if (typeof result === 'number') return result;
  if (result && typeof result === 'object' && typeof (result as { id?: unknown }).id === 'number') {
    return (result as { id: number }).id;
  }
  throw new Error('child job submission did not return an id');
}

function errorMessage(error: unknown): string {
  return String(error);
}

function engineSubmitJob(ctx: OperationContext): EngineSubmitJob | null {
  const candidate = (ctx.engine as { submitJob?: unknown }).submitJob;
  return typeof candidate === 'function' ? candidate.bind(ctx.engine) as EngineSubmitJob : null;
}

function idempotencyKeyFor(profile: ExecutiveProfile, dateUtc: Date): string {
  const localDate = formatDateInTimezone(dateUtc, validTimezone(profile.timezone));
  return `executive-brief:${localDate}:${profile.executiveId}`;
}

async function submitExecutiveBriefChild(
  ctx: OperationContext,
  profile: ExecutiveProfile,
  dateUtc: Date,
  parentJobId?: number,
): Promise<number> {
  const idempotencyKey = idempotencyKeyFor(profile, dateUtc);
  const data = {
    executiveId: profile.executiveId,
    dateUtc: dateUtc.toISOString(),
    idempotency_key: idempotencyKey,
  };
  const opts = {
    parent_job_id: parentJobId,
    on_child_fail: 'continue' as const,
    max_stalled: 3,
    idempotency_key: idempotencyKey,
  };

  const submitJob = engineSubmitJob(ctx);
  if (submitJob) {
    return childIdFromSubmitResult(
      await submitJob({ name: EXECUTIVE_BRIEF_JOB, queue: 'default', data }, opts),
    );
  }

  const queue = new MinionQueue(ctx.engine);
  const child = await queue.add(EXECUTIVE_BRIEF_JOB, data, opts);
  return child.id;
}

export async function runFanoutExecutiveBrief(
  ctx: OperationContext,
  job: FanoutJob = {},
): Promise<FanoutExecutiveBriefResult> {
  const dateUtc = normalizeDateUtc(job.data?.dateUtc);
  const executives = await listExecutiveProfiles(ctx.engine);
  const childIds: number[] = [];
  const failedSubmissions: FanoutSubmissionFailure[] = [];

  for (const profile of executives) {
    try {
      childIds.push(await submitExecutiveBriefChild(ctx, profile, dateUtc, job.id));
    } catch (error) {
      const message = errorMessage(error);
      failedSubmissions.push({ executiveId: profile.executiveId, error: message });
      ctx.logger.warn(`[executive-brief-fanout] submit failed for ${profile.executiveId}: ${message}`);
    }
  }

  ctx.logger.info(
    `[executive-brief-fanout] submitted ${childIds.length} executive brief child jobs; failed_submissions=${failedSubmissions.length}`,
  );
  return {
    submitted: childIds.length,
    failed_submissions: failedSubmissions.length,
    child_ids: childIds,
    childJobIds: childIds,
    failures: failedSubmissions,
    dateUtc: dateUtc.toISOString(),
  };
}
