import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_NAMESPACE, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export interface InitEbrainObservabilityOptions {
  env?: NodeJS.ProcessEnv;
  serviceName?: string;
  serviceVersion?: string;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export interface EbrainObservabilityState {
  enabled: boolean;
  started: boolean;
  reason?: string;
}

let sdk: NodeSDK | null = null;
let state: EbrainObservabilityState = { enabled: false, started: false, reason: 'not_initialized' };

function isTruthy(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function isExplicitlyDisabled(env: NodeJS.ProcessEnv): boolean {
  return isTruthy(env.EBRAIN_OTEL_DISABLED) || isTruthy(env.OTEL_SDK_DISABLED);
}

export function shouldEnableEbrainObservability(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isExplicitlyDisabled(env)) return false;
  if (isTruthy(env.EBRAIN_OTEL_ENABLED)) return true;
  return env.NODE_ENV === 'production' || env.EBRAIN_ENV === 'production';
}

function otlpUrl(env: NodeJS.ProcessEnv, signal: 'traces' | 'metrics'): string | undefined {
  const signalKey = signal === 'traces'
    ? env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
    : env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
  if (signalKey) return signalKey;
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) return undefined;
  const base = env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '');
  return `${base}/v1/${signal}`;
}

export function initEbrainObservability(options: InitEbrainObservabilityOptions = {}): EbrainObservabilityState {
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;

  if (!shouldEnableEbrainObservability(env)) {
    state = { enabled: false, started: false, reason: 'disabled_by_env' };
    return state;
  }
  if (sdk) {
    state = { enabled: true, started: true, reason: 'already_started' };
    return state;
  }

  const serviceName = options.serviceName ?? env.OTEL_SERVICE_NAME ?? 'ebrain';
  const serviceVersion = options.serviceVersion ?? env.npm_package_version ?? '0.36.3.0';
  const exportIntervalMillis = Number(env.OTEL_METRIC_EXPORT_INTERVAL ?? '60000');

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_NAMESPACE]: 'gbrain',
      [ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    traceExporter: new OTLPTraceExporter({ url: otlpUrl(env, 'traces') }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: otlpUrl(env, 'metrics') }),
        exportIntervalMillis: Number.isFinite(exportIntervalMillis) && exportIntervalMillis > 0
          ? exportIntervalMillis
          : 60000,
      }),
    ],
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
    state = { enabled: true, started: true };
    logger.info?.(`[ebrain observability] OpenTelemetry started for service=${serviceName}`);
  } catch (error) {
    sdk = null;
    state = { enabled: true, started: false, reason: error instanceof Error ? error.message : String(error) };
    logger.error?.(`[ebrain observability] OpenTelemetry startup failed: ${state.reason}`);
  }
  return state;
}

export async function shutdownEbrainObservability(): Promise<void> {
  if (!sdk) return;
  const active = sdk;
  sdk = null;
  await active.shutdown();
  state = { enabled: true, started: false, reason: 'shutdown' };
}

export function getEbrainObservabilityState(): EbrainObservabilityState {
  return { ...state };
}
