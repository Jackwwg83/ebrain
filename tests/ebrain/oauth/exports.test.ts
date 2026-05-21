import { describe, expect, test } from 'bun:test';
import {
  exportClaudeDesktopConfig,
  exportCursorConfig,
  exportGenericJson,
  type OAuthExportClient,
} from '../../../src/ebrain/sso/exports.ts';

const client: OAuthExportClient = {
  client_id: 'gbrain_cl_test',
  client_name: 'Executive Agent',
  scope: 'read write',
  grant_types: ['client_credentials'],
  redirect_uris: ['http://localhost:3131/callback'],
};

describe('G2 OAuth client config exports', () => {
  test('Claude Desktop export is pasteable JSON with OAuth endpoints', () => {
    const parsed = JSON.parse(exportClaudeDesktopConfig(client, 'gbrain_cs_secret', 'https://brain.example/'));
    const server = parsed.mcpServers.gbrain;
    expect(server.type).toBe('http');
    expect(server.url).toBe('https://brain.example/mcp');
    expect(server.oauth.client_id).toBe('gbrain_cl_test');
    expect(server.oauth.client_secret).toBe('gbrain_cs_secret');
    expect(server.oauth.authorize_url).toBe('https://brain.example/authorize');
    expect(server.oauth.token_url).toBe('https://brain.example/token');
    expect(server.oauth.scopes).toEqual(['read', 'write']);
  });

  test('Cursor export is pasteable .cursor/mcp.json with OAuth endpoints', () => {
    const parsed = JSON.parse(exportCursorConfig(client, 'gbrain_cs_secret', 'https://brain.example'));
    const server = parsed.mcpServers.gbrain;
    expect(server.type).toBe('http');
    expect(server.url).toBe('https://brain.example/mcp');
    expect(server.oauth.client_id).toBe('gbrain_cl_test');
    expect(server.oauth.client_secret).toBe('gbrain_cs_secret');
    expect(server.oauth.authorize_url).toBe('https://brain.example/authorize');
    expect(server.oauth.token_url).toBe('https://brain.example/token');
    expect(server.oauth.scopes).toEqual(['read', 'write']);
  });

  test('generic JSON includes all OAuth endpoint URLs and registration metadata', () => {
    const parsed = JSON.parse(exportGenericJson(client, 'gbrain_cs_secret', 'https://brain.example'));
    expect(parsed.client_id).toBe('gbrain_cl_test');
    expect(parsed.client_name).toBe('Executive Agent');
    expect(parsed.client_secret).toBe('gbrain_cs_secret');
    expect(parsed.scopes).toEqual(['read', 'write']);
    expect(parsed.grant_types).toEqual(['client_credentials']);
    expect(parsed.redirect_uris).toEqual(['http://localhost:3131/callback']);
    expect(parsed.mcp_url).toBe('https://brain.example/mcp');
    expect(parsed.authorize_url).toBe('https://brain.example/authorize');
    expect(parsed.token_url).toBe('https://brain.example/token');
    expect(parsed.register_url).toBe('https://brain.example/register');
    expect(parsed.revoke_url).toBe('https://brain.example/revoke');
    expect(parsed.metadata_url).toBe('https://brain.example/.well-known/oauth-authorization-server');
  });
});
