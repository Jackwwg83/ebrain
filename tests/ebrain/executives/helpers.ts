import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import type { ExecutiveProfile } from '../../../src/ebrain/types.ts';

export async function withEngine<T>(fn: (engine: PGLiteEngine) => Promise<T>): Promise<T> {
  const engine = new PGLiteEngine();
  await engine.connect({});
  try {
    await engine.initSchema();
    return await fn(engine);
  } finally {
    await engine.disconnect();
  }
}

export function fakeExecutiveProfile(overrides: Partial<ExecutiveProfile> = {}): ExecutiveProfile {
  return {
    executiveId: 'ceo',
    email: 'ceo@example.test',
    displayName: 'CEO Example',
    role: 'CEO',
    soulPath: 'executives/ceo/SOUL.md',
    agentPersonaPath: 'executives/ceo/AGENT_PERSONA.md',
    userPath: 'executives/ceo/USER.md',
    preferencesPath: 'executives/ceo/preferences.yml',
    personalSkillsRoot: 'executives/ceo/personal-skills/',
    subagentName: 'ceo',
    timezone: 'Asia/Shanghai',
    locale: 'zh-CN',
    deputies: [],
    pushPreferences: {},
    ...overrides,
  };
}
