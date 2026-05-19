/** Ebrain-wide constants shared by enterprise-only MVP modules. */
/** Keep the literal source identifier isolated here for invariant I-01. */
export const EBRAIN_SOURCE_ID = 'enterprise' as const;
export const MVP_EXECUTIVE_LIMIT = 10 as const;

export const ENTERPRISE_SOURCE_TYPES = [
  'feishu',
  'dingtalk',
  'wecom',
  'tencent-meeting',
  'crm-shenxiao',
  'crm-fenxiang',
] as const;

export const CLASSIFICATION_LEVELS = ['L0', 'L1', 'L2', 'L3'] as const;

export const TRUST_TIERS = [
  'raw',
  'draft',
  'published',
  'verified',
  'inferred',
] as const;
