import { afterEach, describe, expect, test } from 'bun:test';
import type { BrainEngine } from '../../../src/core/engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import {
  _setEnterpriseCyclePhaseFnsForTest,
  dreamCycleEnterpriseHandler,
  ENTERPRISE_CYCLE_SHARD_JOB,
} from '../../../src/ebrain/jobs/dream-cycle-enterprise.ts';
import { SHARD_COUNT } from '../../../src/ebrain/cycle/shard.ts';

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function makeCtx(engine: Partial<BrainEngine> & Record<string, unknown>): OperationContext {
  return {
    engine: engine as BrainEngine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote: false,
    sourceId: 'enterprise',
  } as OperationContext;
}

function extractResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    pagesScanned: 1,
    pagesWithFacts: 1,
    factsInserted: 2,
    factsDeleted: 0,
    legacyRowsPending: 0,
    guardTriggered: false,
    warnings: [],
    phantomsScanned: 0,
    phantomsRedirected: 0,
    phantomsAmbiguous: 0,
    phantomsSkippedDrift: 0,
    phantomsLockBusy: false,
    phantomsMorePending: false,
    enterpriseContext: {
      sourceId: 'enterprise',
      factContextFields: [],
      parser: 'gbrain:runExtractFacts',
    },
    ...overrides,
  };
}

afterEach(() => {
  _setEnterpriseCyclePhaseFnsForTest(null);
});

describe('dreamCycleEnterpriseHandler', () => {
  test('parent job fans out 8 shard child jobs with continue-on-child-fail', async () => {
    const submissions: Array<{ job: { name: string; data: Record<string, unknown> }; opts?: Record<string, unknown> }> = [];
    const engine = {
      kind: 'pglite',
      async submitJob(job: { name: string; data: Record<string, unknown> }, opts?: Record<string, unknown>) {
        submissions.push({ job, opts });
        return { id: 100 + submissions.length };
      },
      async executeRaw() {
        return [];
      },
    };
    const ctx = makeCtx(engine);

    const result = await dreamCycleEnterpriseHandler(ctx, { id: 42, name: 'ebrain-enterprise-cycle', data: {} } as never);

    expect(result).toMatchObject({
      shardsCompleted: 0,
      shardsFailed: 0,
      waitingForChildren: true,
      childJobIds: [101, 102, 103, 104, 105, 106, 107, 108],
    });
    expect(submissions).toHaveLength(SHARD_COUNT);
    expect(submissions.map((entry) => entry.job.name)).toEqual(Array.from({ length: SHARD_COUNT }, () => ENTERPRISE_CYCLE_SHARD_JOB));
    expect(submissions.map((entry) => entry.job.data.shardIdx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    for (const entry of submissions) {
      expect(entry.opts?.parent_job_id).toBe(42);
      expect(entry.opts?.on_child_fail).toBe('continue');
    }
  });

  test('child shard runs all 6 phases in order and continues after a phase error', async () => {
    const calls: string[] = [];
    _setEnterpriseCyclePhaseFnsForTest({
      async changedPageScan() {
        calls.push('phase 1');
        return { slugsChanged: ['acme-example'] };
      },
      async entityAliasRefresh() {
        calls.push('phase 2');
        return { aliasesRefreshed: 1 };
      },
      async factClaimExtraction() {
        calls.push('phase 3');
        throw new Error('extract failed but cycle continues');
      },
      async conflictDetection() {
        calls.push('phase 4');
        return { conflictsDetected: 1, conflictsInserted: 1 };
      },
      async compiledTruthRefresh() {
        calls.push('phase 5');
        return { pagesUpdated: 1 };
      },
      async briefPrecompute() {
        calls.push('phase 6');
        return { briefsGenerated: 0 };
      },
    });
    const ctx = makeCtx({ kind: 'pglite' });

    const result = await dreamCycleEnterpriseHandler(ctx, { id: 7, name: ENTERPRISE_CYCLE_SHARD_JOB, data: { shardIdx: 3 } } as never);

    expect(calls).toEqual(['phase 1', 'phase 2', 'phase 3', 'phase 4', 'phase 5', 'phase 6']);
    expect(result).toMatchObject({
      shardIdx: 3,
      changedPages: 1,
      aliasesRefreshed: 1,
      factsInserted: 0,
      conflictsDetected: 1,
      conflictsInserted: 1,
      pagesUpdated: 1,
      briefsGenerated: 0,
      failedPhases: 1,
    });
  });

  test('shardIdx null takes the parent path while shardIdx number takes the child path', async () => {
    const submitted: number[] = [];
    const parentCtx = makeCtx({
      kind: 'pglite',
      async submitJob(job: { data: { shardIdx: number } }) {
        submitted.push(job.data.shardIdx);
        return { id: 200 + job.data.shardIdx };
      },
      async executeRaw() {
        return [];
      },
    });
    const parentResult = await dreamCycleEnterpriseHandler(parentCtx, { id: 9, data: { shardIdx: null } } as never);
    expect(parentResult).toMatchObject({ waitingForChildren: true });
    expect(submitted).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    _setEnterpriseCyclePhaseFnsForTest({
      async changedPageScan() { return { slugsChanged: [] }; },
      async entityAliasRefresh() { return { aliasesRefreshed: 0 }; },
      async factClaimExtraction() { return extractResult({ factsInserted: 0 }) as never; },
      async conflictDetection() { return { conflictsDetected: 0, conflictsInserted: 0 }; },
      async compiledTruthRefresh() { return { pagesUpdated: 0 }; },
      async briefPrecompute() { return { briefsGenerated: 0 }; },
    });
    const childResult = await dreamCycleEnterpriseHandler(makeCtx({ kind: 'pglite' }), { id: 10, data: { shardIdx: 3 } } as never);
    expect(childResult).toMatchObject({ shardIdx: 3, failedPhases: 0 });
  });

  test('parent aggregation counts one failed shard without blocking completed siblings', async () => {
    const childJobIds = [101, 102, 103, 104, 105, 106, 107, 108];
    const payloads = childJobIds.map((childId, index) => ({
      payload: {
        type: 'child_done',
        child_id: childId,
        job_name: ENTERPRISE_CYCLE_SHARD_JOB,
        outcome: index === 3 ? 'failed' : 'complete',
        result: index === 3 ? null : { shardIdx: index, failedPhases: 0 },
        error: index === 3 ? 'boom' : null,
      },
    }));
    const ctx = makeCtx({
      kind: 'pglite',
      async executeRaw() {
        return payloads;
      },
    });

    const result = await dreamCycleEnterpriseHandler(ctx, {
      id: 55,
      data: { childJobIds, fanoutStartedAt: '2026-05-20T00:00:00.000Z' },
    } as never);

    expect(result).toMatchObject({
      shardsCompleted: 7,
      shardsFailed: 1,
      childJobIds,
    });
  });
});
