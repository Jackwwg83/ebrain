import type { Recipe } from '../core/ai/types.ts';
import type { OperationContext } from '../core/operations.ts';
import type {
  CLASSIFICATION_LEVELS,
  ENTERPRISE_SOURCE_TYPES,
  TRUST_TIERS,
} from './constants.ts';

export type EnterpriseSourceType =
  | (typeof ENTERPRISE_SOURCE_TYPES)[number]
  | 'unknown';

export type ClassificationLevel = (typeof CLASSIFICATION_LEVELS)[number];

export type TrustTier = (typeof TRUST_TIERS)[number];

export type PolicyDecision = {
  decision: 'allow' | 'deny' | 'redact';
  reason?: string;
};

export interface EnterpriseConfig {
  enabled?: boolean;
  apps?: Record<string, EnterpriseAppConfig>;
}

export interface EnterpriseAppConfig {
  appType: Exclude<EnterpriseSourceType, 'unknown'>;
  displayName?: string;
  enabled?: boolean;
  botEnabled?: boolean;
  pushEnabled?: boolean;
}

export interface EnterprisePageMetadata {
  enterprise_source_type?: EnterpriseSourceType | null;
  enterprise_source_ref?: string | null;
  owner_org_unit?: string | null;
  classification?: ClassificationLevel | null;
  confidence?: number | null;
  provenance?: Record<string, unknown> | null;
  object_hash?: string | null;
  last_ingested_at?: string | Date | null;

  org_id?: string | null;
  bu_id?: string | null;
  workspace_id?: string | null;
  author_entity_id?: string | null;
  reviewer_entity_id?: string | null;
  retention_policy_id?: string | null;
  legal_hold_until?: string | Date | null;
  trust_tier?: TrustTier | null;
}

export interface ExecutiveProfile {
  executiveId: string;
  email: string;
  displayName: string;
  role: string;

  soulPath: string;
  agentPersonaPath: string;
  userPath: string;
  preferencesPath: string;
  personalSkillsRoot: string;
  subagentName: string;

  timezone?: string;
  locale?: string;
  department?: string;
  deputies?: string[];

  feishuUserId?: string;
  dingtalkUserId?: string;
  wecomUserId?: string;

  pushPreferences: {
    morning_brief?: {
      enabled: boolean;
      time: string;
      channel: 'feishu' | 'dingtalk' | 'wecom';
    };
    critical_signal?: {
      enabled: boolean;
      min_severity: number;
      quiet_hours?: string;
    };
    conflict_alert?: {
      enabled: boolean;
    };
  };
}

export interface EnterpriseRecipe extends Recipe {
  sourceTypes?: EnterpriseSourceType[];
  executiveSkills?: string[];
}

export interface EnterpriseApp {
  appId: string;
  appType: Exclude<EnterpriseSourceType, 'unknown'>;
  displayName: string;
  enabled: boolean;
  botEnabled: boolean;
  pushEnabled: boolean;
  consecutiveErrors: number;
  circuitOpenUntil?: Date;
  tokenManager?: TokenManager;
  rateLimiter?: TieredRateLimiter;
  webhookHandler?: WebhookHandler;
  botAdapter?: BotAdapter;
  subConnectors?: EnterpriseConnector[];
}

export type TokenKind = 'app' | 'tenant' | 'user';

export interface TokenManager {
  getToken(kind: TokenKind, scope?: string): Promise<string>;
  refresh(kind: TokenKind, scope?: string): Promise<void>;
  isExpired(kind: TokenKind, scope?: string): Promise<boolean>;
}

export interface IncomingRequest {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  rawBody?: Buffer | string;
}

export interface EnterpriseEvent {
  type: string;
  provider: EnterpriseSourceType;
  payload: unknown;
}

export interface WebhookHandler {
  verify(req: IncomingRequest): Promise<boolean>;
  decode(req: IncomingRequest): Promise<EnterpriseEvent>;
}

export interface TieredRateLimiter {
  acquire(keys: Array<{ tier: 'app' | 'tenant' | 'user'; key: string; limit: number }>): Promise<void>;
  release(keys: Array<{ tier: string; key: string }>): void;
}

export interface MentionEvent {
  channelId: string;
  userId: string;
  text: string;
  raw?: unknown;
}

export interface Reply {
  markdown: string;
  metadata?: Record<string, unknown>;
}

export interface PushContent {
  markdown: string;
  severity?: number;
  metadata?: Record<string, unknown>;
}

export interface BotAdapter {
  onMention(handler: (event: MentionEvent) => Promise<Reply>): void;
  sendReply(channelId: string, reply: Reply): Promise<void>;
  pushToUser(userId: string, content: PushContent): Promise<void>;
  pushToChannel(channelId: string, content: PushContent): Promise<void>;
}

export interface EnterpriseConnector {
  name: string;
  app?: EnterpriseApp;
  runIncremental(ctx: OperationContext): Promise<EnterpriseIngestResult>;
  runBackfill(ctx: OperationContext, opts: { since?: string }): Promise<EnterpriseIngestResult>;
  handleWebhookEvent?(event: EnterpriseEvent): Promise<EnterpriseIngestResult>;
  transform(raw: unknown): Promise<EnterpriseIngestObject>;
}

export interface EnterpriseIngestResult {
  changed: number;
  skipped: number;
  failed: number;
  cursor?: string;
}

export interface EnterpriseIngestObject {
  sourceId: string;
  sourceType: EnterpriseSourceType;
  externalId: string;
  objectType:
    | 'im-message'
    | 'im-thread'
    | 'doc'
    | 'wiki-page'
    | 'drive-file'
    | 'meeting'
    | 'meeting-transcript'
    | 'calendar-event'
    | 'email'
    | 'crm-account'
    | 'crm-opportunity'
    | 'crm-contact';
  title: string;
  bodyMarkdown: string;
  modifiedAt?: string;
  url?: string;
  participants?: string[];
  ownerOrgUnit?: string;
  classification?: ClassificationLevel;
  raw?: unknown;
  metadata?: Record<string, unknown>;
}
