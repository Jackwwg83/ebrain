#!/usr/bin/env bun

const MODEL = 'claude-sonnet-4-6';
const SKILL = 'customer-escalation-radar';

function asRecord(input) {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return {};
    try { return JSON.parse(trimmed); } catch { return { request: trimmed }; }
  }
  if (input && typeof input === 'object' && !Array.isArray(input)) return { ...input };
  return {};
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(v => v !== undefined && v !== null);
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function today() { return new Date().toISOString().slice(0, 10); }

function normalizeCustomer(item, index) {
  if (typeof item === 'string') {
    return { customer: item, risk_score: 50, indicators: ['provided customer mention'], recommended_action: 'Ask account owner to verify current health.' };
  }
  const rec = item && typeof item === 'object' ? item : {};
  const score = Number(rec.risk_score ?? rec.score ?? 50);
  return {
    customer: String(rec.customer || rec.name || rec.slug || `customer-${index + 1}`),
    risk_score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50,
    indicators: asList(rec.indicators || rec.signals || rec.evidence).map(String),
    recommended_action: String(rec.recommended_action || rec.action || 'Assign an owner to verify health and next step.'),
  };
}

export function scoreCustomers(customers) {
  return asList(customers)
    .map(normalizeCustomer)
    .sort((a, b) => (b.risk_score - a.risk_score) || a.customer.localeCompare(b.customer));
}

export function buildOperations(input) {
  const config = asRecord(input);
  const window = String(config.window || '7d');
  const segment = String(config.segment || 'all');
  return [
    { op: 'recall', args: { since: window, grep: `customer ${segment}`, json: true } },
    { op: 'find_experts', args: { topic: `customer escalation ${segment}`, limit: 10 } },
    { op: 'enterprise_ingest_status', args: { source_type: 'customer' } },
    { op: 'think', args: { model: MODEL, question: `Rank customer escalation risk for ${segment} over ${window}.` } },
  ];
}

export function renderPrompt(input) {
  const config = asRecord(input);
  const window = String(config.window || '7d');
  const segment = String(config.segment || 'all');
  return [
    'You are building a high-value customer escalation radar.',
    `Window: ${window}`,
    `Segment: ${segment}`,
    'Use customer facts, recent takes, activity metrics, and find_experts ownership hints.',
    'Do not invent NPS, churn probability, ticket volume, or customer names.',
    'Return a table with customer, risk score, indicators, and recommended action.',
  ].join('\n');
}

export function renderMarkdown(input) {
  const config = asRecord(input);
  const customers = scoreCustomers(config.customers || config.accounts || []);
  const window = String(config.window || '7d');
  const segment = String(config.segment || 'all');
  const lines = [];
  lines.push(`# Customer Escalation Radar - ${today()} - ${segment} - ${window}`);
  lines.push('');
  lines.push('| Customer | Risk score | Indicators | Recommended action |');
  lines.push('|---|---:|---|---|');
  if (customers.length === 0) {
    lines.push('| no-customer-data | 0 | No customer evidence provided; verify CRM/support source coverage. | Check ingestion status and rerun with customer facts. |');
  } else {
    for (const row of customers) {
      const indicators = row.indicators.length ? row.indicators.join('; ') : 'No indicators supplied; treat as data gap.';
      lines.push(`| ${row.customer} | ${row.risk_score} | ${indicators} | ${row.recommended_action} |`);
    }
  }
  lines.push('');
  lines.push('## Coverage');
  lines.push(`- Window: ${window}`);
  lines.push(`- Segment: ${segment}`);
  lines.push('- Customer names should be approved slugs or redacted labels.');
  return lines.join('\n');
}

export function run(input = {}) {
  const config = asRecord(input);
  const window = String(config.window || '7d');
  const segment = String(config.segment || 'all');
  const customers = scoreCustomers(config.customers || config.accounts || []);
  return {
    skill: SKILL,
    model: MODEL,
    mode: 'subagent-plan',
    operations: buildOperations(config),
    subagent: { handler: 'subagent', model: MODEL, prompt: renderPrompt(config), required_columns: ['Customer', 'Risk score', 'Indicators', 'Recommended action'] },
    filing: {
      writes_to: 'signals/customer/',
      slug: `signals/customer/${today()}-${segment}-${window}`,
      frontmatter: { window, segment, customer_count: customers.length, max_risk_score: customers[0]?.risk_score || 0, generated_by: SKILL },
    },
    markdown: renderMarkdown(config),
  };
}

if (import.meta.main) {
  const markdownOnly = process.argv.includes('--markdown');
  const args = process.argv.slice(2).filter(arg => arg !== '--markdown');
  const result = run(args.join(' '));
  console.log(markdownOnly ? result.markdown : JSON.stringify(result, null, 2));
}
