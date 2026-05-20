import { describe, expect, test } from 'bun:test';
import {
  FACTS_FENCE_BEGIN,
  FACTS_FENCE_END,
  parseFactsFence,
  renderFactsTable,
  type ParsedFact,
} from '../../../src/core/facts-fence.ts';

function fact(overrides: Partial<ParsedFact>): ParsedFact {
  return {
    rowNum: 1,
    claim: 'Acme ARR reached 120 USD',
    kind: 'fact',
    confidence: 0.9,
    visibility: 'private',
    notability: 'high',
    validFrom: '2026-05-20',
    validUntil: undefined,
    source: 'salesforce',
    context: 'Sales dashboard',
    active: true,
    supersededBy: undefined,
    forgotten: false,
    claimMetric: 'arr',
    claimValue: 120,
    claimUnit: 'USD',
    claimPeriod: 'FY2026',
    ...overrides,
  };
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('gbrain facts fence round-trip', () => {
  test('parseFactsFence accepts renderFactsTable output directly', () => {
    const facts = [
      fact({ rowNum: 1, claim: 'Acme ARR reached 120 USD', source: 'salesforce', claimValue: 120 }),
      fact({ rowNum: 2, claim: 'Acme ARR reached 124 USD', source: 'erp', claimValue: 124 }),
    ];

    const fence = renderFactsTable(facts);
    const parsed = parseFactsFence(fence);

    expect(parsed.warnings).toEqual([]);
    expect(parsed.facts).toEqual(facts);
  });

  test('renderFactsTable already includes one begin and end marker', () => {
    const fence = renderFactsTable([fact({})]);

    expect(countOccurrences(fence, FACTS_FENCE_BEGIN)).toBe(1);
    expect(countOccurrences(fence, FACTS_FENCE_END)).toBe(1);
  });
});
