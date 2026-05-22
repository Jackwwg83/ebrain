import { describe, expect, test } from 'bun:test';
import { createExecutive } from '../../src/ebrain/executives/create.ts';
import { resolveFactConflict } from '../../src/ebrain/conflicts/resolve.ts';
import { GBrainOAuthProvider } from '../../src/core/oauth-provider.ts';
import { sqlQueryForEngine } from '../../src/core/sql-query.ts';
import { registerEbrainClient } from '../../src/ebrain/sso/register-client.ts';
import { withEngine } from './executives/helpers.ts';

describe('H2 admin write paths', () => {
  test('createExecutive writes an executive row in PGLite', async () => {
    await withEngine(async (engine) => {
      await createExecutive(engine, {
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
      });
      const rows = await engine.executeRaw<{ executive_id: string }>(
        `SELECT executive_id FROM executives WHERE executive_id = 'ceo'`,
      );
      expect(rows[0]?.executive_id).toBe('ceo');
    });
  }, 30_000);

  test('registerEbrainClient requires and stores executive_id', async () => {
    await withEngine(async (engine) => {
      await createExecutive(engine, {
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
      });
      const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
      const client = await registerEbrainClient(provider, engine, {
        name: 'h2-agent',
        grantTypes: ['client_credentials'],
        scopes: 'read write',
        executiveId: 'ceo',
        sourceId: 'default',
      });
      const rows = await engine.executeRaw<{ executive_id: string }>(
        `SELECT executive_id FROM oauth_clients WHERE client_id = $1`,
        [client.clientId],
      );
      expect(rows[0]?.executive_id).toBe('ceo');
    });
  }, 30_000);

  test('resolveFactConflict updates status and writes compiled_truth frontmatter', async () => {
    await withEngine(async (engine) => {
      await engine.putPage('companies/acme-example', {
        type: 'company',
        title: 'Acme Example',
        compiled_truth: 'Existing truth',
        timeline: '',
        frontmatter: {},
      });
      const inserted = await engine.executeRaw<{ id: string }>(
        `INSERT INTO enterprise_fact_conflicts (entity_slug, fact_key, conflict_hash, competing_values, evidence_page_slugs)
         VALUES ($1, $2, $3, $4::jsonb, $5::text[])
         RETURNING id::text`,
        [
          'companies/acme-example',
          'arr',
          'h2-conflict',
          JSON.stringify([{ value: 120, source_type: 'salesforce', page_slug: 'evidence/a' }, { value: 124, source_type: 'erp', page_slug: 'evidence/b' }]),
          '{evidence/a,evidence/b}',
        ],
      );
      await resolveFactConflict(engine, inserted[0]!.id, 124, 'verified by finance', { resolvedByExecutiveId: 'ceo' });
      const conflict = await engine.executeRaw<{ status: string; winning_value: unknown; resolver_note: string }>(
        `SELECT status, winning_value, resolver_note FROM enterprise_fact_conflicts WHERE id = $1`,
        [inserted[0]!.id],
      );
      const page = await engine.getPage('companies/acme-example');
      expect(conflict[0]?.status).toBe('resolved');
      expect(conflict[0]?.resolver_note).toBe('verified by finance');
      expect(page?.frontmatter.compiled_truth).toEqual({ arr: 124 });
    });
  }, 30_000);
});
