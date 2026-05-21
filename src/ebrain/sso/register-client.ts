import type { GBrainOAuthProvider } from '../../core/oauth-provider.ts';
import type { BrainEngine } from '../../core/engine.ts';
import { loadExecutiveProfile } from '../executives/load-profile.ts';

export interface RegisterEbrainClientParams {
  name: string;
  grantTypes: string[];
  scopes: string;
  redirectUris?: string[];
  sourceId?: string;
  federatedRead?: string[];
  executiveId: string;
}

export async function registerEbrainClient(
  provider: GBrainOAuthProvider,
  engine: BrainEngine,
  params: RegisterEbrainClientParams,
) {
  const executiveId = params.executiveId?.trim();
  if (!executiveId) {
    throw new Error('executive_id is required for ebrain OAuth clients');
  }

  const profile = await loadExecutiveProfile(engine, executiveId);
  if (!profile) {
    throw new Error(`executive '${executiveId}' not found`);
  }

  return provider.registerClientManual(
    params.name,
    params.grantTypes,
    params.scopes,
    params.redirectUris ?? [],
    params.sourceId ?? 'default',
    params.federatedRead,
    executiveId,
  );
}
