---
name: risk-signal-detector
version: 0.1.0
description: Cross-source risk signal aggregator for executive escalation across facts, takes, conflicts, and anomalies.
triggers:
  - "enterprise risk signal"
  - "risk signal detector"
  - "show revenue churn risks"
  - "detect cross source conflicts"
  - "客户风险信号"
mutating: true
writes_pages: true
writes_to:
  - signals/risk/
---

# risk-signal-detector — Enterprise Risk Signal Aggregator

> Convention: follow `../_brain-filing-rules.md` and `../_output-rules.md`.
> This skill writes ranked risk synthesis under `signals/risk/` and never
> upgrades weak evidence into an incident without corroboration.

## Contract

Detect cross-source enterprise risk signals from facts, recent takes, conflict
rows, anomaly rows, and customer or team evidence. The output is an executive
triage list sorted by severity with a concrete next step for each item.

## Inputs

- `window`: time window, default `24h`.
- `executive_id`: optional profile scope; omit only for company-wide scan.
- `sources`: enterprise source ids to include or exclude.
- `facts`: typed fact rows, including metric claims with period and unit.
- `takes`: recent belief rows with holder attribution.
- `conflicts`: output from `detect_enterprise_conflicts`.
- `anomalies`: output from `find_anomalies`.

## Trigger Boundary

Use this skill for risk triage, contradiction scan, KPI movement, revenue
churn warnings, customer escalation risk, compliance uncertainty, or team
execution signals. Do not use it for customer-only health scoring; that is
`customer-escalation-radar`. Do not use it for competitor monitoring.

## Data Collection

1. Resolve the time window and executive scope.
2. Call `detect_enterprise_conflicts` for cross-source contradictions.
3. Call `find_anomalies` for KPI deltas, support bursts, or activity gaps.
4. Call `recall` for recent facts and takes that mention revenue, customers,
   support, delivery, hiring, finance, incidents, or exec-owned functions.
5. Normalize all evidence into candidate signals with source, timestamp,
   severity, confidence, and next owner.
6. Send only redacted evidence summaries to the Sonnet subagent.

## Operations Plan

- `detect_enterprise_conflicts` for fact disagreements across SaaS sources.
- `find_anomalies` for numeric and activity spikes in the selected window.
- `recall --since <window> --json` for fact and take context.
- `think` with model `claude-sonnet-4-6` to cluster and rank the evidence.

## Script

`skills/risk-signal-detector/scripts/risk-signal-detector.mjs` builds the
retrieval plan, severity sort, prompt, filing target, and a markdown report. It
is deterministic by default and can be used by a future job runner as a dry-run
planner before dispatching the real subagent.

```bash
bun skills/risk-signal-detector/scripts/risk-signal-detector.mjs '{"window":"24h"}'
```

## Severity Rubric

- `critical`: active revenue loss, security/compliance exposure, or executive
  customer escalation with no owner.
- `high`: likely churn, severe metric movement, unresolved contradiction in a
  decision-critical value, or deadline miss affecting a customer.
- `medium`: early warning with partial evidence or limited blast radius.
- `low`: weak signal that should be watched but not escalated today.

## Model Prompt Rules

- Model: `claude-sonnet-4-6` in subagent mode.
- Treat conflicts and anomalies as inputs, not conclusions.
- State why each signal received its severity.
- Keep holder attribution from takes.
- Prefer actionable uncertainty over overconfident categorization.
- Never list a risk without a next step and likely owner.

## Required Output

The report is markdown with a sorted list. Each item contains:

- severity
- signal title
- evidence summary
- affected customer, team, metric, or source
- confidence
- recommended next action

Use a table only when it improves scan speed. If no risks are detected, output
`No material risk detected in the selected window` plus the data coverage and
sources checked.

## Filing

- Write final pages to `signals/risk/{YYYY-MM-DD}-{window}-{scope}`.
- Include frontmatter: `window`, `executive_id`, `source_ids`, `risk_count`,
  `max_severity`, and `generated_by: risk-signal-detector`.
- Link back to customer or company pages only through deterministic slugs.
- Keep raw conflict and anomaly payloads outside the markdown unless redacted.

## Quality Bar

- Sorted severity is deterministic and stable for equal severities.
- Conflicts and anomalies remain distinguishable in the evidence field.
- Each critical or high item has an owner or an owner gap.
- Every metric includes period and unit when available.
- Report distinguishes real observed data from synthetic fixtures.
- Script output includes `operations`, `subagent`, `filing`, and `markdown`.

## Anti-Patterns

- Do not call every anomaly a risk.
- Do not hide contradictory evidence to make the story cleaner.
- Do not recommend a generic "monitor" action for high severity items.
- Do not claim customer churn when the only evidence is missing data.
- Do not route customer-only health tables here when the radar skill fits.

## Routing Eval

Fixtures live in `routing-eval.jsonl` and use paraphrases around the resolver
phrase `enterprise risk signal`. The goal is resolver reachability without
colliding with generic investigation or data-research skills.

## Contract

This skill guarantees a severity-ranked risk report under `signals/risk/`,
grounded in enterprise conflict, anomaly, fact, and take evidence.

## Output Format

Return JSON from the script with `{skill, model, operations, subagent, filing,
markdown}`. The durable artifact is the `markdown` field.
