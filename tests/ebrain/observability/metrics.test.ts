import { describe, expect, test } from 'bun:test';
import type { Attributes } from '@opentelemetry/api';
import {
  EBRAIN_METRIC_NAMES,
  createEbrainMetrics,
  recordBriefPushed,
  recordCycleDurationSeconds,
  recordLlmUsage,
  registerConnectorHealthObservers,
} from '../../../src/ebrain/observability/metrics.ts';

type CreatedInstrument = { kind: string; name: string; options: Record<string, unknown>; calls: Array<{ value: number; attributes?: Attributes }> };

function fakeMeter() {
  const created: CreatedInstrument[] = [];
  const callbacks: Array<{ callback: Function; observables: unknown[] }> = [];
  const make = (kind: string, name: string, options: Record<string, unknown> = {}) => {
    const instrument: CreatedInstrument = { kind, name, options, calls: [] };
    created.push(instrument);
    return {
      add(value: number, attributes?: Attributes) { instrument.calls.push({ value, attributes }); },
      record(value: number, attributes?: Attributes) { instrument.calls.push({ value, attributes }); },
      addCallback() {},
      removeCallback() {},
      __instrument: instrument,
    };
  };
  return {
    created,
    callbacks,
    meter: {
      createCounter: (name: string, options?: Record<string, unknown>) => make('counter', name, options),
      createGauge: (name: string, options?: Record<string, unknown>) => make('gauge', name, options),
      createHistogram: (name: string, options?: Record<string, unknown>) => make('histogram', name, options),
      createObservableGauge: (name: string, options?: Record<string, unknown>) => make('observable_gauge', name, options),
      addBatchObservableCallback(callback: Function, observables: unknown[]) { callbacks.push({ callback, observables }); },
      removeBatchObservableCallback(callback: Function, observables: unknown[]) {
        const idx = callbacks.findIndex(entry => entry.callback === callback && entry.observables === observables);
        if (idx >= 0) callbacks.splice(idx, 1);
      },
    },
  };
}

describe('Ebrain observability metrics', () => {
  test('registers counters, gauges, and histograms with stable names', () => {
    const fake = fakeMeter();
    createEbrainMetrics(fake.meter as any);

    expect(fake.created.map(item => [item.kind, item.name])).toEqual([
      ['counter', EBRAIN_METRIC_NAMES.briefPushedTotal],
      ['counter', EBRAIN_METRIC_NAMES.conflictDetectedTotal],
      ['gauge', EBRAIN_METRIC_NAMES.conflictOpenTotal],
      ['histogram', EBRAIN_METRIC_NAMES.cycleDurationSeconds],
      ['observable_gauge', EBRAIN_METRIC_NAMES.connectorSyncLagSeconds],
      ['observable_gauge', EBRAIN_METRIC_NAMES.connectorCircuitOpen],
      ['counter', EBRAIN_METRIC_NAMES.llmTokensTotal],
      ['counter', EBRAIN_METRIC_NAMES.llmCostUsdTotal],
    ]);
    expect(fake.created.find(item => item.name === EBRAIN_METRIC_NAMES.cycleDurationSeconds)?.options.unit).toBe('s');
  });

  test('records metric labels as OpenTelemetry attributes', () => {
    const fake = fakeMeter();
    const registry = createEbrainMetrics(fake.meter as any);

    recordBriefPushed({ provider: 'feishu', channel: 'channel', status: 'pushed' }, 2, registry);
    recordCycleDurationSeconds({ cycle: 'enterprise', phase: 'detect_conflicts', status: 'success', shard: '3' }, 12.5, registry);
    recordLlmUsage({ provider: 'openai', model: 'gpt-5', executive_id: 'ceo', skill: 'brief' }, 1200, 0.42, registry);

    expect(fake.created.find(item => item.name === EBRAIN_METRIC_NAMES.briefPushedTotal)?.calls[0]).toEqual({
      value: 2,
      attributes: { provider: 'feishu', channel: 'channel', status: 'pushed' },
    });
    expect(fake.created.find(item => item.name === EBRAIN_METRIC_NAMES.cycleDurationSeconds)?.calls[0]).toEqual({
      value: 12.5,
      attributes: { cycle: 'enterprise', phase: 'detect_conflicts', status: 'success', shard: '3' },
    });
    expect(fake.created.find(item => item.name === EBRAIN_METRIC_NAMES.llmTokensTotal)?.calls[0].attributes).toEqual({
      provider: 'openai',
      model: 'gpt-5',
      executive_id: 'ceo',
      skill: 'brief',
    });
  });

  test('registers connector health observable labels', async () => {
    const fake = fakeMeter();
    const registry = createEbrainMetrics(fake.meter as any);
    registerConnectorHealthObservers(async () => [{
      ingest_source_id: 'feishu-docs',
      ingest_source_type: 'feishu',
      lag_seconds: 3600,
      circuit_open: true,
    }], registry);

    const observations: Array<{ metric: unknown; value: number; attributes?: Attributes }> = [];
    await fake.callbacks[0].callback({ observe: (metric: unknown, value: number, attributes?: Attributes) => observations.push({ metric, value, attributes }) });

    expect(observations.map(item => [item.value, item.attributes])).toEqual([
      [3600, { ingest_source_id: 'feishu-docs', ingest_source_type: 'feishu' }],
      [1, { ingest_source_id: 'feishu-docs', ingest_source_type: 'feishu' }],
    ]);
  });
});
