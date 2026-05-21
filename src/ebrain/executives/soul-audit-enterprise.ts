import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { BrainEngine } from '../../core/engine.ts';
import type { ExecutiveProfile } from '../types.ts';
import { loadExecutiveProfile } from './load-profile.ts';

export interface ExecutiveAuditFile {
  label: 'SOUL' | 'USER' | 'AGENT_PERSONA' | 'PREFERENCES';
  path: string;
  exists: boolean;
}

export interface ExecutiveAuditResult {
  executiveId: string;
  ok: boolean;
  profile: ExecutiveProfile | null;
  files: ExecutiveAuditFile[];
}

function resolveProfilePath(path: string, rootDir?: string): string {
  return isAbsolute(path) ? path : join(rootDir ?? process.cwd(), path);
}

export async function auditExecutive(
  engine: BrainEngine,
  executiveId: string,
  options: { rootDir?: string } = {},
): Promise<ExecutiveAuditResult> {
  const profile = await loadExecutiveProfile(engine, executiveId);
  if (!profile) {
    return {
      executiveId,
      ok: false,
      profile: null,
      files: [],
    };
  }

  const requiredFiles: ExecutiveAuditFile[] = [
    { label: 'SOUL', path: profile.soulPath, exists: false },
    { label: 'USER', path: profile.userPath, exists: false },
    { label: 'AGENT_PERSONA', path: profile.agentPersonaPath, exists: false },
    { label: 'PREFERENCES', path: profile.preferencesPath, exists: false },
  ];

  const checks = requiredFiles.map((file) => ({
    ...file,
    exists: existsSync(resolveProfilePath(file.path, options.rootDir)),
  }));

  return {
    executiveId,
    ok: checks.every((file) => file.exists),
    profile,
    files: checks,
  };
}
