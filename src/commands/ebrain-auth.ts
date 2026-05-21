import type { BrainEngine } from '../core/engine.ts';
import { sqlQueryForEngine } from '../core/sql-query.ts';
import { GBrainOAuthProvider } from '../core/oauth-provider.ts';
import { registerEbrainClient } from '../ebrain/sso/register-client.ts';

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

export function ebrainAuthUsage(): string {
  return `Usage:
  gbrain ebrain register-client <name> --executive-id <id> [--grant-types G] [--scopes S] [--source SOURCE] [--redirect-uris URI1,URI2] [--federated-read SRC1,SRC2,...]`;
}

function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i++;
  }

  return { positionals, flags };
}

function requireString(flags: Record<string, string | boolean>, key: string): string {
  const value = flags[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`missing required --${key}`);
  }
  return value.trim();
}

function optionalString(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function parseCsv(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function runRegisterClient(engine: BrainEngine, args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const name = parsed.positionals[0];
  if (!name) throw new Error('missing client name');

  const executiveId = requireString(parsed.flags, 'executive-id');
  const grantTypes = parseCsv(optionalString(parsed.flags, 'grant-types')) ?? ['client_credentials'];
  const scopes = optionalString(parsed.flags, 'scopes') ?? 'read';
  const sourceId = optionalString(parsed.flags, 'source') ?? 'default';
  const redirectUris = parseCsv(optionalString(parsed.flags, 'redirect-uris')) ?? [];
  const federatedRead = parseCsv(optionalString(parsed.flags, 'federated-read'));
  const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
  const { clientId, clientSecret } = await registerEbrainClient(provider, engine, {
    name,
    grantTypes,
    scopes,
    redirectUris,
    sourceId,
    federatedRead,
    executiveId,
  });
  const effectiveFederated = federatedRead && federatedRead.length > 0 ? federatedRead : [sourceId];

  console.log(`Ebrain OAuth client registered: "${name}"\n`);
  console.log(`  Client ID:        ${clientId}`);
  console.log(`  Client Secret:    ${clientSecret}\n`);
  console.log(`  Executive ID:     ${executiveId}`);
  console.log(`  Grant types:      ${grantTypes.join(', ')}`);
  console.log(`  Scopes:           ${scopes}`);
  console.log(`  Write source:     ${sourceId}`);
  console.log(`  Federated reads:  ${effectiveFederated.join(', ')}\n`);
  console.log('Save the client secret - it will not be shown again.');
  console.log(`Revoke with: gbrain auth revoke-client "${clientId}"`);
}

export async function runEbrainAuth(engine: BrainEngine, args: string[]): Promise<number> {
  const [subcommand, ...rest] = args;
  try {
    switch (subcommand) {
      case 'register-client':
        await runRegisterClient(engine, rest);
        return 0;
      case undefined:
      case '--help':
      case '-h':
        console.log(ebrainAuthUsage());
        return 0;
      default:
        throw new Error(`unknown ebrain subcommand: ${subcommand}`);
    }
  } catch (err) {
    console.error((err as Error).message);
    console.error('');
    console.error(ebrainAuthUsage());
    return 1;
  }
}
