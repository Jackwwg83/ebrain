import type { BrainEngine } from '../core/engine.ts';
import {
  auditExecutive,
  createExecutive,
  listExecutiveProfiles,
  updateExecutive,
  type CreateExecutiveParams,
  type UpdateExecutivePatch,
} from '../ebrain/executives/index.ts';

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function usage(): string {
  return `Usage:
  gbrain executives create <id> --email <email> --name <name> --role <role> [--soul-path <path>]
  gbrain executives list
  gbrain executives validate <id>
  gbrain executives update <id> --field value

Update fields:
  --email --name --display-name --role --soul-path --timezone --locale --department
  --deputies a,b --feishu-user-id --dingtalk-user-id --wecom-user-id
  --preferences '{"key":"value"}' --push-preferences '{"key":"value"}' --active true`;
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
  return value;
}

function optionalString(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function nullableString(flags: Record<string, string | boolean>, key: string): string | null | undefined {
  const value = optionalString(flags, key);
  if (value === undefined) return undefined;
  return value === 'null' ? null : value;
}

function parseJsonObject(value: string | undefined, flagName: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`--${flagName} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function parseBoolean(value: string | undefined, flagName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`--${flagName} must be true or false`);
}

function parseCsv(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  if (!value.trim()) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function resolveRepoRoot(engine: BrainEngine): Promise<string> {
  try {
    return (await engine.getConfig('sync.repo_path')) || process.cwd();
  } catch {
    return process.cwd();
  }
}

function defaultSoulPath(executiveId: string): string {
  return `executives/${executiveId}/SOUL.md`;
}

async function runCreate(engine: BrainEngine, args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const id = parsed.positionals[0];
  if (!id) throw new Error('missing executive id');

  const params: CreateExecutiveParams = {
    executiveId: id,
    email: requireString(parsed.flags, 'email'),
    displayName: requireString(parsed.flags, 'name'),
    role: requireString(parsed.flags, 'role'),
    soulPath: 'soul-path' in parsed.flags
      ? requireString(parsed.flags, 'soul-path')
      : defaultSoulPath(id),
    timezone: optionalString(parsed.flags, 'timezone'),
    locale: optionalString(parsed.flags, 'locale'),
    department: nullableString(parsed.flags, 'department'),
    deputies: parseCsv(optionalString(parsed.flags, 'deputies')),
    feishuUserId: nullableString(parsed.flags, 'feishu-user-id'),
    dingtalkUserId: nullableString(parsed.flags, 'dingtalk-user-id'),
    wecomUserId: nullableString(parsed.flags, 'wecom-user-id'),
    preferences: parseJsonObject(optionalString(parsed.flags, 'preferences'), 'preferences'),
    pushPreferences: parseJsonObject(optionalString(parsed.flags, 'push-preferences'), 'push-preferences'),
    active: parseBoolean(optionalString(parsed.flags, 'active'), 'active'),
  };

  const profile = await createExecutive(engine, params);
  console.log(`created executive ${profile.executiveId}`);
}

async function runList(engine: BrainEngine): Promise<void> {
  const profiles = await listExecutiveProfiles(engine);
  if (profiles.length === 0) {
    console.log('No active executives.');
    return;
  }
  for (const profile of profiles) {
    console.log([
      profile.executiveId,
      profile.email,
      profile.displayName,
      profile.role,
      profile.timezone ?? '',
    ].join('\t'));
  }
}

async function runValidate(engine: BrainEngine, args: string[]): Promise<number> {
  const id = args[0];
  if (!id) throw new Error('missing executive id');

  const result = await auditExecutive(engine, id, { rootDir: await resolveRepoRoot(engine) });
  if (!result.profile) {
    console.error(`executive not found: ${id}`);
    return 1;
  }

  for (const file of result.files) {
    console.log(`${file.exists ? 'PASS' : 'FAIL'} ${file.label} ${file.path}`);
  }
  return result.ok ? 0 : 1;
}

function buildUpdatePatch(flags: Record<string, string | boolean>): UpdateExecutivePatch {
  const patch: UpdateExecutivePatch = {
    email: optionalString(flags, 'email'),
    displayName: optionalString(flags, 'display-name') ?? optionalString(flags, 'name'),
    role: optionalString(flags, 'role'),
    soulPath: optionalString(flags, 'soul-path'),
    timezone: optionalString(flags, 'timezone'),
    locale: optionalString(flags, 'locale'),
    department: nullableString(flags, 'department'),
    deputies: parseCsv(optionalString(flags, 'deputies')),
    feishuUserId: nullableString(flags, 'feishu-user-id'),
    dingtalkUserId: nullableString(flags, 'dingtalk-user-id'),
    wecomUserId: nullableString(flags, 'wecom-user-id'),
    preferences: parseJsonObject(optionalString(flags, 'preferences'), 'preferences'),
    pushPreferences: parseJsonObject(optionalString(flags, 'push-preferences'), 'push-preferences'),
    active: parseBoolean(optionalString(flags, 'active'), 'active'),
  };

  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as UpdateExecutivePatch;
}

async function runUpdate(engine: BrainEngine, args: string[]): Promise<number> {
  const parsed = parseArgs(args);
  const id = parsed.positionals[0];
  if (!id) throw new Error('missing executive id');

  const profile = await updateExecutive(engine, id, buildUpdatePatch(parsed.flags));
  if (!profile) {
    console.error(`executive not found: ${id}`);
    return 1;
  }
  console.log(`updated executive ${profile.executiveId}`);
  return 0;
}

export async function runExecutives(engine: BrainEngine, args: string[]): Promise<number> {
  const [subcommand, ...rest] = args;
  try {
    switch (subcommand) {
      case 'create':
        await runCreate(engine, rest);
        return 0;
      case 'list':
        await runList(engine);
        return 0;
      case 'validate':
        return await runValidate(engine, rest);
      case 'update':
        return await runUpdate(engine, rest);
      case undefined:
      case '--help':
      case '-h':
        console.log(usage());
        return 0;
      default:
        throw new Error(`unknown executives subcommand: ${subcommand}`);
    }
  } catch (err) {
    console.error((err as Error).message);
    console.error('');
    console.error(usage());
    return 1;
  }
}
