import { describe, expect, test } from 'bun:test';
import { GBrainOAuthProvider } from '../../../src/core/oauth-provider.ts';
import { sqlQueryForEngine } from '../../../src/core/sql-query.ts';
import { registerEbrainClient } from '../../../src/ebrain/sso/register-client.ts';
import { withEngine } from '../executives/helpers.ts';

async function seedExecutive(engine: { executeRaw: (sql: string, params?: unknown[]) => Promise<unknown[]> }) {
  await engine.executeRaw(
    `INSERT INTO executives (executive_id, email, display_name, role, soul_path, access_policy_path)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['ceo', 'ceo@example.test', 'CEO Example', 'CEO', 'executives/ceo/SOUL.md', 'executives/ceo/AGENT_PERSONA.md'],
  );
}

describe('G2 OAuth register-client executive binding', () => {
  test('registerClientManual without executive_id preserves gbrain core compatibility', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      const result = await provider.registerClientManual('agent', ['client_credentials'], 'read');
      const rows = await engine.executeRaw<{ executive_id: string | null }>(
        `SELECT executive_id FROM oauth_clients WHERE client_id = $1`,
        [result.clientId],
      );
      expect(rows[0].executive_id).toBeNull();
    });
  });

  test('registerEbrainClient rejects a missing executive_id', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      await expect(
        registerEbrainClient(provider, engine, {
          name: 'agent',
          grantTypes: ['client_credentials'],
          scopes: 'read',
          executiveId: '   ',
        }),
      ).rejects.toThrow('executive_id is required for ebrain OAuth clients');
    });
  });

  test('registerEbrainClient rejects an unknown executive_id', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      await expect(
        registerEbrainClient(provider, engine, {
          name: 'agent',
          grantTypes: ['client_credentials'],
          scopes: 'read',
          executiveId: 'ghost',
        }),
      ).rejects.toThrow("executive 'ghost' not found");
    });
  });

  test('registerEbrainClient stores a valid executive_id', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      const result = await registerEbrainClient(provider, engine, {
        name: 'agent',
        grantTypes: ['client_credentials'],
        scopes: 'read',
        executiveId: 'ceo',
      });
      const rows = await engine.executeRaw<{ executive_id: string }>(
        `SELECT executive_id FROM oauth_clients WHERE client_id = $1`,
        [result.clientId],
      );
      expect(rows[0].executive_id).toBe('ceo');
    });
  });

  test('DCR registerClient keeps executive_id NULL for RFC 7591 compatibility', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      const client = await (provider.clientsStore as any).registerClient({
        client_name: 'dcr-agent',
        redirect_uris: ['http://localhost:3131/callback'],
        grant_types: ['client_credentials'],
        scope: 'read',
      });
      const rows = await engine.executeRaw<{ executive_id: string | null }>(
        `SELECT executive_id FROM oauth_clients WHERE client_id = $1`,
        [client.client_id],
      );
      expect(rows[0].executive_id).toBeNull();
    });
  });
});
