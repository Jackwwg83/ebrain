import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ScopeRequiredOptions {
  opsDir?: string;
  stderr?: Pick<typeof console, 'error'>;
}

function isPlaceholder(content: string): boolean {
  return /export\s*\{\s*\}\s*;?\s*$/.test(content) && !/\bscope\s*:/.test(content);
}

function isOperationCandidate(content: string): boolean {
  return /export\s+const\s+\w+/.test(content) || /\bOperation\b/.test(content) || /\bhandler\b/.test(content);
}

export function findScopeViolations(opsDir = join(process.cwd(), 'src/ebrain/ops')): string[] {
  if (!existsSync(opsDir)) return [];

  const violations: string[] = [];
  for (const entry of readdirSync(opsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'index.ts') continue;
    const path = join(opsDir, entry.name);
    const content = readFileSync(path, 'utf8');
    if (isPlaceholder(content) || !isOperationCandidate(content)) continue;
    if (!/\bscope\s*:/.test(content)) violations.push(path);
  }
  return violations;
}

export async function main(options: ScopeRequiredOptions = {}): Promise<number> {
  const violations = findScopeViolations(options.opsDir);
  if (violations.length === 0) return 0;

  const stderr = options.stderr ?? console;
  for (const file of violations) {
    stderr.error(`[ebrain/scope-required] missing scope: ${file}`);
  }
  return 1;
}

if (import.meta.main) {
  const code = await main();
  if (code !== 0) process.exit(code);
}
