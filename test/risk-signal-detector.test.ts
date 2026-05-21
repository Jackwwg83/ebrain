import { describe, expect, it } from 'bun:test';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function loadScript() {
  const url = pathToFileURL(join(import.meta.dir, '..', 'skills', 'risk-signal-detector', 'scripts', 'risk-signal-detector.mjs')).href;
  return await import(url) as any;
}

describe('risk-signal-detector skill script', () => {
  it('sorts severity and includes enterprise conflict/anomaly ops', async () => {
    const { run } = await loadScript();
    const result = run({ window: '24h', signals: [
      { severity: 'medium', title: 'Delayed milestone', evidence: 'meeting fact', next_step: 'Ask PM for owner' },
      { severity: 'critical', title: 'Revenue churn', evidence: 'CRM and support conflict', next_step: 'Escalate to CRO' },
    ] });
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.operations.map((op: any) => op.op)).toEqual(expect.arrayContaining(['detect_enterprise_conflicts', 'find_anomalies', 'recall', 'think']));
    expect(result.filing.writes_to).toBe('signals/risk/');
    expect(result.markdown.indexOf('CRITICAL')).toBeLessThan(result.markdown.indexOf('MEDIUM'));
  });
});
