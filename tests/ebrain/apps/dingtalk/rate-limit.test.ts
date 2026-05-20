import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import { DingtalkRateLimiter, dingtalkRateKey } from '../../../../src/ebrain/apps/dingtalk/index.ts';
import { setupEngine, teardownEngine } from './helpers.ts';
import type { PGLiteEngine } from '../../../../src/core/pglite-engine.ts';

let engine: PGLiteEngine;

beforeEach(async () => {
  ({ engine } = await setupEngine());
});

afterEach(async () => {
  await teardownEngine(engine);
});

describe('DingtalkRateLimiter', () => {
  test('acquire stores independent endpoint keys without cross-endpoint interference', async () => {
    const limiter = new DingtalkRateLimiter({ engine });
    await limiter.acquire([
      dingtalkRateKey('app', 'corp-test', '/v1.0/im/groups/messages'),
      dingtalkRateKey('app', 'corp-test', '/v1.0/document/docs'),
    ]);
    await limiter.acquire([{ tier: 'app', key: 'dingtalk:corp-test:/v1.0/drive/files', limit: 1 }]);

    const rows = await engine.executeRaw<{ key: string; count: string }>(
      `SELECT key, count(*)::text AS count
       FROM subagent_rate_leases
       GROUP BY key
       ORDER BY key`,
    );

    expect(rows.map((row) => row.key)).toEqual([
      'app:dingtalk:corp-test:/v1.0/document/docs',
      'app:dingtalk:corp-test:/v1.0/drive/files',
      'app:dingtalk:corp-test:/v1.0/im/groups/messages',
    ]);

    await expect(limiter.acquire([{ tier: 'app', key: 'dingtalk:corp-test:/v1.0/drive/files', limit: 1 }]))
      .rejects.toThrow('rate limit exceeded');
    await expect(limiter.acquire([{ tier: 'tenant', key: 'dingtalk:corp-test:/v1.0/drive/files', limit: 1 }]))
      .resolves.toBeUndefined();
  });
});
