import { describe, expect, test } from 'bun:test';
import { GBrainOAuthProvider } from '../../../src/core/oauth-provider.ts';
import { sqlQueryForEngine } from '../../../src/core/sql-query.ts';
import { bindExecutiveToClient } from '../../../src/ebrain/sso/bind-executive.ts';
import { withEngine } from '../executives/helpers.ts';

async function seedExecutive(engine: { executeRaw: (sql: string, params?: unknown[]) => Promise<unknown[]> }) {
  await engine.executeRaw(
    `INSERT INTO executives (executive_id, email, display_name, role, soul_path, access_policy_path)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['ceo', 'ceo@example.test', 'CEO Example', 'CEO', 'executives/ceo/SOUL.md', 'executives/ceo/AGENT_PERSONA.md'],
  );
}

describe('G2 bindExecutiveToClient', () => {
  test('post-binds a DCR client and verifyAccessToken returns executive fields', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const sql = sqlQueryForEngine(engine);
      const provider = new GBrainOAuthProvider({ sql });
      const client = await (provider.clientsStore as any).registerClient({
        client_name: 'dcr-agent',
        redirect_uris: ['http://localhost:3131/callback'],
        grant_types: ['client_credentials'],
        scope: 'read',
      });
      const bound = await bindExecutiveToClient(sql, client.client_id, 'ceo');
      expect(bound).toEqual({ clientId: client.client_id, executiveId: 'ceo' });
      const token = await provider.exchangeClientCredentials(client.client_id, client.client_secret, 'read');
      const authInfo = await provider.verifyAccessToken(token.access_token) as any;
      expect(authInfo.executiveId).toBe('ceo');
      expect(authInfo.executiveEmail).toBe('ceo@example.test');
    });
  });

  test('rejects missing clients and missing executives', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const sql = sqlQueryForEngine(engine);
      await expect(bindExecutiveToClient(sql, 'missing-client', 'ceo')).rejects.toThrow('invalid_client_id');
      await expect(bindExecutiveToClient(sql, 'missing-client', 'missing-exec')).rejects.toThrow('invalid_executive_id');
    });
  });
});
