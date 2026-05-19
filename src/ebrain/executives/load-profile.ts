import type { BrainEngine } from '../../core/engine.ts';
import type { ExecutiveProfile } from '../types.ts';

type ExecutiveProfileLoader = (
  engine: BrainEngine,
  executiveId: string,
) => Promise<ExecutiveProfile | null>;

let testLoader: ExecutiveProfileLoader | null = null;

/**
 * Stub executive-profile loader.
 *
 * A4 wires the dispatch hook and deliberately returns null for MVP runtime
 * behavior. Stage E1 replaces this with the real DB-backed profile load.
 */
export async function loadExecutiveProfile(
  engine: BrainEngine,
  executiveId: string,
): Promise<ExecutiveProfile | null> {
  if (testLoader) return testLoader(engine, executiveId);
  return null;
}

export function _setLoadExecutiveProfileForTest(loader: ExecutiveProfileLoader | null): void {
  testLoader = loader;
}
