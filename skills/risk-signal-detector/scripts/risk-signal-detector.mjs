#!/usr/bin/env bun

const MODEL = 'claude-sonnet-4-6';
const SKILL = 'risk-signal-detector';
const RANK = { critical: 4, high: 3, medium: 2, low: 1 };

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

function normalizeSignal(item, index) {
  if (typeof item === 'string') {
    return { severity: 'medium', title: item, evidence: 'provided signal text', next_step: 'Assign an owner to verify the signal.' };
  }
  const rec = item && typeof item === 'object' ? item : {};
  const severity = String(rec.severity || rec.level || 'medium').toLowerCase();
  return {
    severity: RANK[severity] ? severity : 'medium',
    title: String(rec.title || rec.signal || rec.name || `Risk signal ${index + 1}`),
    evidence: String(rec.evidence || rec.reason || rec.summary || 'Evidence summary missing; verify source rows.'),
    next_step: String(rec.next_step || rec.action || 'Name an owner and verify against source data.'),
    owner: rec.owner ? String(rec.owner) : 'owner gap',
    confidence: rec.confidence ? String(rec.confidence) : 'medium',
  };
}

export function sortSignals(signals) {
  return asList(signals)
    .map(normalizeSignal)
    .sort((a, b) => (RANK[b.severity] - RANK[a.severity]) || a.title.localeCompare(b.title));
}

export function buildOperations(input) {
  const config = asRecord(input);
  const window = String(config.window || '24h');
  return [
    { op: 'detect_enterprise_conflicts', args: { window, executive_id: config.executive_id || null } },
    { op: 'find_anomalies', args: { window, scope: 'enterprise' } },
    { op: 'recall', args: { since: window, grep: 'risk OR churn OR escalation OR blocked', json: true } },
    { op: 'think', args: { model: MODEL, question: `Rank enterprise risk signals for ${window}.` } },
  ];
}

export function renderPrompt(input) {
  const config = asRecord(input);
  const window = String(config.window || '24h');
  return [
    'You are ranking enterprise risk signals for executive escalation.',
    `Window: ${window}`,
    `Executive scope: ${config.executive_id || 'company-wide'}`,
    'Inputs include detect_enterprise_conflicts, find_anomalies, recall facts, and recent takes.',
    'Keep conflicts, anomalies, and weak takes distinguishable.',
    'Every high or critical item needs a next action and likely owner.',
  ].join('\n');
}

export function renderMarkdown(input) {
  const config = asRecord(input);
  const window = String(config.window || '24h');
  const signals = sortSignals(config.signals || config.risks || []);
  const lines = [];
  lines.push(`# Enterprise Risk Signals - ${today()} - ${window}`);
  lines.push('');
  if (signals.length === 0) {
    lines.push('No material risk detected in the selected window. Confirm source coverage before treating this as all-clear.');
    return lines.join('\n');
  }
  for (const signal of signals) {
    lines.push(`- **${signal.severity.toUpperCase()}** ${signal.title}`);
    lines.push(`  - Evidence: ${signal.evidence}`);
    lines.push(`  - Confidence: ${signal.confidence}`);
    lines.push(`  - Owner: ${signal.owner}`);
    lines.push(`  - Next step: ${signal.next_step}`);
  }
  return lines.join('\n');
}

export function run(input = {}) {
  const config = asRecord(input);
  const window = String(config.window || '24h');
  const signals = sortSignals(config.signals || config.risks || []);
  return {
    skill: SKILL,
    model: MODEL,
    mode: 'subagent-plan',
    operations: buildOperations(config),
    subagent: { handler: 'subagent', model: MODEL, prompt: renderPrompt(config), severity_order: ['critical', 'high', 'medium', 'low'] },
    filing: {
      writes_to: 'signals/risk/',
      slug: `signals/risk/${today()}-${window}-${config.executive_id || 'company'}`,
      frontmatter: { window, executive_id: config.executive_id || null, risk_count: signals.length, max_severity: signals[0]?.severity || 'none', generated_by: SKILL },
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
