import { describe, expect, test } from 'bun:test';
import { GBrainOAuthProvider } from '../../../src/core/oauth-provider.ts';
import { sqlQueryForEngine } from '../../../src/core/sql-query.ts';
import { withEngine } from '../executives/helpers.ts';

async function seedExecutive(engine: { executeRaw: (sql: string, params?: unknown[]) => Promise<unknown[]> }) {
  await engine.executeRaw(
    `INSERT INTO executives (executive_id, email, display_name, role, soul_path, access_policy_path)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['ceo', 'ceo@example.test', 'CEO Example', 'CEO', 'executives/ceo/SOUL.md', 'executives/ceo/AGENT_PERSONA.md'],
  );
}

describe('G2 verifyAccessToken executive fields', () => {
  test('OAuth token verification returns executive fields from oauth_clients JOIN', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      const { clientId, clientSecret } = await provider.registerClientManual(
        'agent', ['client_credentials'], 'read write', [], 'default', undefined, undefined, 'ceo',
      );
      const token = await provider.exchangeClientCredentials(clientId, clientSecret, 'read');
      const authInfo = await provider.verifyAccessToken(token.access_token) as any;
      expect(authInfo.clientId).toBe(clientId);
      expect(authInfo.executiveId).toBe('ceo');
      expect(authInfo.executiveEmail).toBe('ceo@example.test');
      expect(authInfo.executiveRole).toBe('CEO');
    });
  });

  test('legacy NULL executive_id clients still verify with executive fields undefined', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      const client = await (provider.clientsStore as any).registerClient({
        client_name: 'legacy-dcr-agent',
        redirect_uris: ['http://localhost:3131/callback'],
        grant_types: ['client_credentials'],
        scope: 'read',
      });
      const token = await provider.exchangeClientCredentials(client.client_id, client.client_secret, 'read');
      const authInfo = await provider.verifyAccessToken(token.access_token) as any;
      expect(authInfo.clientId).toBe(client.client_id);
      expect(authInfo.executiveId).toBeUndefined();
      expect(authInfo.executiveEmail).toBeUndefined();
      expect(authInfo.executiveRole).toBeUndefined();
    });
  });

  test('soft-deleted executives degrade to undefined without invalidating the token', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      const { clientId, clientSecret } = await provider.registerClientManual(
        'soft-delete-agent', ['client_credentials'], 'read', [], 'default', undefined, undefined, 'ceo',
      );
      await engine.executeRaw(`UPDATE executives SET deleted_at = now() WHERE executive_id = $1`, ['ceo']);
      const token = await provider.exchangeClientCredentials(clientId, clientSecret, 'read');
      const authInfo = await provider.verifyAccessToken(token.access_token) as any;
      expect(authInfo.clientId).toBe(clientId);
      expect(authInfo.executiveId).toBeUndefined();
    });
  });
});
