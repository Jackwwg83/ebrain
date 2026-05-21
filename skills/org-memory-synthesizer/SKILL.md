---
name: org-memory-synthesizer
version: 0.1.0
description: Cross-team org memory synthesis from meetings, decisions, and repeated take patterns.
triggers:
  - "org memory synthesizer"
  - "cross team memory synthesis"
  - "synthesize org memory"
  - "team decision memory"
  - "组织记忆综合"
mutating: true
writes_pages: true
writes_to:
  - synthesis/org-memory/
---

# org-memory-synthesizer — Cross-Team Org Memory Synthesis

> Convention: follow `../_brain-filing-rules.md` and `../_output-rules.md`.
> This is an I1 thin-shell skill: the routing contract, filing contract, and
> prompt shape are documented now, while the deterministic script remains the
> scaffold placeholder for a later implementation stage.

## Status

This skill is intentionally not fully implemented in I1. It exists so agents
can route correctly, understand the future workflow, and avoid inventing a
custom one-off process before the real implementation lands.

## Contract

Synthesize cross-team memory from meetings and decisions while preserving who believed what, which decisions are durable, and what changed. The later full skill should prevent repeated organizational amnesia.

## Inputs

- `window` or `period`: the time period to analyze.
- `executive_id`: optional executive scope.
- `source_ids`: enterprise data sources already available to the caller.
- `facts`: typed fact rows that are relevant to this skill.
- `takes`: recent takes with holder attribution preserved.
- `metrics`: optional numeric metrics with period and unit.
- `constraints`: explicit user constraints, board preferences, or redaction rules.

## Trigger Boundary

Use this skill for: cross-team decision history, repeated meeting themes, org-memory summaries, unresolved dependency synthesis, and team context refreshes.

Do not use this skill for generic search, daily personal briefings, raw data
imports, or one-off prose polishing. If the question is primarily about risk,
customer escalation, or daily operating state, route to one of the three full
I1 skills instead.

## Future Data Collection

1. Resolve executive, period, and source scope.
2. Read relevant enterprise facts and takes through `recall`.
3. Pull metric deltas only when the caller provides them or a trusted op returns
   them.
4. Ask `think` or a subagent to synthesize only after evidence is assembled.
5. Label missing sources as data gaps instead of filling them with guesses.
6. Preserve holder attribution from takes and period/unit metadata from facts.

## Model Intent

The later implementation should use `claude-sonnet-4-6` in subagent mode for
reasoned synthesis. It should receive a compact, redacted evidence packet and a
strict output schema. It should not receive secrets, raw customer payloads, or
private production rows without redaction.

## Output Shape

Markdown with `## Durable Decisions`, `## Repeated Themes`, `## Open Loops`, `## Owners`, and `## Source Trail`.

## Filing

- Write durable synthesis under `synthesis/org-memory/`.
- Include frontmatter: `generated_by: org-memory-synthesizer`, `period`, `executive_id`,
  `source_ids`, and a count of evidence rows used.
- Keep raw source data in the original source pages or database rows.
- Cross-link companies, people, or projects only through deterministic slugs.
- If the output is synthetic or fixture-derived, label it explicitly.

## Quality Bar

- The final output must contain evidence-backed claims only.
- Metrics need unit and period.
- Missing evidence must be marked as a data gap.
- Recommendations must name a next action or decision owner.
- Public artifacts must use generic placeholders and avoid real names.
- The script remains a placeholder in I1 and should not be presented as live.

## Routing Eval

`routing-eval.jsonl` contains at least ten paraphrased fixtures for the resolver
phrase `org memory synthesizer`. Fixtures include context around the trigger so they
are not verbatim copies of the resolver row.

## Implementation Notes

- Keep the generated `.mjs` placeholder until the owning stage implements the
  deterministic helper.
- Do not add dependencies for this shell.
- Do not modify `src/core/` or `src/mcp/` to support this shell.
- Prefer a thin vertical slice when the shell graduates to a full skill.
- Future tests should replace the scaffold placeholder test with real cases.

## Anti-Patterns

- Do not silently route to a nearby full skill just because this shell is not
  implemented.
- Do not fabricate board, finance, competitor, allocation, or org-memory facts.
- Do not write into a different namespace than `synthesis/org-memory/`.
- Do not expose private customer or employee names in public examples.
- Do not claim the script has run a live LLM call in I1.

## Related Skills

- `skills/executive-daily-brief/SKILL.md`
- `skills/risk-signal-detector/SKILL.md`
- `skills/customer-escalation-radar/SKILL.md`

## Contract

This shell guarantees resolver reachability, frontmatter completeness, filing
intent, and a documented future workflow. It does not guarantee deterministic
execution until the placeholder script is replaced.

## Output Format

The future script should return JSON with `{skill, model, operations, subagent,
filing, markdown}`. In I1, only this SKILL.md and routing fixtures are real.
