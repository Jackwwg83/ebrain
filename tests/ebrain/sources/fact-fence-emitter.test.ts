import { describe, expect, test } from 'bun:test';
import {
  FACTS_FENCE_BEGIN,
  FACTS_FENCE_END,
  parseFactsFence,
  type ParsedFact,
} from '../../../src/core/facts-fence.ts';
import { emitFactFence } from '../../../src/ebrain/sources/transformers/fact-fence-emitter.ts';

function fact(overrides: Partial<ParsedFact> = {}): ParsedFact {
  return {
    rowNum: 1,
    claim: 'Acme revenue reached 50000 USD MRR',
    kind: 'fact',
    confidence: 0.9,
    visibility: 'world',
    notability: 'high',
    validFrom: '2026-05-20',
    validUntil: undefined,
    source: 'unit-test',
    context: undefined,
    active: true,
    supersededBy: undefined,
    forgotten: false,
    claimMetric: undefined,
    claimValue: undefined,
    claimUnit: undefined,
    claimPeriod: undefined,
    ...overrides,
  };
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('emitFactFence', () => {
  test('returns a complete gbrain facts fence with canonical begin and end markers', () => {
    const output = emitFactFence([fact()]);
    expect(output).toContain(FACTS_FENCE_BEGIN);
    expect(output).toContain(FACTS_FENCE_END);
  });

  test('round-trips through parseFactsFence without changing facts', () => {
    const facts = [fact()];
    const parsed = parseFactsFence(emitFactFence(facts));
    expect(parsed.warnings).toEqual([]);
    expect(parsed.facts).toEqual(facts);
  });

  test('legacy multi-fact table uses the canonical 10-column facts header', () => {
    const output = emitFactFence([
      fact({ rowNum: 1, claim: 'First claim' }),
      fact({ rowNum: 2, claim: 'Second claim', kind: 'belief', notability: 'medium' }),
    ]);
    expect(output).toContain('| # | claim | kind | confidence | visibility | notability | valid_from | valid_until | source | context |');
    expect(parseFactsFence(output).facts).toHaveLength(2);
  });

  test('typed facts widen the markdown table to the 14-column branch', () => {
    const output = emitFactFence([
      fact({ claimMetric: 'mrr', claimValue: 50000, claimUnit: 'USD', claimPeriod: 'monthly' }),
    ]);
    expect(output).toContain('| claim_metric | claim_value | claim_unit | claim_period |');
    expect(parseFactsFence(output).facts[0]).toMatchObject({
      claimMetric: 'mrr',
      claimValue: 50000,
      claimUnit: 'USD',
      claimPeriod: 'monthly',
    });
  });

  test('does not nest begin markers when rendering facts', () => {
    const output = emitFactFence([fact()]);
    expect(countOccurrences(output, FACTS_FENCE_BEGIN)).toBe(1);
    expect(countOccurrences(output, FACTS_FENCE_END)).toBe(1);
  });
});
