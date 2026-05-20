import type { OperationContext } from '../../core/operations.ts';
import type { EnterpriseApp, TokenKind, TokenManager, TokenRefreshResult } from '../apps/base/index.ts';
import { encrypt } from '../secrets/crypto.ts';

export const EBRAIN_TOKEN_REFRESH_JOB_NAME = 'ebrain-token-refresh';
const TOKEN_REFRESH_BATCH_LIMIT = 50;

type RuntimeEnterpriseApp = Pick<EnterpriseApp, 'appId' | 'appType' | 'displayName'> & {
  tokenManager?: TokenManager;
};

type TokenRow = {
  app_id: string;
  token_kind: TokenKind;
  scope_key: string;
  expires_at: string | Date;
};

type LoadEnterpriseApp = (
  ctx: OperationContext,
  appId: string,
) => Promise<RuntimeEnterpriseApp | null>;

let loadEnterpriseAppForTest: LoadEnterpriseApp | null = null;

export function _setLoadEnterpriseAppForTest(loader: LoadEnterpriseApp | null): void {
  loadEnterpriseAppForTest = loader;
}

export async function loadEnterpriseApp(
  ctx: OperationContext,
  appId: string,
): Promise<RuntimeEnterpriseApp | null> {
  if (loadEnterpriseAppForTest) return loadEnterpriseAppForTest(ctx, appId);

  const rows = await ctx.engine.executeRaw<{
    app_id: string;
    app_type: EnterpriseApp['appType'];
    display_name: string;
  }>(
    `SELECT app_id, app_type, display_name
     FROM enterprise_apps
     WHERE app_id = $1 AND deleted_at IS NULL AND enabled = true`,
    [appId],
  );
  const row = rows[0];
  if (!row) return null;
  // Concrete app adapters land in later stages; absence of tokenManager is a graceful skip.
  return { appId: row.app_id, appType: row.app_type, displayName: row.display_name };
}

function normalizeRefreshResult(result: TokenRefreshResult): TokenRefreshResult {
  if (!result || typeof result !== 'object') {
    throw new Error('Token refresh returned no persisted token payload');
  }
  if (typeof result.accessToken !== 'string' || result.accessToken.length === 0) {
    throw new Error('Token refresh returned an empty access token');
  }
  const expiresAt = result.expiresAt instanceof Date ? result.expiresAt : new Date(result.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error('Token refresh returned an invalid expiry');
  }
  return { ...result, expiresAt };
}

export async function tokenRefreshWorkerHandler(
  ctx: OperationContext,
  _job: { data: unknown },
): Promise<{ refreshed: number; skipped: number; errors: number }> {
  const rows = await ctx.engine.executeRaw<TokenRow>(
    `SELECT app_id, token_kind, scope_key, expires_at
     FROM enterprise_oauth_tokens
     WHERE expires_at > now()
       AND expires_at < now() + INTERVAL '30 minutes'
     ORDER BY expires_at ASC
     LIMIT $1`,
    [TOKEN_REFRESH_BATCH_LIMIT],
  );

  let refreshed = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const app = await loadEnterpriseApp(ctx, row.app_id);
      if (!app?.tokenManager) {
        skipped += 1;
        continue;
      }

      const refreshResult = normalizeRefreshResult(
        await app.tokenManager.refresh(row.token_kind, row.scope_key),
      );

      await ctx.engine.executeRaw(
        `UPDATE enterprise_oauth_tokens
         SET access_token = $4,
             refresh_token = COALESCE($5, refresh_token),
             expires_at = $6::timestamptz,
             scopes = COALESCE($7::text[], scopes),
             metadata = metadata || $8::jsonb
         WHERE app_id = $1 AND token_kind = $2 AND scope_key = $3`,
        [
          row.app_id,
          row.token_kind,
          row.scope_key,
          encrypt(refreshResult.accessToken),
          refreshResult.refreshToken === undefined ? null : encrypt(refreshResult.refreshToken),
          (refreshResult.expiresAt as Date).toISOString(),
          refreshResult.scopes ?? null,
          JSON.stringify(refreshResult.metadata ?? {}),
        ],
      );
      refreshed += 1;
    } catch (error) {
      errors += 1;
      ctx.logger.warn(
        `ebrain token refresh failed for ${row.app_id}/${row.token_kind}/${row.scope_key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { refreshed, skipped, errors };
}
