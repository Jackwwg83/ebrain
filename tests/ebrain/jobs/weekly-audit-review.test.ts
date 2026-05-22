import { afterEach, describe, expect, test } from 'bun:test';
import type { OperationContext } from '../../../src/core/operations.ts';
import type { EnterpriseApp, PushContent } from '../../../src/ebrain/apps/base/index.ts';
import {
  _setWeeklyAuditReviewDepsForTest,
  runWeeklyAuditReview,
} from '../../../src/ebrain/jobs/weekly-audit-review.ts';
import { withEngine } from '../executives/helpers.ts';

function ctx(engine: any): OperationContext {
  return {
    engine,
    config: { engine: engine.kind },
    logger: { info() {}, warn() {}, error() {} },
    dryRun: false,
    remote: false,
    sourceId: 'enterprise',
  } as OperationContext;
}

function feishuOpsApp(calls: Array<{ channelId: string; content: PushContent }>): EnterpriseApp {
  return {
    appId: 'feishu-ops',
    appType: 'feishu',
    displayName: 'Feishu Ops',
    enabled: true,
    botEnabled: true,
    pushEnabled: true,
    consecutiveErrors: 0,
    tokenManager: { async getToken() { return 'tok'; }, async refresh() { return { accessToken: 'tok', expiresAt: new Date() }; }, async isExpired() { return false; } },
    rateLimiter: { async acquire() {}, release() {} },
    webhookHandler: { async verify() { return true; }, async decode() { throw new Error('unused'); } },
    botAdapter: {
      onMention() {},
      async sendReply() {},
      async pushToUser() {},
      async pushToChannel(channelId, content) { calls.push({ channelId, content }); },
    },
    subConnectors: [],
  };
}

describe('runWeeklyAuditReview', () => {
  afterEach(() => _setWeeklyAuditReviewDepsForTest(null));

  test('summarizes request logs, connector lag, conflicts, and pushes markdown to ops channel', async () => {
    await withEngine(async (engine) => {
      await engine.executeRaw(`INSERT INTO mcp_request_log (operation, latency_ms, status, created_at) VALUES
        ('search', 50, 'success', now() - interval '1 day'),
        ('search', 250, 'success', now() - interval '1 day'),
        ('query', 900, 'error', now() - interval '2 days'),
        ('query', 1000, 'success', now() - interval '2 days'),
        ('old_ignored', 5000, 'success', now() - interval '8 days')`);
      await engine.executeRaw(
        `INSERT INTO enterprise_ingest_sources (ingest_source_id, ingest_source_type, display_name, last_success_at, circuit_open_until)
         VALUES
           ('feishu-docs', 'feishu', 'Feishu Docs', '2026-05-20T19:00:00Z'::timestamptz, NULL),
           ('dingtalk-im', 'dingtalk', 'DingTalk IM', now() - interval '2 hours', now() + interval '10 minutes')`,
      );
      await engine.executeRaw(
        `INSERT INTO enterprise_fact_conflicts (entity_slug, fact_key, conflict_hash, competing_values, severity)
         VALUES
           ('companies/acme-example', 'mrr', 'hash-a', $1::jsonb, 5),
           ('companies/acme-example', 'headcount', 'hash-b', $2::jsonb, 3)`,
        [JSON.stringify(['100', '200']), JSON.stringify(['10', '11'])],
      );
      await engine.setConfig('ebrain.ops.provider', 'feishu');
      await engine.setConfig('ebrain.ops.channel_id', 'ops');

      const calls: Array<{ channelId: string; content: PushContent }> = [];
      _setWeeklyAuditReviewDepsForTest({
        now: () => new Date('2026-05-22T01:00:00.000Z'),
        loadApps: async () => new Map([['feishu', feishuOpsApp(calls)]]),
      });

      const result = await runWeeklyAuditReview(ctx(engine));

      expect(result.report.topOpsByCount[0]).toMatchObject({ operation: 'query', count: 2, errors: 1 });
      expect(result.report.topOpsByLatency[0]).toMatchObject({ operation: 'query', p99LatencyMs: 1000 });
      expect(result.report.laggingConnectors).toHaveLength(1);
      expect(result.report.laggingConnectors[0]).toMatchObject({ ingestSourceId: 'feishu-docs', lagHours: 30 });
      expect(result.report.openConflicts).toEqual([{ severity: '5', count: 1 }, { severity: '3', count: 1 }]);
      expect(result.markdown).toContain('## MCP Request Volume (Top 10)');
      expect(result.markdown).toContain('## Connector Lag > 24h');
      expect(result.markdown).toContain('feishu-docs');
      expect(result.markdown).toContain('| 5 | 1 |');
      expect(result.pushResult).toMatchObject({ pushed: true, provider: 'feishu', channelId: 'ops' });
      expect(calls).toHaveLength(1);
      expect(calls[0].channelId).toBe('ops');
      expect(calls[0].content.bodyMarkdown).toBe(result.markdown);
    });
  });
});
