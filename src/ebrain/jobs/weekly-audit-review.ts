import type { BrainEngine } from '../../core/engine.ts';
import type { OperationContext } from '../../core/operations.ts';
import type { BotAdapter, EnterpriseApp, PushContent } from '../apps/base/index.ts';
import { loadEnabledEnterpriseApps } from '../webhook/server.ts';
import { recordOpenConflicts } from '../observability/metrics.ts';

export const WEEKLY_AUDIT_REVIEW_JOB = 'ebrain-weekly-audit-review';

type LoadAppsFn = typeof loadEnabledEnterpriseApps;

interface WeeklyAuditReviewDeps {
  now?: () => Date;
  loadApps?: LoadAppsFn;
}

interface RequestLogRow {
  operation: string;
  latency_ms: number | string | null;
  status: string;
}

export interface OperationCountSummary {
  operation: string;
  count: number;
  errors: number;
}

export interface OperationLatencySummary {
  operation: string;
  count: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
}

export interface ConnectorLagSummary {
  ingestSourceId: string;
  ingestSourceType: string;
  displayName: string;
  lastSuccessAt: string | null;
  lagHours: number | null;
  circuitOpen: boolean;
}

export interface ConflictSummary {
  severity: string;
  count: number;
}

export interface WeeklyAuditReviewReport {
  generatedAt: string;
  windowDays: number;
  topOpsByCount: OperationCountSummary[];
  topOpsByLatency: OperationLatencySummary[];
  laggingConnectors: ConnectorLagSummary[];
  openConflicts: ConflictSummary[];
}

export interface OpsPushResult {
  pushed: boolean;
  provider: string;
  channelId: string;
  reason?: string;
}

export interface WeeklyAuditReviewResult {
  report: WeeklyAuditReviewReport;
  markdown: string;
  pushResult: OpsPushResult;
}

let depsForTest: WeeklyAuditReviewDeps | null = null;

export function _setWeeklyAuditReviewDepsForTest(deps: WeeklyAuditReviewDeps | null): void {
  depsForTest = deps;
}

