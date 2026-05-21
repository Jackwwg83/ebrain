import { GBrainOAuthProvider, type SqlQuery } from '../../core/oauth-provider.ts';

export interface BindExecutiveResult {
  clientId: string;
  executiveId: string;
}

export async function bindExecutiveToClient(
  sql: SqlQuery,
  clientId: string,
  executiveId: string,
): Promise<BindExecutiveResult> {
  const provider = new GBrainOAuthProvider({ sql });
  return provider.bindExecutiveToClient(clientId, executiveId);
}
