import type { Recipe } from '../core/ai/types.ts';
import type {
  CLASSIFICATION_LEVELS,
  ENTERPRISE_SOURCE_TYPES,
  TRUST_TIERS,
} from './constants.ts';

export type {
  EnterpriseConfig,
  ExecutiveProfile,
  PolicyDecision,
} from '../core/types.ts';

export type EnterpriseSourceType =
  | (typeof ENTERPRISE_SOURCE_TYPES)[number]
  | 'unknown';

export type ClassificationLevel = (typeof CLASSIFICATION_LEVELS)[number];

export type TrustTier = (typeof TRUST_TIERS)[number];

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

export interface EnterpriseRecipe extends Recipe {
  sourceTypes?: EnterpriseSourceType[];
  executiveSkills?: string[];
}

export type { EnterpriseApp, EnterpriseConnector, TokenKind, TokenManager } from './apps/base/index.ts';
export type {
  BotAdapter,
  EnterpriseIngestObject,
  EnterpriseIngestResult,
  Event as EnterpriseEvent,
  IncomingRequest,
  MentionEvent,
  PushContent,
  RateLimitKey,
  RateLimitTier,
  Reply,
  TieredRateLimiter,
} from './apps/base/index.ts';
