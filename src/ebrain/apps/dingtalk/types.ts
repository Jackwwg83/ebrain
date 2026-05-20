import type { BrainEngine } from '../../../core/engine.ts';
import type { RateLimitKey } from '../base/index.ts';

export const DINGTALK_API_BASE_URL = 'https://api.dingtalk.com';

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface DingtalkCredentialConfig {
  appKey: string;
  encryptedAppSecret: string;
  corpId?: string;
  aesKey?: string;
  token?: string;
  signingSecret?: string;
  allowPlaintextWebhook?: boolean;
}

export interface DingtalkRuntimeConfig extends DingtalkCredentialConfig {
  appId?: string;
  displayName?: string;
  enabled?: boolean;
  botEnabled?: boolean;
  pushEnabled?: boolean;
  apiBaseUrl?: string;
  engine?: BrainEngine;
  fetch?: FetchLike;
  now?: () => Date;
}

export interface DingtalkApiClientOptions {
  endpoint: string;
  method?: string;
  body?: unknown;
  rateLimit?: RateLimitKey[];
}

export interface DingtalkApiClient {
  appId: string;
  appKey: string;
  corpId?: string;
  apiBaseUrl: string;
  fetch: FetchLike;
  tokenManager: { getToken(kind: 'tenant_access', scope?: string): Promise<string> };
  rateLimiter: { acquire(keys: RateLimitKey[]): Promise<void> };
}

export interface DingtalkWebhookPayload {
  EventType?: string;
  EventId?: string;
  EventBornTime?: number | string;
  CorpId?: string;
  [key: string]: unknown;
}

export interface DingtalkImMessage {
  messageId: string;
  conversationId: string;
  conversationTitle?: string;
  senderUserId: string;
  senderName?: string;
  createTime: string;
  text?: string;
  msgtype?: string;
  parentMessageId?: string;
  replyChainId?: string;
  workflow?: {
    approvalId: string;
    title: string;
    status: string;
    requesterUserId?: string;
    approverUserIds?: string[];
  };
  url?: string;
  raw?: Record<string, unknown>;
}

export interface DingtalkDocItem {
  docId: string;
  title: string;
  modifiedTime: string;
  ownerUserId?: string;
  markdown?: string;
  url?: string;
  spaceId?: string;
  raw?: Record<string, unknown>;
}

export interface DingtalkDriveFile {
  fileId: string;
  name: string;
  modifiedTime: string;
  ownerUserId?: string;
  size?: number;
  mimeType?: string;
  rawRef?: string;
  url?: string;
  raw?: Record<string, unknown>;
}

export interface DingtalkCalendarEvent {
  eventId: string;
  summary: string;
  startTime: string;
  endTime: string;
  modifiedTime?: string;
  organizerUserId?: string;
  attendeeUserIds?: string[];
  location?: string;
  description?: string;
  url?: string;
  raw?: Record<string, unknown>;
}

export interface DingtalkMeetingItem {
  meetingId: string;
  title: string;
  startTime: string;
  endTime?: string;
  modifiedTime?: string;
  hostUserId?: string;
  participantUserIds?: string[];
  recordingUrl?: string;
  transcriptMarkdown?: string;
  transcriptUnavailableReason?: string;
  url?: string;
  raw?: Record<string, unknown>;
}

export function defaultFetch(): FetchLike {
  return fetch;
}

export function normalizeBaseUrl(apiBaseUrl?: string): string {
  return (apiBaseUrl ?? DINGTALK_API_BASE_URL).replace(/\/+$/, '');
}

export function endpointUrl(apiBaseUrl: string, endpoint: string): string {
  return `${normalizeBaseUrl(apiBaseUrl)}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}
