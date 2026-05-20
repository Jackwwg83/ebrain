import { createHash } from 'node:crypto';

export interface ConflictHashValue {
  value: unknown;
  sourceType: string;
}

export interface ConflictHashArgs {
  entitySlug: string;
  factKey: string;
  values: ConflictHashValue[];
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;

  const record = value as Record<string, unknown>;
  const fields = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`);
  return `{${fields.join(',')}}`;
}

export function computeConflictHash(args: ConflictHashArgs): string {
  const valueFingerprint = args.values
    .map((value) => `${value.sourceType}|${stableJson(value.value)}`)
    .sort()
    .join(';');
  const canonical = `${args.entitySlug}:${args.factKey}:${valueFingerprint}`;
  return createHash('sha256').update(canonical).digest('hex');
}
