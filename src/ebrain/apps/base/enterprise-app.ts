import type { IngestionSource } from '../../../core/ingestion/types.ts';
import type { BotAdapter } from './bot-adapter.ts';
import type { EnterpriseConnector } from './enterprise-connector.ts';
import type { EnterpriseAppType } from './types.ts';
import type { TieredRateLimiter } from './tiered-rate-limiter.ts';
import type { TokenManager } from './token-manager.ts';
import type { WebhookHandler } from './webhook-handler.ts';

export interface EnterpriseApp {
  /** Stable deployment id, for example `feishu-prod` or `dingtalk-prod`. */
  appId: string;
  /** Strict vendor adapter id shared across all enterprise app implementations. */
  appType: EnterpriseAppType;
  /** Human-readable name for dashboards, logs, and operator prompts. */
  displayName: string;

  /** OAuth/token capability shared by IM, meeting, and CRM adapters. */
  tokenManager: TokenManager;
  /** App/tenant/user tier rate limiting capability. */
  rateLimiter: TieredRateLimiter;
  /** Optional webhook capability; some platforms or deployments do not emit events. */
  webhookHandler?: WebhookHandler;
  /** Optional bot capability; meeting and CRM adapters typically omit this. */
  botAdapter?: BotAdapter;

  /** Data-ingest sub-connectors owned by this app adapter. */
  subConnectors: Array<EnterpriseConnector | IngestionSource>;

  /** Whether this app participates in scheduled ingest or webhook handling. */
  enabled: boolean;
  /** Whether the bot interface is enabled for this app. */
  botEnabled: boolean;
  /** Whether proactive push is enabled for this app. */
  pushEnabled: boolean;
  /** Consecutive runtime errors used by later circuit-breaker stages. */
  consecutiveErrors: number;
  /** Optional timestamp until which the circuit remains open. */
  circuitOpenUntil?: Date;
}
