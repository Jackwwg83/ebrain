import { describe, expect, test } from 'bun:test';
import { computeShard, SHARD_COUNT } from '../../../src/ebrain/cycle/shard.ts';

describe('enterprise cycle shard partition', () => {
  test('SHARD_COUNT is fixed to 8 for the MVP', () => {
    expect(SHARD_COUNT).toBe(8);
  });

  test('computeShard is idempotent for the same slug', () => {
    const slug = 'companies/acme-example';
    const first = computeShard(slug);
    const second = computeShard(slug);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(SHARD_COUNT);
  });

  test('computeShard distributes 10000 mock slugs across 8 shards within 10 percent', () => {
    const counts = Array.from({ length: SHARD_COUNT }, () => 0);
    for (let i = 0; i < 10_000; i += 1) {
      counts[computeShard(`mock-slug-${i}`)] += 1;
    }

    const expected = 10_000 / SHARD_COUNT;
    const tolerance = expected * 0.1;
    for (const count of counts) {
      expect(count).toBeGreaterThanOrEqual(expected - tolerance);
      expect(count).toBeLessThanOrEqual(expected + tolerance);
    }
  });
});
