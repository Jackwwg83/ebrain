import type { BrainEngine } from '../../core/engine.ts';
import type { OperationContext } from '../../core/operations.ts';
import {
  FACTS_FENCE_BEGIN,
  FACTS_FENCE_END,
  renderFactsTable,
  type ParsedFact,
} from '../../core/facts-fence.ts';
import {
  runExtractFacts,
  type ExtractFactsOpts,
  type ExtractFactsResult,
} from '../../core/cycle/extract-facts.ts';

type ExtractFactsRunner = (
  engine: BrainEngine,
  opts: ExtractFactsOpts,
) => Promise<ExtractFactsResult>;

export interface ExtractFactsEnterpriseOpts extends Omit<ExtractFactsOpts, 'slugs' | 'sourceId'> {
  /**
   * Stage F1 thin-shell compatibility: enterprise planners pass pageIds, while
   * gbrain's current extract_facts export accepts slugs. F2 can replace this
   * with an id-to-slug planning step without changing the parser boundary.
   */
  pageIds?: string[];
  slugs?: string[];
  sourceId?: string;
  runner?: ExtractFactsRunner;
}

export interface ExtractFactsEnterpriseResult extends ExtractFactsResult {
  enterpriseContext: {
    sourceId: string;
    pageIds?: string[];
    slugs?: string[];
    factContextFields: string[];
    parser: 'gbrain:runExtractFacts';
  };
}

export const ENTERPRISE_FACTS_FENCE_MARKERS = {
  begin: FACTS_FENCE_BEGIN,
  end: FACTS_FENCE_END,
} as const;

export function renderEnterpriseFactsFence(facts: ParsedFact[]): string {
  return renderFactsTable(facts);
}

export async function extractFactsEnterprise(
  ctx: OperationContext,
  opts: ExtractFactsEnterpriseOpts = {},
): Promise<ExtractFactsEnterpriseResult> {
  const sourceId = opts.sourceId ?? 'enterprise';
  const slugs = opts.slugs ?? opts.pageIds;
  const runner = opts.runner ?? runExtractFacts;
  const { pageIds, runner: _runner, ...rest } = opts;
  const result = await runner(ctx.engine, {
    ...rest,
    sourceId,
    slugs,
  });

  return {
    ...result,
    enterpriseContext: {
      sourceId,
      pageIds,
      slugs,
      factContextFields: [
        'pages.enterprise_source_type',
        'pages.last_ingested_at',
        'enterprise_fact_claims_view',
      ],
      parser: 'gbrain:runExtractFacts',
    },
  };
}
