import type { OperationContext } from '../../core/operations.ts';
import { EBRAIN_SOURCE_ID } from '../constants.ts';

export const SHARD_COUNT = 8;

export interface ListSlugsInShardOpts {
  since?: Date;
}

export function assertValidShardIdx(shardIdx: number): void {
  if (!Number.isInteger(shardIdx) || shardIdx < 0 || shardIdx >= SHARD_COUNT) {
    throw new Error(`shardIdx must be an integer in [0, ${SHARD_COUNT - 1}], got ${shardIdx}`);
  }
}

export function shardSqlPredicate(column = 'slug'): string {
  return `(((hashtext(${column})::bigint % $1::bigint) + $1::bigint) % $1::bigint) = $2::bigint`;
}

export async function listSlugsInShard(
  ctx: OperationContext,
  shardIdx: number,
  opts: ListSlugsInShardOpts = {},
): Promise<string[]> {
  assertValidShardIdx(shardIdx);
  const params: unknown[] = [SHARD_COUNT, shardIdx, EBRAIN_SOURCE_ID];
  const clauses = [
    `source_id = $3`,
    `deleted_at IS NULL`,
    shardSqlPredicate('slug'),
  ];

  if (opts.since) {
    params.push(opts.since.toISOString());
    clauses.push(`updated_at > $${params.length}::timestamptz`);
  }

  const rows = await ctx.engine.executeRaw<{ slug: string }>(
    `SELECT slug
       FROM pages
      WHERE ${clauses.join('\n        AND ')}
      ORDER BY slug`,
    params,
  );

  return rows.map((row) => row.slug);
}
