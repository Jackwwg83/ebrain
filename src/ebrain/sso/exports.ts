export interface OAuthExportClient {
  client_id?: string;
  clientId?: string;
  client_name?: string | null;
  clientName?: string | null;
  scope?: string | null;
  scopes?: string[] | string | null;
  grant_types?: string[] | null;
  grantTypes?: string[] | null;
  redirect_uris?: string[] | null;
  redirectUris?: string[] | null;
}

interface NormalizedClient {
  clientId: string;
  clientName: string;
  scopes: string[];
  grantTypes: string[];
  redirectUris: string[];
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function normalizeScopes(client: OAuthExportClient): string[] {
  const raw = client.scopes ?? client.scope ?? 'read';
  if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean);
  return String(raw).split(/\s+/).map(s => s.trim()).filter(Boolean);
}

function normalizeClient(client: OAuthExportClient): NormalizedClient {
  const clientId = client.clientId ?? client.client_id;
  if (!clientId) throw new Error('client_id required');
  const clientName = client.clientName ?? client.client_name ?? 'gbrain';
  return {
    clientId,
    clientName,
    scopes: normalizeScopes(client),
    grantTypes: client.grantTypes ?? client.grant_types ?? ['client_credentials'],
    redirectUris: client.redirectUris ?? client.redirect_uris ?? [],
  };
}

function oauthEndpoints(baseUrl: string) {
  const root = normalizeBaseUrl(baseUrl);
  return {
    issuer: root,
    mcp_url: `${root}/mcp`,
    authorize_url: `${root}/authorize`,
    token_url: `${root}/token`,
    register_url: `${root}/register`,
    revoke_url: `${root}/revoke`,
    metadata_url: `${root}/.well-known/oauth-authorization-server`,
  };
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function exportClaudeDesktopConfig(
  client: OAuthExportClient,
  secret: string,
  baseUrl: string,
): string {
  const normalized = normalizeClient(client);
  const endpoints = oauthEndpoints(baseUrl);
  return json({
    mcpServers: {
      gbrain: {
        type: 'http',
        url: endpoints.mcp_url,
        oauth: {
          client_id: normalized.clientId,
          client_secret: secret,
          authorize_url: endpoints.authorize_url,
          token_url: endpoints.token_url,
          scopes: normalized.scopes,
        },
      },
    },
  });
}

export function exportCursorConfig(
  client: OAuthExportClient,
  secret: string,
  baseUrl: string,
): string {
  const normalized = normalizeClient(client);
  const endpoints = oauthEndpoints(baseUrl);
  return json({
    mcpServers: {
      gbrain: {
        type: 'http',
        url: endpoints.mcp_url,
        oauth: {
          client_id: normalized.clientId,
          client_secret: secret,
          authorize_url: endpoints.authorize_url,
          token_url: endpoints.token_url,
          scopes: normalized.scopes,
        },
      },
    },
  });
}

export function exportGenericJson(
  client: OAuthExportClient,
  secret: string,
  baseUrl: string,
): string {
  const normalized = normalizeClient(client);
  const endpoints = oauthEndpoints(baseUrl);
  return json({
    client_id: normalized.clientId,
    client_name: normalized.clientName,
    client_secret: secret,
    scopes: normalized.scopes,
    grant_types: normalized.grantTypes,
    redirect_uris: normalized.redirectUris,
    ...endpoints,
  });
}
