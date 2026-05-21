import { describe, expect, it } from 'bun:test';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function loadScript() {
  const url = pathToFileURL(join(import.meta.dir, '..', 'skills', 'customer-escalation-radar', 'scripts', 'customer-escalation-radar.mjs')).href;
  return await import(url) as any;
}

describe('customer-escalation-radar skill script', () => {
  it('renders a risk-score table and includes find_experts', async () => {
    const { run } = await loadScript();
    const result = run({ window: '7d', segment: 'strategic', customers: [
      { customer: 'customer-a', risk_score: 85, indicators: ['ticket spike', 'renewal in 30d'], recommended_action: 'Schedule exec owner review' },
    ] });
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.operations.map((op: any) => op.op)).toContain('find_experts');
    expect(result.filing.writes_to).toBe('signals/customer/');
    expect(result.markdown).toContain('| Customer | Risk score | Indicators | Recommended action |');
    expect(result.markdown).toContain('customer-a');
  });
});
