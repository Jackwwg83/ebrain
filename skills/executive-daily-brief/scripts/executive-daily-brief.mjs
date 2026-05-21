#!/usr/bin/env bun

const MODEL = 'claude-sonnet-4-6';
const SKILL = 'executive-daily-brief';

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
  if (Array.isArray(value)) return value.filter(v => v !== undefined && v !== null).map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function businessDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

function executiveId(config) {
  const profile = config.profile && typeof config.profile === 'object' ? config.profile : {};
  return String(config.executive_id || profile.executive_id || profile.id || 'executive');
}

function metricLine(metrics) {
  if (!metrics || typeof metrics !== 'object') return 'No verified revenue metric was provided; mark revenue data gap for follow-up.';
  const parts = [];
  for (const key of ['mrr', 'arr', 'pipeline', 'churn', 'expansion']) {
    if (metrics[key] !== undefined && metrics[key] !== null && metrics[key] !== '') parts.push(`${key.toUpperCase()}: ${metrics[key]}`);
  }
  return parts.length ? parts.join('; ') : 'Revenue metrics present but no supported MRR/ARR/pipeline fields were provided.';
}

function bullets(items, fallback, limit = 5) {
  const src = asList(items).slice(0, limit);
  if (src.length === 0) return [`- ${fallback}`];
  return src.map(item => `- ${item}`);
}

export function buildOperations(input) {
  const config = asRecord(input);
  const date = businessDate(config.date);
  const id = executiveId(config);
  return [
    { op: 'get_executive_context', args: { executive_id: id } },
    { op: 'enterprise_ingest_status', args: { executive_id: id, date } },
    { op: 'recall', args: { since: `${date}T00:00:00`, entity: id, json: true } },
    { op: 'think', args: { model: MODEL, question: `Generate a cited C-level daily brief for ${id} on ${date}.` } },
  ];
}

export function renderPrompt(input) {
  const config = asRecord(input);
  const date = businessDate(config.date);
  const id = executiveId(config);
  return [
    'You are generating an enterprise C-level morning brief.',
    `Executive: ${id}`,
    `Business date: ${date}`,
    'Use only retrieved facts, takes, metric rows, and explicit data gaps.',
    'Required sections: 今日要点, 风险信号, 销售/营收态势, 跨团队焦点.',
    'Mention revenue churn, customer escalation, and team risks when evidence exists.',
    'Do not invent MRR, ARR, pipeline, NPS, customer names, or owners.',
  ].join('\n');
}

export function renderMarkdown(input) {
  const config = asRecord(input);
  const date = businessDate(config.date);
  const id = executiveId(config);
  const facts = asList(config.facts);
  const takes = asList(config.takes);
  const risks = asList(config.risks || config.risk_signals);
  const focus = asList(config.focus || config.cross_team_focus);
  const keyPoints = asList(config.key_points || config.highlights || facts).slice(0, 5);
  const safeKeyPoints = keyPoints.length >= 3 ? keyPoints : [
    ...keyPoints,
    'Review source coverage before the morning send; sparse evidence should be labeled as a data gap.',
    'Prioritize customer, revenue, and execution deltas over generic activity summaries.',
    'Use recent takes only with holder attribution preserved.',
  ].slice(0, 5);
  const lines = [];
  lines.push(`# Executive Daily Brief - ${date} - ${id}`);
  lines.push('');
  lines.push('## 今日要点');
  lines.push(...bullets(safeKeyPoints, 'No verified key point was retrieved for this date.'));
  lines.push('');
  lines.push('## 风险信号');
  lines.push(...bullets(risks, 'No material risk signal was provided; confirm conflict and anomaly scans before sending.'));
  lines.push('');
  lines.push('## 销售/营收态势');
  lines.push(`- ${metricLine(config.metrics)}`);
  lines.push('');
  lines.push('## 跨团队焦点');
  lines.push(...bullets(focus.length ? focus : takes, 'No cross-team focus was retrieved; ask owners for the top unresolved dependency.'));
  return lines.join('\n');
}

export function run(input = {}) {
  const config = asRecord(input);
  const date = businessDate(config.date);
  const id = executiveId(config);
  return {
    skill: SKILL,
    model: MODEL,
    mode: 'subagent-plan',
    operations: buildOperations(config),
    subagent: {
      handler: 'subagent',
      model: MODEL,
      prompt: renderPrompt(config),
      expected_sections: ['今日要点', '风险信号', '销售/营收态势', '跨团队焦点'],
    },
    filing: {
      writes_to: 'briefs/daily/',
      slug: `briefs/daily/${date}-${id}`,
      frontmatter: { executive_id: id, brief_date: date, generator_stage: 'I1_skill_plan', dream_generated: true },
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
