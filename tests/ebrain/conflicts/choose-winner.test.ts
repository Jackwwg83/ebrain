import { describe, expect, test } from 'bun:test';
import { chooseWinningClaim } from '../../../src/ebrain/conflicts/choose-winner.ts';

describe('chooseWinningClaim', () => {
  test('uses factAuthority source priority when available', () => {
    const winner = chooseWinningClaim({
      factKey: 'arr',
      factAuthority: { arr: ['erp', 'salesforce'] },
      values: [
        { value: 120, sourceType: 'salesforce', confidence: 0.95 },
        { value: 124, sourceType: 'erp', confidence: 0.8 },
      ],
    });

    expect(winner).toEqual({ winningValue: 124, winningSource: 'erp' });
  });

  test('falls back to highest confidence without authority', () => {
    const winner = chooseWinningClaim({
      values: [
        { value: 120, sourceType: 'salesforce', confidence: 0.7 },
        { value: 124, sourceType: 'erp', confidence: 0.91 },
      ],
    });

    expect(winner).toEqual({ winningValue: 124, winningSource: 'erp' });
  });

  test('returns null on equal-confidence ties without authority', () => {
    const winner = chooseWinningClaim({
      values: [
        { value: 120, sourceType: 'salesforce', confidence: 0.9 },
        { value: 124, sourceType: 'erp', confidence: 0.9 },
      ],
    });

    expect(winner).toBeNull();
  });

  test('returns the only value directly', () => {
    const winner = chooseWinningClaim({
      values: [{ value: 124, source_type: 'erp', confidence: 0.9 }],
    });

    expect(winner).toEqual({ winningValue: 124, winningSource: 'erp' });
  });
});
