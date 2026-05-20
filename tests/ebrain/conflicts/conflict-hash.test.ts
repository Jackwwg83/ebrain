import { describe, expect, test } from 'bun:test';
import { computeConflictHash } from '../../../src/ebrain/conflicts/conflict-hash.ts';

describe('computeConflictHash', () => {
  test('is independent of competing value order', () => {
    const first = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [
        { value: 120, sourceType: 'salesforce' },
        { value: 124, sourceType: 'erp' },
      ],
    });
    const second = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [
        { value: 124, sourceType: 'erp' },
        { value: 120, sourceType: 'salesforce' },
      ],
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  test('changes when competing values change', () => {
    const first = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [{ value: 120, sourceType: 'salesforce' }],
    });
    const second = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [{ value: 124, sourceType: 'salesforce' }],
    });

    expect(first).not.toBe(second);
  });

  test('corroborating source produces same hash (F1-H-001 regression)', () => {
    const args1 = {
      entitySlug: 'acme',
      factKey: 'arr',
      values: [
        { value: 120, sourceType: 'salesforce' },
        { value: 124, sourceType: 'erp' },
      ],
    };
    const args2 = {
      ...args1,
      values: [
        ...args1.values,
        { value: 124, sourceType: 'finance-dwh' },
      ],
    };

    expect(computeConflictHash(args1)).toBe(computeConflictHash(args2));
  });

  test('same values different source order produces same hash', () => {
    const hash1 = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [
        { value: 120, sourceType: 'a' },
        { value: 124, sourceType: 'b' },
      ],
    });
    const hash2 = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [
        { value: 124, sourceType: 'b' },
        { value: 120, sourceType: 'a' },
      ],
    });

    expect(hash1).toBe(hash2);
  });

  test('different distinct values produces different hash', () => {
    const hash1 = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [
        { value: 120, sourceType: 'a' },
        { value: 124, sourceType: 'b' },
      ],
    });
    const hash2 = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [
        { value: 120, sourceType: 'a' },
        { value: 130, sourceType: 'b' },
      ],
    });

    expect(hash1).not.toBe(hash2);
  });

  test('changes when entity or fact key changes', () => {
    const base = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'arr',
      values: [{ value: 120, sourceType: 'salesforce' }],
    });
    const differentEntity = computeConflictHash({
      entitySlug: 'globex',
      factKey: 'arr',
      values: [{ value: 120, sourceType: 'salesforce' }],
    });
    const differentFactKey = computeConflictHash({
      entitySlug: 'acme',
      factKey: 'mrr',
      values: [{ value: 120, sourceType: 'salesforce' }],
    });

    expect(base).not.toBe(differentEntity);
    expect(base).not.toBe(differentFactKey);
  });

  test('handles empty values stably', () => {
    const first = computeConflictHash({ entitySlug: 'acme', factKey: 'arr', values: [] });
    const second = computeConflictHash({ entitySlug: 'acme', factKey: 'arr', values: [] });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
