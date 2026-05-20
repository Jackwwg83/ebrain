import { describe, expect, test } from 'bun:test';
import type { BrainEngine } from '../../../src/core/engine.ts';
import type { ExtractFactsOpts, ExtractFactsResult } from '../../../src/core/cycle/extract-facts.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import { extractFactsEnterprise } from '../../../src/ebrain/cycle/extract-facts-enterprise.ts';

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function extractResult(overrides: Partial<ExtractFactsResult> = {}): ExtractFactsResult {
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
    ...overrides,
  };
}

describe('extractFactsEnterprise', () => {
  test('delegates to gbrain runExtractFacts with enterprise source context', async () => {
    const engine = {} as BrainEngine;
    const ctx = {
      engine,
      config: { engine: 'pglite' },
      logger: logger(),
      dryRun: false,
      remote: false,
      sourceId: 'enterprise',
    } as OperationContext;
    let observedEngine: BrainEngine | null = null;
    let observedOpts: ExtractFactsOpts | null = null;

    const result = await extractFactsEnterprise(ctx, {
      pageIds: ['entities/acme'],
      dryRun: true,
      runner: async (runnerEngine, runnerOpts) => {
        observedEngine = runnerEngine;
        observedOpts = runnerOpts;
        return extractResult({ factsInserted: 0 });
      },
    });

    expect(observedEngine).toBe(engine);
    expect(observedOpts).toEqual({
      dryRun: true,
      sourceId: 'enterprise',
      slugs: ['entities/acme'],
    });
    expect(result.factsInserted).toBe(0);
    expect(result.enterpriseContext).toEqual({
      sourceId: 'enterprise',
      pageIds: ['entities/acme'],
      slugs: ['entities/acme'],
      factContextFields: [
        'pages.enterprise_source_type',
        'pages.last_ingested_at',
        'enterprise_fact_claims_view',
      ],
      parser: 'gbrain:runExtractFacts',
    });
  });
});
