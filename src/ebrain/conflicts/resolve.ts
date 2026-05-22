import type { BrainEngine } from '../../core/engine.ts';

export type ConflictResolutionAction = 'resolve' | 'skip' | 'defer';

interface ConflictRow {
  id: string;
  entity_slug: string;
  fact_key: string;
  competing_values: unknown;
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function resolveFactConflict(
  engine: BrainEngine,
  conflictId: string | number,
  winningValue: unknown,
  note = '',
  opts: { action?: ConflictResolutionAction; resolvedByExecutiveId?: string | null } = {},
): Promise<{ status: string; entity_slug: string; fact_key: string; winning_value?: unknown }> {
  const action = opts.action ?? 'resolve';
  if (!['resolve', 'skip', 'defer'].includes(action)) throw new Error('invalid conflict resolution action');

  return engine.transaction(async (tx) => {
    const rows = await tx.executeRaw<ConflictRow>(
      `SELECT id::text, entity_slug, fact_key, competing_values
         FROM enterprise_fact_conflicts
        WHERE id = $1
        LIMIT 1`,
      [String(conflictId)],
    );
    const conflict = rows[0];
    if (!conflict) throw new Error(`fact conflict ${String(conflictId)} not found`);

    const status = action === 'resolve' ? 'resolved' : action === 'skip' ? 'ignored' : 'deferred';
    await tx.executeRaw(
      `UPDATE enterprise_fact_conflicts
          SET status = $2,
              winning_value = CASE WHEN $2 = 'resolved' THEN $3::jsonb ELSE winning_value END,
              resolved_at = now(),
              resolved_by_executive_id = $4,
              resolver_note = $5
        WHERE id = $1`,
      [String(conflictId), status, JSON.stringify(winningValue ?? null), opts.resolvedByExecutiveId ?? null, note],
    );

    if (action === 'resolve') {
      const page = await tx.getPage(conflict.entity_slug);
      if (!page) throw new Error(`entity page ${conflict.entity_slug} not found`);
      const frontmatter = { ...parseJsonRecord(page.frontmatter) };
      const compiledTruth = parseJsonRecord(frontmatter.compiled_truth);
      frontmatter.compiled_truth = {
        ...compiledTruth,
        [conflict.fact_key]: winningValue,
      };
      await tx.putPage(page.slug, {
        type: page.type,
        title: page.title,
        compiled_truth: page.compiled_truth,
        timeline: page.timeline,
        frontmatter,
      }, { sourceId: page.source_id });
    }

    return {
      status,
      entity_slug: conflict.entity_slug,
      fact_key: conflict.fact_key,
      ...(action === 'resolve' ? { winning_value: winningValue } : {}),
    };
  });
}
