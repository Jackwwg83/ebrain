import { describe, expect, it } from 'bun:test';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function loadScript() {
  const url = pathToFileURL(join(import.meta.dir, '..', 'skills', 'executive-daily-brief', 'scripts', 'executive-daily-brief.mjs')).href;
  return await import(url) as any;
}

describe('executive-daily-brief skill script', () => {
  it('builds a Sonnet subagent plan and required markdown sections', async () => {
    const { run } = await loadScript();
    const result = run({ executive_id: 'ceo', date: '2026-05-21', facts: ['Pipeline grew 8% [Source: CRM, 2026-05-21]'], risks: ['Renewal owner gap [Source: Support, 2026-05-21]'], metrics: { mrr: 'USD 50000 monthly' } });
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.filing.slug).toBe('briefs/daily/2026-05-21-ceo');
    expect(result.operations.map((op: any) => op.op)).toContain('recall');
    expect(result.operations.map((op: any) => op.op)).toContain('think');
    expect(result.markdown).toContain('## 今日要点');
    expect(result.markdown).toContain('## 风险信号');
    expect(result.markdown).toContain('## 销售/营收态势');
    expect(result.markdown).toContain('## 跨团队焦点');
  });
});
