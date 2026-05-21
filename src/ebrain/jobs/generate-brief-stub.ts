import type { ExecutiveProfile } from '../types.ts';

interface StubLogger {
  info?(message: string): void;
}

interface GenerateBriefStubOptions {
  logger?: StubLogger;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

/**
 * Stage E2 stub. I1 (executive-daily-brief skill) lands -> swap to the real
 * skill-backed implementation. This intentionally does not call any LLM.
 */
export function generateExecutiveBriefStub(
  profile: ExecutiveProfile,
  dateUtc: Date,
  opts: GenerateBriefStubOptions = {},
): string {
  const generatedAt = dateUtc.toISOString();
  opts.logger?.info?.(
    `[brief gen stub — awaiting I1] executive=${profile.executiveId} generated_at=${generatedAt}`,
  );

  return [
    '---',
    `executive_id: ${yamlString(profile.executiveId)}`,
    `generated_at: ${yamlString(generatedAt)}`,
    'generator_stage: E2_stub',
    'dream_generated: true',
    '---',
    '',
    `# ${profile.displayName} · Morning Brief`,
    '',
    '## 今日要点',
    '',
    '本日 brief 内容由 I1 stage skill 接管，当前为 stub 占位。',
    '',
    '## 模拟摘要（stub）',
    '',
    '- 关键企业信号：待 I1 skill 接入后由真实上下文生成。',
    '- 风险与冲突：待 I1 skill 接入后从 enterprise cycle 输出读取。',
    '- 今日建议动作：待 I1 skill 接入后按高管偏好排序。',
    '',
    '## Skipped',
    '',
    '- Real executive-daily-brief skill generation is intentionally skipped in Stage E2.',
    '',
  ].join('\n');
}
