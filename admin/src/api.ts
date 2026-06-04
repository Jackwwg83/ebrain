const BASE = '';

// v0.26.3 trust model (D11 + D12): the admin UI does NOT cache the
// bootstrap token in browser JS state. On 401, redirect to login —
// no auto-reauth via saved token, no localStorage/sessionStorage read.
// The HttpOnly cookie set by /admin/login is the only session credential.
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 401) {
    // No token cache to retry from. Redirect to login.
    window.location.hash = '#login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// v0.36.1.0 (T15 / E6) — SVG fetch (text/plain payload, NOT JSON).
async function apiFetchText(path: string) {
  const res = await fetch(`${BASE}${path}`, { credentials: 'same-origin' });
  if (res.status === 401) {
    window.location.hash = '#login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export const api = {
  login: (token: string) => apiFetch('/admin/login', { method: 'POST', body: JSON.stringify({ token }) }),
  signOutEverywhere: () => apiFetch('/admin/api/sign-out-everywhere', { method: 'POST' }),
  stats: () => apiFetch('/admin/api/stats'),
  health: () => apiFetch('/admin/api/health-indicators'),
  agents: () => apiFetch('/admin/api/agents'),
  requests: (page = 1, qs = '') => apiFetch(`/admin/api/requests?page=${page}${qs}`),
  apiKeys: () => apiFetch('/admin/api/api-keys'),
  createApiKey: (name: string) => apiFetch('/admin/api/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
  revokeApiKey: (name: string) => apiFetch('/admin/api/api-keys/revoke', { method: 'POST', body: JSON.stringify({ name }) }),
  updateClientTtl: (clientId: string, tokenTtl: number | null) => apiFetch('/admin/api/update-client-ttl', { method: 'POST', body: JSON.stringify({ clientId, tokenTtl }) }),
  revokeClient: (clientId: string) => apiFetch('/admin/api/revoke-client', { method: 'POST', body: JSON.stringify({ clientId }) }),
  // v0.36.1.0 (T15 / E6) — calibration endpoints.
  calibrationProfile: (holder?: string) =>
    apiFetch(`/admin/api/calibration/profile${holder ? `?holder=${encodeURIComponent(holder)}` : ''}`),
  calibrationChart: (type: string, holder?: string) =>
    apiFetchText(`/admin/api/calibration/charts/${encodeURIComponent(type)}${holder ? `?holder=${encodeURIComponent(holder)}` : ''}`),
  // v0.41 D2 — live minion-jobs dashboard snapshot.
  jobsWatch: () => apiFetch('/admin/api/jobs/watch'),
};

export type EbrainAppType = 'feishu' | 'dingtalk' | 'wecom' | 'salesforce' | 'feishu-meetings';

export interface EbrainExecutiveSummary {
  executiveId: string;
  email: string;
  displayName: string;
  role: string;
  timezone?: string;
  feishuUserId?: string;
  dingtalkUserId?: string;
  wecomUserId?: string;
  pushPreferences?: {
    morning_brief?: { enabled: boolean; channel?: string };
    critical_signal?: { enabled: boolean };
    conflict_alert?: { enabled: boolean };
  };
  lastBriefAt?: string | null;
  pushStatus?: string | null;
}

export interface EbrainExecutiveContext {
  profile: EbrainExecutiveSummary;
  prompt?: string;
}

export interface CreateExecutiveInput {
  executive_id: string;
  email: string;
  name: string;
  role: string;
  soul_path: string;
}

export interface EbrainIngestionSource {
  source_id: string;
  source_type: string;
  last_sync_at: string | null;
  last_error: string | null;
  circuit_state: 'open' | 'closed' | 'disabled' | string;
  page_count: number;
}

export interface EbrainEnterpriseApp {
  app_type: EbrainAppType;
  display_name: string;
  source_count: number;
  connected_count: number;
  circuit_open_count: number;
  last_sync_at: string | null;
  status: 'connected' | 'degraded' | 'disconnected' | 'idle';
  sources: EbrainIngestionSource[];
}

export interface EnterpriseAppRegistrationInput {
  app_type: EbrainAppType;
  app_id: string;
  display_name: string;
  credentials: Record<string, string>;
  config: {
    api_base_url?: string;
    webhook_token?: string;
    sub_connectors: string[];
  };
}

export interface ConnectionTestResult {
  ok: boolean;
  message?: string;
  checked_at?: string;
  details?: Record<string, unknown>;
}

export interface EbrainStats {
  activeExecutiveCount: number;
  briefsToday: number | null;
  briefSuccessRate: number | null;
  pendingConflictCount: number;
  dreamCycle: {
    status: 'success' | 'warn' | 'error' | 'idle';
    lastRunAt: string | null;
    phases: Array<{ phase: string; status: 'success' | 'warn' | 'error' | 'idle'; updatedAt: string | null }>;
  };
  appHealth: EbrainEnterpriseApp[];
}

interface EbrainStatsResponse {
  active_executives: number;
  briefs_today: number;
  brief_success_rate: number | null;
  open_conflicts: number;
  last_cycle_at: string | null;
  cycle_status?: 'success' | 'warn' | 'error' | 'idle';
  cycle_phases: Array<{ phase: string; status: 'success' | 'warn' | 'error' | 'idle'; updated_at: string | null }>;
}

function unwrapOperationResponse<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'result' in payload) {
    return (payload as { result: T }).result;
  }
  if (payload && typeof payload === 'object' && 'content' in payload) {
    const content = (payload as { content?: Array<{ text?: string }> }).content;
    const text = content?.[0]?.text;
    if (text) return JSON.parse(text) as T;
  }
  return payload as T;
}

export async function callEbrainOperation<T>(
  operation: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const payload = await apiFetch(`/admin/api/ebrain/ops/${encodeURIComponent(operation)}`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return unwrapOperationResponse<T>(payload);
}

export async function getExecutives(opts: { activeOnly?: boolean; limit?: number } = {}): Promise<EbrainExecutiveSummary[]> {
  return callEbrainOperation<EbrainExecutiveSummary[]>('list_executives', {
    active_only: opts.activeOnly !== false,
    limit: opts.limit ?? 500,
  });
}

export async function createExecutive(input: CreateExecutiveInput): Promise<EbrainExecutiveSummary> {
  return apiFetch('/admin/api/ebrain/executives', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<EbrainExecutiveSummary>;
}

export async function getExecutiveContext(executiveId: string): Promise<EbrainExecutiveContext> {
  return callEbrainOperation<EbrainExecutiveContext>('get_executive_context', {
    executive_id: executiveId,
  });
}

function normalizeAppType(sourceType: string): EbrainAppType {
  const lower = sourceType.toLowerCase();
  if (lower.includes('dingtalk')) return 'dingtalk';
  if (lower.includes('wecom')) return 'wecom';
  if (lower.includes('salesforce') || lower.includes('crm')) return 'salesforce';
  if (lower.includes('meeting')) return 'feishu-meetings';
  return 'feishu';
}

function aggregateApps(sources: EbrainIngestionSource[]): EbrainEnterpriseApp[] {
  const groups = new Map<EbrainAppType, EbrainIngestionSource[]>();
  for (const source of sources) {
    const appType = normalizeAppType(source.source_type);
    groups.set(appType, [...(groups.get(appType) ?? []), source]);
  }
  return [...groups.entries()].map(([appType, rows]) => {
    const connected = rows.filter(row => row.circuit_state === 'closed').length;
    const open = rows.filter(row => row.circuit_state === 'open').length;
    const orderedSyncs = rows
      .map(row => row.last_sync_at)
      .filter((value): value is string => Boolean(value))
      .sort();
    const lastSync = orderedSyncs.length > 0 ? orderedSyncs[orderedSyncs.length - 1] : null;
    return {
      app_type: appType,
      display_name: appType,
      source_count: rows.length,
      connected_count: connected,
      circuit_open_count: open,
      last_sync_at: lastSync,
      status: open > 0 ? 'degraded' : connected > 0 ? 'connected' : 'idle',
      sources: rows,
    };
  });
}

export async function getIngestionSources(opts: { sourceType?: string; limit?: number } = {}): Promise<EbrainIngestionSource[]> {
  return callEbrainOperation<EbrainIngestionSource[]>('enterprise_ingest_status', {
    source_type: opts.sourceType,
    limit: opts.limit ?? 500,
  });
}

export async function getEnterpriseApps(): Promise<EbrainEnterpriseApp[]> {
  const sources = await getIngestionSources({ limit: 500 });
  return aggregateApps(sources);
}

export async function registerEnterpriseApp(input: EnterpriseAppRegistrationInput): Promise<EbrainEnterpriseApp> {
  return apiFetch('/admin/api/ebrain/enterprise-apps', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<EbrainEnterpriseApp>;
}

export async function testConnection(input: EnterpriseAppRegistrationInput): Promise<ConnectionTestResult> {
  return apiFetch('/admin/api/ebrain/enterprise-apps/test-connection', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<ConnectionTestResult>;
}

export async function triggerSync(sourceId: string): Promise<{ queued: boolean; source_id: string }> {
  return apiFetch(`/admin/api/ebrain/ingestion-sources/${encodeURIComponent(sourceId)}/sync`, {
    method: 'POST',
  }) as Promise<{ queued: boolean; source_id: string }>;
}

export async function getStats(): Promise<EbrainStats> {
  const [stats, apps] = await Promise.all([
    apiFetch('/admin/api/ebrain/stats') as Promise<EbrainStatsResponse>,
    getEnterpriseApps(),
  ]);
  return {
    activeExecutiveCount: stats.active_executives,
    briefsToday: stats.briefs_today,
    briefSuccessRate: stats.brief_success_rate,
    pendingConflictCount: stats.open_conflicts,
    dreamCycle: {
      status: stats.cycle_status ?? (stats.open_conflicts > 0 ? 'warn' : stats.last_cycle_at ? 'success' : 'idle'),
      lastRunAt: stats.last_cycle_at,
      phases: stats.cycle_phases.map(phase => ({
        phase: phase.phase,
        status: phase.status,
        updatedAt: phase.updated_at,
      })),
    },
    appHealth: apps,
  };
}

export function getEbrainEventSource(): EventSource {
  return new EventSource('/admin/events');
}

export interface EbrainFactConflictValue {
  value: unknown;
  source_type?: string;
  sourceType?: string;
  page_slug?: string;
  pageSlug?: string;
  confidence?: number | null;
  observed_at?: string | null;
}

export interface EbrainFactConflict {
  id: string;
  entity_slug: string;
  fact_key: string;
  severity: number;
  status: 'open' | 'resolved' | 'ignored' | 'deferred' | string;
  competing_values: EbrainFactConflictValue[];
  winning_value?: unknown;
  evidence_page_slugs: string[];
  detected_at: string;
  resolved_at?: string | null;
  resolver_note?: string | null;
}

export interface ResolveFactConflictInput {
  winning_value?: unknown;
  note?: string;
  action?: 'resolve' | 'skip' | 'defer';
  executive_id?: string;
}

export interface EbrainOAuthClient {
  client_id: string;
  client_name: string;
  scope: string | null;
  scopes: string[];
  grant_types: string[];
  executive_id: string | null;
  created_at: string;
  last_used_at: string | null;
  status: string;
}

export interface CreateOAuthClientInput {
  name: string;
  executive_id: string;
  scopes: string;
  grant_types?: string[];
  redirect_uris?: string[];
  source_id?: string;
  federated_read?: string[];
}

export interface EbrainRequestLogRow {
  id: number;
  ts: string;
  executive_id: string | null;
  client_id: string | null;
  op_name: string;
  scope: string | null;
  params: unknown;
  latency_ms: number | null;
  status: string;
}

export interface EbrainRequestLogResponse {
  rows: EbrainRequestLogRow[];
  total: number;
  page: number;
  pages: number;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : '';
}

export async function getFactConflicts(opts: { status?: string; limit?: number } = {}): Promise<EbrainFactConflict[]> {
  return apiFetch(`/admin/api/ebrain/fact-conflicts${toQuery({ status: opts.status, limit: opts.limit ?? 100 })}`) as Promise<EbrainFactConflict[]>;
}

export async function detectFactConflicts(): Promise<unknown> {
  return apiFetch('/admin/api/ebrain/fact-conflicts/detect', { method: 'POST', body: '{}' });
}

export async function resolveFactConflict(conflictId: string, input: ResolveFactConflictInput): Promise<unknown> {
  return apiFetch(`/admin/api/ebrain/fact-conflicts/${encodeURIComponent(conflictId)}/resolve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getOAuthClients(): Promise<EbrainOAuthClient[]> {
  return apiFetch('/admin/api/ebrain/oauth-clients') as Promise<EbrainOAuthClient[]>;
}

export async function createOAuthClient(input: CreateOAuthClientInput): Promise<unknown> {
  return apiFetch('/admin/api/ebrain/oauth-clients', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function revokeOAuthClient(clientId: string): Promise<{ revoked: boolean }> {
  return apiFetch(`/admin/api/ebrain/oauth-clients/${encodeURIComponent(clientId)}/revoke`, {
    method: 'POST',
    body: '{}',
  }) as Promise<{ revoked: boolean }>;
}

export async function exportClientConfig(clientId: string, format: 'claude-desktop' | 'cursor' | 'json'): Promise<unknown> {
  return apiFetch(`/admin/api/clients/${encodeURIComponent(clientId)}/export?format=${encodeURIComponent(format)}`);
}

export async function getRequestLog(opts: {
  page?: number;
  executive_id?: string;
  from?: string;
  to?: string;
  op_name?: string;
  status?: string;
} = {}): Promise<EbrainRequestLogResponse> {
  return apiFetch(`/admin/api/ebrain/request-log${toQuery({
    page: opts.page ?? 1,
    executive_id: opts.executive_id,
    from: opts.from,
    to: opts.to,
    op_name: opts.op_name,
    status: opts.status,
  })}`) as Promise<EbrainRequestLogResponse>;
}
