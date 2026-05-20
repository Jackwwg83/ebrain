/**
 * Strict EnterpriseApp provider identities. These are app adapter ids, not
 * arbitrary source ids; do not add a string fallback or I-09 stops holding.
 */
export type EnterpriseAppType =
  | 'feishu'
  | 'dingtalk'
  | 'wecom'
  | 'tencent-meeting'
  | 'crm-shenxiao'
  | 'crm-fenxiang';

/**
 * Enterprise ingest source ids mirrored by enterprise page metadata.
 *
 * Cross-reference: `src/ebrain/types.ts` exports `EnterprisePageMetadata`
 * fields that consume this classification/provenance layer when B2 maps
 * ingest objects into pages.
 */
export type EnterpriseSourceType =
  | 'feishu'
  | 'dingtalk'
  | 'wecom'
  | 'tencent-meeting'
  | 'crm-shenxiao'
  | 'crm-fenxiang';

export type EnterpriseObjectType =
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

export type ClassificationLevel = 'L0' | 'L1' | 'L2' | 'L3';

/**
 * Vendor-neutral object emitted by every enterprise connector before the B2
 * upsert path maps it into `EnterprisePageMetadata` and gbrain pages.
 */
export interface EnterpriseIngestObject {
  sourceId: string;
  sourceType: EnterpriseSourceType;
  externalId: string;
  objectType: EnterpriseObjectType;
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
