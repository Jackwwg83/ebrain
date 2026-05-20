/**
 * OAuth token kinds persisted by `enterprise_oauth_tokens.token_kind`.
 * Keep this in lockstep with the v200 CHECK constraint.
 */
export type TokenKind = 'tenant_access' | 'user_access' | 'app_access' | 'refresh';

export interface TokenManager {
  /**
   * Return a usable token for the given kind.
   *
   * `scope` is vendor-specific but tier-stable: tenant tokens use a tenant id,
   * user tokens use a user id, and app-level tokens may use the literal `app`.
   */
  getToken(kind: TokenKind, scope?: string): Promise<string>;

  /**
   * Refresh the selected token scope. The same scope convention as `getToken`
   * applies: tenant id, user id, or `app`.
   */
  refresh(kind: TokenKind, scope?: string): Promise<void>;

  /**
   * Report whether the selected token scope should be refreshed before use.
   * The same scope convention as `getToken` applies.
   */
  isExpired(kind: TokenKind, scope?: string): Promise<boolean>;
}
