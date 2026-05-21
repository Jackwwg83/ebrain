import type { MinionJob } from '../../core/minions/types.ts';
import type { OperationContext } from '../../core/operations.ts';
import { EXECUTIVE_BRIEF_JOB, runExecutiveBrief } from './executive-brief.ts';

function readExecutiveId(data: Record<string, unknown>): string {
  const executiveId = typeof data.executiveId === 'string'
    ? data.executiveId
    : typeof data.executive_id === 'string'
      ? data.executive_id
      : '';
  if (!executiveId) throw new Error('ebrain-executive-brief requires job.data.executiveId');
  return executiveId;
}

function readDateUtc(data: Record<string, unknown>): Date | undefined {
  if (data.dateUtc instanceof Date) return data.dateUtc;
  if (typeof data.dateUtc !== 'string') return undefined;
  const parsed = new Date(data.dateUtc);
  if (Number.isNaN(parsed.getTime())) throw new Error('job.data.dateUtc must be a valid ISO date');
  return parsed;
}

export async function runEnterpriseJob(
  ctx: OperationContext,
  job: Pick<MinionJob, 'name' | 'data'>,
): Promise<unknown> {
  switch (job.name) {
    case EXECUTIVE_BRIEF_JOB:
      return runExecutiveBrief(ctx, {
        executiveId: readExecutiveId(job.data),
        dateUtc: readDateUtc(job.data),
      });
    default:
      throw new Error(`not_implemented:${job.name}`);
  }
}
