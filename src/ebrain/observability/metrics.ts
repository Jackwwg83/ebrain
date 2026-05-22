import { metrics, ValueType, type Attributes, type Counter, type Gauge, type Histogram, type Meter, type ObservableGauge } from '@opentelemetry/api';

export const EBRAIN_METER_NAME = 'ebrain.observability';
export const EBRAIN_METER_VERSION = '0.1.0';

export const EBRAIN_METRIC_NAMES = {
  briefPushedTotal: 'ebrain_brief_pushed_total',
  conflictDetectedTotal: 'ebrain_conflict_detected_total',
  conflictOpenTotal: 'ebrain_conflict_open_total',
  cycleDurationSeconds: 'ebrain_cycle_duration_seconds',
  connectorSyncLagSeconds: 'ebrain_connector_sync_lag_seconds',
  connectorCircuitOpen: 'ebrain_connector_circuit_open',
  llmTokensTotal: 'ebrain_llm_tokens_total',
  llmCostUsdTotal: 'ebrain_llm_cost_usd_total',
} as const;

export interface EbrainMetrics {
  meter: Meter;
  briefPushedTotal: Counter;
  conflictDetectedTotal: Counter;
  conflictOpenTotal: Gauge;
  cycleDurationSeconds: Histogram;
  connectorSyncLagSeconds: ObservableGauge;
  connectorCircuitOpen: ObservableGauge;
  llmTokensTotal: Counter;
  llmCostUsdTotal: Counter;
}

export interface BriefPushedLabels {
  provider: string;
  channel: 'user' | 'channel' | 'unknown';
  status: 'pushed' | 'skipped' | 'failed';
}

export interface ConflictLabels {
  severity: string;
  source_type?: string;
}

export interface CycleDurationLabels {
  cycle: 'enterprise' | 'dream' | 'executive_brief' | string;
  phase: string;
  status: 'success' | 'partial' | 'failed' | 'skipped' | string;
  shard?: string;
}

export interface LlmUsageLabels {
  executive_id?: string;
  skill?: string;
  model: string;
  provider: string;
}

export interface ConnectorHealthSnapshot {
  ingest_source_id: string;
  ingest_source_type: string;
  lag_seconds: number;
  circuit_open: boolean;
}

let defaultRegistry: EbrainMetrics | null = null;

export function createEbrainMetrics(meter: Meter = metrics.getMeter(EBRAIN_METER_NAME, EBRAIN_METER_VERSION)): EbrainMetrics {
  return {
    meter,
    briefPushedTotal: meter.createCounter(EBRAIN_METRIC_NAMES.briefPushedTotal, {
      description: 'Total Ebrain brief push attempts by provider, channel, and status.',
      unit: '1',
      valueType: ValueType.INT,
    }),
    conflictDetectedTotal: meter.createCounter(EBRAIN_METRIC_NAMES.conflictDetectedTotal, {
      description: 'Total enterprise fact conflicts detected.',
      unit: '1',
      valueType: ValueType.INT,
    }),
    conflictOpenTotal: meter.createGauge(EBRAIN_METRIC_NAMES.conflictOpenTotal, {
      description: 'Current open enterprise fact conflicts by severity.',
      unit: '1',
      valueType: ValueType.INT,
    }),
    cycleDurationSeconds: meter.createHistogram(EBRAIN_METRIC_NAMES.cycleDurationSeconds, {
      description: 'Ebrain cycle phase duration in seconds.',
      unit: 's',
      advice: {
        explicitBucketBoundaries: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
      },
    }),
    connectorSyncLagSeconds: meter.createObservableGauge(EBRAIN_METRIC_NAMES.connectorSyncLagSeconds, {
      description: 'Enterprise connector sync lag in seconds.',
      unit: 's',
    }),
    connectorCircuitOpen: meter.createObservableGauge(EBRAIN_METRIC_NAMES.connectorCircuitOpen, {
      description: 'Enterprise connector circuit breaker state: 1=open, 0=closed.',
      unit: '1',
      valueType: ValueType.INT,
    }),
    llmTokensTotal: meter.createCounter(EBRAIN_METRIC_NAMES.llmTokensTotal, {
      description: 'Total LLM tokens attributed to Ebrain by provider, model, skill, and executive.',
      unit: 'token',
      valueType: ValueType.INT,
    }),
    llmCostUsdTotal: meter.createCounter(EBRAIN_METRIC_NAMES.llmCostUsdTotal, {
      description: 'Estimated Ebrain LLM cost in USD.',
      unit: 'USD',
    }),
  };
}

export function getEbrainMetrics(): EbrainMetrics {
  defaultRegistry ??= createEbrainMetrics();
  return defaultRegistry;
}

function definedAttributes(labels: object): Attributes {
  const out: Attributes = {};
  for (const [key, value] of Object.entries(labels)) {
    if (
      value !== undefined
      && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    ) {
      out[key] = value;
    }
  }
  return out;
}

export function recordBriefPushed(labels: BriefPushedLabels, value = 1, registry = getEbrainMetrics()): void {
  registry.briefPushedTotal.add(value, definedAttributes(labels));
}

export function recordConflictDetected(labels: ConflictLabels, value = 1, registry = getEbrainMetrics()): void {
  registry.conflictDetectedTotal.add(value, definedAttributes(labels));
}

export function recordOpenConflicts(severity: string, count: number, registry = getEbrainMetrics()): void {
  registry.conflictOpenTotal.record(count, { severity });
}

export function recordCycleDurationSeconds(labels: CycleDurationLabels, seconds: number, registry = getEbrainMetrics()): void {
  registry.cycleDurationSeconds.record(seconds, definedAttributes(labels));
}

export function recordLlmUsage(labels: LlmUsageLabels, tokens: number, estimatedCostUsd: number, registry = getEbrainMetrics()): void {
  const attributes = definedAttributes(labels);
  registry.llmTokensTotal.add(tokens, attributes);
  registry.llmCostUsdTotal.add(estimatedCostUsd, attributes);
}

export function registerConnectorHealthObservers(
  readSnapshots: () => ConnectorHealthSnapshot[] | Promise<ConnectorHealthSnapshot[]>,
  registry = getEbrainMetrics(),
): () => void {
  const observables = [
    registry.connectorSyncLagSeconds,
    registry.connectorCircuitOpen,
  ];
  const callback = async (result: { observe(metric: ObservableGauge, value: number, attributes?: Attributes): void }) => {
    const snapshots = await readSnapshots();
    for (const snapshot of snapshots) {
      const labels = {
        ingest_source_id: snapshot.ingest_source_id,
        ingest_source_type: snapshot.ingest_source_type,
      };
      result.observe(registry.connectorSyncLagSeconds, snapshot.lag_seconds, labels);
      result.observe(registry.connectorCircuitOpen, snapshot.circuit_open ? 1 : 0, labels);
    }
  };
  registry.meter.addBatchObservableCallback(callback, observables);
  return () => registry.meter.removeBatchObservableCallback(callback, observables);
}
