import { describe, expect, test } from 'bun:test';
import { GBrainOAuthProvider } from '../../../src/core/oauth-provider.ts';
import { sqlQueryForEngine } from '../../../src/core/sql-query.ts';
import { runAuth } from '../../../src/commands/auth.ts';
import { withEngine } from '../executives/helpers.ts';

async function seedExecutive(engine: { executeRaw: (sql: string, params?: unknown[]) => Promise<unknown[]> }) {
  await engine.executeRaw(
    `INSERT INTO executives (executive_id, email, display_name, role, soul_path, access_policy_path)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['ceo', 'ceo@example.test', 'CEO Example', 'CEO', 'executives/ceo/SOUL.md', 'executives/ceo/AGENT_PERSONA.md'],
  );
}

describe('G2 OAuth register-client executive binding', () => {
  test('CLI register-client requires --executive-id before opening a DB', async () => {
    const errors: string[] = [];
    const originalExit = process.exit;
    const originalError = console.error;
    (process as unknown as { exit: (code?: number) => never }).exit = ((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as (code?: number) => never;
    console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
    try {
      await expect(
        runAuth(['register-client', 'agent', '--grant-types', 'client_credentials', '--scopes', 'read']),
      ).rejects.toThrow('exit:1');
    } finally {
      (process as unknown as { exit: typeof originalExit }).exit = originalExit;
      console.error = originalError;
    }
    expect(errors.join('\n')).toContain('--executive-id <id> is required');
  });

  test('registerClientManual rejects a missing executive_id', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      await expect(
        provider.registerClientManual('agent', ['client_credentials'], 'read'),
      ).rejects.toThrow('invalid_executive_id');
    });
  });

  test('registerClientManual stores a valid executive_id', async () => {
    await withEngine(async (engine) => {
      await seedExecutive(engine);
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      const result = await provider.registerClientManual(
        'agent', ['client_credentials'], 'read', [], 'default', undefined, 'ceo',
      );
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
