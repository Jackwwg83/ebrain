---
name: customer-escalation-radar
version: 0.1.0
description: High-value customer health and escalation early-warning system using customer facts, takes, experts, and recent activity.
triggers:
  - "customer escalation radar"
  - "high value customer risk"
  - "customer churn warning"
  - "customer health radar"
  - "客户升级预警"
mutating: true
writes_pages: true
writes_to:
  - signals/customer/
---

# customer-escalation-radar — High-Value Customer Early Warning

> Convention: follow `../_brain-filing-rules.md` and `../_output-rules.md`.
> This skill writes customer health synthesis under `signals/customer/` and
> keeps customer names redacted unless deterministic internal slugs are present.

## Contract

Identify customer escalation and churn signals for high-value segments by
combining customer facts, recent takes, support indicators, product or delivery
signals, and expert ownership. The output is a markdown table with risk score,
indicators, and recommended action.

## Inputs

- `window`: default `7d`.
- `segment`: optional segment such as enterprise, strategic, renewal, or named
  account list.
- `customers`: optional customer rows with MRR, ARR, renewal date, owner, and
  segment.
- `facts`: customer-related facts from CRM, support, meeting, doc, or IM data.
- `takes`: recent customer beliefs with holder attribution.
- `experts`: output from `find_experts` when available.
- `activity`: optional ticket, NPS, usage, or meeting deltas.

## Trigger Boundary

Use this skill when the user asks which customers need attention, where churn
signals are forming, which strategic accounts are unhealthy, or what support
spikes imply. Do not use it for broad company risk triage; route that to
`risk-signal-detector`.

## Data Collection

1. Resolve segment and time window.
2. Call `recall` for customer facts and takes in the selected window.
3. Call `find_experts` for account owners, support leads, solution engineers,
   and relationship holders.
4. Pull known activity metrics when provided by the caller or retrieved context.
5. Build per-customer indicators with source, timestamp, and confidence.
6. Send redacted customer summaries to Sonnet for prioritization.

## Operations Plan

- `recall --since <window> --grep customer --json` for customer evidence.
- `find_experts` for likely owner and escalation path.
- `think` with model `claude-sonnet-4-6` for ranking and action selection.
- Optional `enterprise_ingest_status` to mark CRM/support source gaps.

## Script

`skills/customer-escalation-radar/scripts/customer-escalation-radar.mjs` builds
a retrieval plan, customer score table, Sonnet prompt, filing target, and safe
markdown draft. The script is deterministic and does not call external services
unless a later runner consumes the returned `subagent` payload.

```bash
bun skills/customer-escalation-radar/scripts/customer-escalation-radar.mjs '{"window":"7d","segment":"strategic"}'
```

## Risk Score Rubric

- 90-100: active escalation, executive sponsor risk, or renewal/churn threat.
- 70-89: multiple indicators across support, usage, relationship, or revenue.
- 40-69: one strong signal or several weak signals needing owner review.
- 0-39: no material health issue in the available evidence.

## Model Prompt Rules

- Model: `claude-sonnet-4-6` in subagent mode.
- Preserve customer identifiers only as approved slugs or redacted labels.
- Do not infer NPS, support volume, or churn probability when absent.
- Explain the score with observable indicators.
- Recommend one owner action per customer.
- Label source gaps separately from customer risk.

## Required Output

The report is markdown table with these columns:

| Customer | Risk score | Indicators | Recommended action |
|---|---:|---|---|

Include a short `## Coverage` note after the table listing sources checked,
source gaps, and whether customer names were redacted.

## Filing

- Write final pages to `signals/customer/{YYYY-MM-DD}-{segment}-{window}`.
- Include frontmatter: `window`, `segment`, `customer_count`, `max_risk_score`,
  `source_ids`, and `generated_by: customer-escalation-radar`.
- Back-link customer pages only when deterministic customer slugs exist.
- Keep raw ticket and customer payloads out of the markdown unless redacted.

## Quality Bar

- Every table row has at least one indicator or explicit data gap.
- Recommended action names an owner role when the person is unknown.
- Risk score is monotonic with the severity and count of indicators.
- Strategic and high-value customers appear before low-value accounts when
  scores tie.
- Script output includes `operations`, `subagent`, `filing`, and `markdown`.

## Anti-Patterns

- Do not equate one angry ticket with churn without corroboration.
- Do not expose customer names when the caller passed redacted labels.
- Do not bury renewal-date risk in a prose paragraph.
- Do not recommend a generic "check in" when a specific escalation path exists.
- Do not turn source outages into customer blame.

## Routing Eval

Fixtures live in `routing-eval.jsonl` and route through the resolver phrase
`customer escalation radar`. They avoid broad phrases like "customer risk" by
using the full radar phrase in natural sentences.

## Contract

This skill guarantees a customer health table under `signals/customer/`,
grounded in customer facts, recent takes, expert routing, and activity signals.

## Output Format

Return JSON from the script with `{skill, model, operations, subagent, filing,
markdown}`. The customer table is the `markdown` field.