function deps(): Required<WeeklyAuditReviewDeps> {
  return {
    now: depsForTest?.now ?? (() => new Date()),
    loadApps: depsForTest?.loadApps ?? loadEnabledEnterpriseApps,
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function percentile(sorted: number[], quantile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[Math.min(index, sorted.length - 1)];
}

function summarizeRequests(rows: RequestLogRow[]): Pick<WeeklyAuditReviewReport, 'topOpsByCount' | 'topOpsByLatency'> {
  const byOperation = new Map<string, { count: number; errors: number; latencies: number[] }>();
  for (const row of rows) {
    const operation = row.operation || 'unknown';
    const current = byOperation.get(operation) ?? { count: 0, errors: 0, latencies: [] };
    current.count += 1;
    if (row.status !== 'success') current.errors += 1;
    const latency = toNumber(row.latency_ms);
    if (latency >= 0) current.latencies.push(latency);
    byOperation.set(operation, current);
  }

  const topOpsByCount = [...byOperation.entries()]
    .map(([operation, value]) => ({ operation, count: value.count, errors: value.errors }))
    .sort((a, b) => b.count - a.count || a.operation.localeCompare(b.operation))
    .slice(0, 10);

  const topOpsByLatency = [...byOperation.entries()]
    .map(([operation, value]) => {
      const sorted = [...value.latencies].sort((a, b) => a - b);
      return {
        operation,
        count: value.count,
        p99LatencyMs: percentile(sorted, 0.99),
        maxLatencyMs: sorted[sorted.length - 1] ?? 0,
      };
    })
    .sort((a, b) => b.p99LatencyMs - a.p99LatencyMs || a.operation.localeCompare(b.operation))
    .slice(0, 10);

  return { topOpsByCount, topOpsByLatency };
}

async function collectRequestLog(engine: BrainEngine): Promise<Pick<WeeklyAuditReviewReport, 'topOpsByCount' | 'topOpsByLatency'>> {
  const rows = await engine.executeRaw<RequestLogRow>(
    `SELECT operation, latency_ms, status
     FROM mcp_request_log
     WHERE created_at >= now() - INTERVAL '7 days'`,
  );
  return summarizeRequests(rows);
}

async function collectLaggingConnectors(engine: BrainEngine, now: Date): Promise<ConnectorLagSummary[]> {
  const rows = await engine.executeRaw<{
    ingest_source_id: string;
    ingest_source_type: string;
    display_name: string;
    last_success_at: string | Date | null;
    circuit_open_until: string | Date | null;
  }>(
    `SELECT ingest_source_id, ingest_source_type, display_name, last_success_at, circuit_open_until
     FROM enterprise_ingest_sources
     WHERE deleted_at IS NULL
       AND sync_enabled = true
       AND (last_success_at IS NULL OR last_success_at < now() - INTERVAL '24 hours')
     ORDER BY last_success_at ASC NULLS FIRST, ingest_source_id ASC
     LIMIT 50`,
  );

  return rows.map(row => {
    const lastSuccess = row.last_success_at ? new Date(row.last_success_at) : null;
    const circuitUntil = row.circuit_open_until ? new Date(row.circuit_open_until) : null;
    return {
      ingestSourceId: row.ingest_source_id,
      ingestSourceType: row.ingest_source_type,
      displayName: row.display_name,
      lastSuccessAt: lastSuccess && !Number.isNaN(lastSuccess.getTime()) ? lastSuccess.toISOString() : null,
      lagHours: lastSuccess && !Number.isNaN(lastSuccess.getTime())
        ? Math.round(((now.getTime() - lastSuccess.getTime()) / 3_600_000) * 10) / 10
        : null,
      circuitOpen: !!(circuitUntil && !Number.isNaN(circuitUntil.getTime()) && circuitUntil > now),
    };
  });
}

async function collectOpenConflicts(engine: BrainEngine): Promise<ConflictSummary[]> {
  const rows = await engine.executeRaw<{ severity: number | string; count: number | string }>(
    `SELECT severity, COUNT(*)::int AS count
     FROM enterprise_fact_conflicts
     WHERE status = 'open'
     GROUP BY severity
     ORDER BY severity DESC`,
  );
  return rows.map(row => ({ severity: String(row.severity), count: toNumber(row.count) }));
}

function table(headers: string[], rows: string[][], emptyText: string): string {
  if (rows.length === 0) return `${emptyText}\n`;
  const header = `| ${headers.join(' |')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map(row => `| ${row.join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}\n`;
}

export function renderWeeklyAuditMarkdown(report: WeeklyAuditReviewReport): string {
  const openConflictTotal = report.openConflicts.reduce((sum, row) => sum + row.count, 0);
  const countRows = report.topOpsByCount.map(row => [
    row.operation,
    String(row.count),
    String(row.errors),
  ]);
  const latencyRows = report.topOpsByLatency.map(row => [
    row.operation,
    String(Math.round(row.p99LatencyMs)),
    String(Math.round(row.maxLatencyMs)),
    String(row.count),
  ]);
  const connectorRows = report.laggingConnectors.map(row => [
    row.ingestSourceId,
    row.ingestSourceType,
    row.lastSuccessAt ?? 'never',
    row.lagHours === null ? 'unknown' : String(row.lagHours),
    row.circuitOpen ? 'open' : 'closed',
  ]);
  const conflictRows = report.openConflicts.map(row => [row.severity, String(row.count)]);

  return [
    '# Ebrain Weekly Audit Review',
    '',
    `Generated at: ${report.generatedAt}`,
    `Window: last ${report.windowDays} days`,
    `Open conflicts: ${openConflictTotal}`,
    '',
    '## MCP Request Volume (Top 10)',
    '',
    table(['Operation', 'Count', 'Errors'], countRows, 'No MCP requests in the review window.'),
    '## MCP Latency p99 (Top 10)',
    '',
    table(['Operation', 'p99 ms', 'Max ms', 'Count'], latencyRows, 'No MCP latency samples in the review window.'),
    '## Connector Lag > 24h',
    '',
    table(['Source', 'Type', 'Last success', 'Lag hours', 'Circuit'], connectorRows, 'No connector lag over 24h.'),
    '## Open Fact Conflicts',
    '',
    table(['Severity', 'Open count'], conflictRows, 'No open fact conflicts.'),
  ].join('\n');
}

async function readConfig(engine: BrainEngine, key: string): Promise<string | null> {
  try {
    return await engine.getConfig(key);
  } catch {
    return null;
  }
}

function appBotAdapter(app: EnterpriseApp | undefined): (BotAdapter & { pushToGroup?: BotAdapter['pushToChannel'] }) | null {
  return app?.botAdapter as (BotAdapter & { pushToGroup?: BotAdapter['pushToChannel'] }) | undefined ?? null;
}

export async function notifyOpsChannel(
  ctx: OperationContext,
  markdown: string,
  options: { provider?: string; channelId?: string } = {},
): Promise<OpsPushResult> {
  const provider = options.provider
    ?? process.env.EBRAIN_OPS_PROVIDER
    ?? await readConfig(ctx.engine, 'ebrain.ops.provider')
    ?? 'feishu';
  const channelId = options.channelId
    ?? process.env.EBRAIN_OPS_CHANNEL_ID
    ?? await readConfig(ctx.engine, 'ebrain.ops.channel_id')
    ?? 'ops';
  const apps = await deps().loadApps(ctx.engine, ctx.logger);
  const adapter = appBotAdapter(apps.get(provider));
  if (!adapter) return { pushed: false, provider, channelId, reason: 'ops_app_unavailable' };

  const content: PushContent = {
    subject: 'Ebrain weekly audit review',
    bodyMarkdown: markdown,
    urgency: 'medium',
  };
  if (adapter.pushToGroup) await adapter.pushToGroup(channelId, content);
  else await adapter.pushToChannel(channelId, content);
  return { pushed: true, provider, channelId };
}

export async function runWeeklyAuditReview(ctx: OperationContext): Promise<WeeklyAuditReviewResult> {
  const now = deps().now();
  const [requestSummary, laggingConnectors, openConflicts] = await Promise.all([
    collectRequestLog(ctx.engine),
    collectLaggingConnectors(ctx.engine, now),
    collectOpenConflicts(ctx.engine),
  ]);
  for (const row of openConflicts) recordOpenConflicts(row.severity, row.count);
  const report: WeeklyAuditReviewReport = {
    generatedAt: now.toISOString(),
    windowDays: 7,
    ...requestSummary,
    laggingConnectors,
    openConflicts,
  };
  const markdown = renderWeeklyAuditMarkdown(report);
  const pushResult = await notifyOpsChannel(ctx, markdown);
  ctx.logger.info(
    `[weekly-audit-review] pushed=${pushResult.pushed} provider=${pushResult.provider} channel=${pushResult.channelId}`,
  );
  return { report, markdown, pushResult };
}
