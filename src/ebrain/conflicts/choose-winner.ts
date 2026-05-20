export interface CompetingValue {
  value: unknown;
  sourceType?: string;
  source_type?: string;
  confidence?: number | null;
  factKey?: string;
  fact_key?: string;
}

export interface ChooseWinningClaimArgs {
  values: CompetingValue[];
  factAuthority?: Record<string, string[]>;
  factKey?: string;
}

export interface WinningClaim {
  winningValue: unknown;
  winningSource: string;
}

function sourceType(value: CompetingValue): string {
  return value.sourceType ?? value.source_type ?? '';
}

function factKey(value: CompetingValue): string | undefined {
  return value.factKey ?? value.fact_key;
}

function sameJsonValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function authorityOrder(args: ChooseWinningClaimArgs): string[] | null {
  const authority = args.factAuthority;
  if (!authority) return null;

  if (args.factKey && authority[args.factKey]) return authority[args.factKey];

  const valueFactKeys = new Set(args.values.map(factKey).filter((key): key is string => Boolean(key)));
  if (valueFactKeys.size === 1) {
    const [key] = valueFactKeys;
    if (key && authority[key]) return authority[key];
  }

  const entries = Object.values(authority);
  if (entries.length === 1) return entries[0] ?? null;
  return null;
}

export function chooseWinningClaim(args: ChooseWinningClaimArgs): WinningClaim | null {
  if (args.values.length === 0) return null;
  if (args.values.length === 1) {
    const only = args.values[0];
    return { winningValue: only.value, winningSource: sourceType(only) };
  }

  const order = authorityOrder(args);
  if (order && order.length > 0) {
    for (const authoritySource of order) {
      const matches = args.values.filter((value) => sourceType(value) === authoritySource);
      if (matches.length === 0) continue;

      const first = matches[0];
      if (matches.every((value) => sameJsonValue(value.value, first.value))) {
        return { winningValue: first.value, winningSource: authoritySource };
      }
      return null;
    }
  }

  const ranked = args.values
    .map((value) => ({ value, confidence: value.confidence ?? 0 }))
    .sort((a, b) => b.confidence - a.confidence);
  const best = ranked[0];
  const tied = ranked.filter((entry) => entry.confidence === best.confidence);
  if (tied.length !== 1) return null;

  return {
    winningValue: best.value.value,
    winningSource: sourceType(best.value),
  };
}
