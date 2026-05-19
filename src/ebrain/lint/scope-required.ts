import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ScopeRequiredOptions {
  opsDir?: string;
  stderr?: Pick<typeof console, 'error'>;
}

export type RequiredOpField = 'scope' | 'localOnly';

export interface OpFieldViolation {
  file: string;
  missing: RequiredOpField[];
}

function isPlaceholder(content: string): boolean {
  return /export\s*\{\s*\}\s*;?\s*$/.test(content) && !/\b(?:scope|localOnly)\s*:/.test(content);
}

function isOperationCandidate(content: string): boolean {
  return /export\s+const\s+\w+/.test(content) || /\bOperation\b/.test(content) || /\bhandler\b/.test(content);
}

function missingRequiredFields(content: string): RequiredOpField[] {
  const missing: RequiredOpField[] = [];
  if (!/\bscope\s*:/.test(content)) missing.push('scope');
  if (!/\blocalOnly\s*:/.test(content)) missing.push('localOnly');
  return missing;
}

export function findOpFieldViolations(opsDir = join(process.cwd(), 'src/ebrain/ops')): OpFieldViolation[] {
  if (!existsSync(opsDir)) return [];

  const violations: OpFieldViolation[] = [];
  for (const entry of readdirSync(opsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'index.ts') continue;
    const path = join(opsDir, entry.name);
    const content = readFileSync(path, 'utf8');
    if (isPlaceholder(content) || !isOperationCandidate(content)) continue;
    const missing = missingRequiredFields(content);
    if (missing.length > 0) violations.push({ file: path, missing });
  }
  return violations;
}

export function findScopeViolations(opsDir = join(process.cwd(), 'src/ebrain/ops')): string[] {
  return findOpFieldViolations(opsDir).map((violation) => violation.file);
}

export async function main(options: ScopeRequiredOptions = {}): Promise<number> {
  const violations = findOpFieldViolations(options.opsDir);
  if (violations.length === 0) return 0;

  const stderr = options.stderr ?? console;
  for (const violation of violations) {
    stderr.error(`[ebrain/scope-required] missing ${violation.missing.join(', ')}: ${violation.file}`);
  }
  return 1;
}

if (import.meta.main) {
  const code = await main();
  if (code !== 0) process.exit(code);
}
