import type { OperationContext } from '../../core/operations.ts';
import { assertValidShardIdx } from './shard.ts';

export interface PrecomputeBriefsOpts {
  shardIdx: number;
}

export interface PrecomputeBriefsResult {
  briefsGenerated: number;
}

/**
 * Stage F2 stub. E2 (executive brief generator) lands -> swap to real
 * implementation.
 */
export async function precomputeBriefs(
  ctx: OperationContext,
  opts: PrecomputeBriefsOpts,
): Promise<PrecomputeBriefsResult> {
  assertValidShardIdx(opts.shardIdx);
  ctx.logger.info(`[brief precompute] shard ${opts.shardIdx} - stub - awaiting E2 wire`);
  return { briefsGenerated: 0 };
}
